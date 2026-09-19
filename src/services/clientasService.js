import { supabase } from '../lib/supabaseClient';
import { cuentasService } from './cuentasService';
import { cacheManager } from '../lib/cacheManager';

async function obtenerNegocioActivo() {
  const activeNegocioId = localStorage.getItem('active_negocio_id');
  if (activeNegocioId) {
    return {
      negocioId: activeNegocioId,
      usuario: null
    };
  }

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuario no autenticado');
  }

  const { data: usuarios, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!usuarios || usuarios.length === 0) {
    throw new Error('El usuario no pertenece a ningún negocio');
  }

  const usuario = usuarios[0];
  localStorage.setItem('active_negocio_id', usuario.negocio_id);

  return {
    user,
    negocioId: usuario.negocio_id,
    usuario
  };
}

export const clientasService = {
  /**
   * Obtener todas las clientas del negocio activo con su deuda y cuentas calculadas en tiempo real.
   * Optimizado con consulta por lote y caché SWR en memoria (reducción de 400+ consultas a sólo 2).
   */
  async getClientas(forceRefresh = false) {
    const { negocioId } = await obtenerNegocioActivo();
    const cacheKey = `clientas_${negocioId}`;

    return cacheManager.fetchWithCache(
      cacheKey,
      async () => {
        // 1. Ejecutar en paralelo la consulta de clientas y todas las cuentas del negocio
        const [resClientas, resCuentas] = await Promise.all([
          supabase
            .from('clientas')
            .select('*')
            .eq('negocio_id', negocioId)
            .order('nombre', { ascending: true }),
          supabase
            .from('cuentas')
            .select('id, clienta_id, saldo, created_at')
            .eq('negocio_id', negocioId)
        ]);

        let listaBase = resClientas.data || [];

        // Fallback por si la tabla clientas estuviese vacía pero hubiese datos vía RPC
        if (listaBase.length === 0) {
          try {
            const { data: rpcData } = await supabase.rpc('obtener_clientas_negocio', {
              p_negocio_id: negocioId
            });
            if (rpcData && rpcData.length > 0) {
              listaBase = rpcData.map(c => ({
                id: c.clienta_id || c.id,
                nombre: c.clienta_nombre || c.nombre,
                referencia: c.referencia || '',
                telefono: c.telefono || '',
                direccion: c.direccion || '',
                notas: c.notas || '',
                activo: c.activo !== false
              }));
            }
          } catch (e) {
            console.warn('Fallback a RPC obtener_clientas_negocio falló:', e);
          }
        }

        if (listaBase.length === 0) {
          return [];
        }

        // 2. Agrupar cuentas en memoria por clienta_id (O(1) lookup en JS)
        const cuentasPorClienta = new Map();
        const dbCuentas = resCuentas.data || [];
        for (const cta of dbCuentas) {
          if (!cuentasPorClienta.has(cta.clienta_id)) {
            cuentasPorClienta.set(cta.clienta_id, []);
          }
          cuentasPorClienta.get(cta.clienta_id).push(cta);
        }

        // 3. Mapear cada clienta con su saldo y cuentas sin ninguna consulta adicional
        const clientasCompletas = listaBase.map((c) => {
          const clientaId = c.id || c.clienta_id;
          const cuentas = cuentasPorClienta.get(clientaId) || [];
          const totalDeuda = cuentas.reduce((sum, cta) => sum + Number(cta.saldo || 0), 0);
          const activas = cuentas.filter(cta => Number(cta.saldo || 0) > 0).length;
          const inactivas = cuentas.filter(cta => Number(cta.saldo || 0) === 0).length;

          return {
            id: clientaId,
            nombre: c.nombre || c.clienta_nombre || 'Sin nombre',
            referencia: c.referencia || '',
            telefono: c.telefono || '',
            direccion: c.direccion || '',
            notas: c.notas || '',
            saldo: totalDeuda,
            total_cuentas: cuentas.length,
            cuentas_activas: activas,
            cuentas_inactivas: inactivas,
            ultima_actividad: c.updated_at || c.created_at || null,
            activo: c.activo !== false
          };
        });

        // Pre-poblar caché individual para acceso instantáneo
        for (const c of clientasCompletas) {
          if (c.id) {
            cacheManager.set(`clienta_${c.id}`, c, 3 * 60 * 1000);
          }
        }

        return clientasCompletas;
      },
      3 * 60 * 1000,
      forceRefresh
    );
  },

  /**
   * Obtener una clienta por ID con caché SWR y búsqueda en memoria
   */
  async getClientaById(id, forceRefresh = false) {
    if (!id) return null;

    // 1. Revisar caché individual inmediato
    if (!forceRefresh) {
      const cached = cacheManager.getRawData(`clienta_${id}`);
      if (cached) {
        return cached;
      }
    }

    // 2. Revisar lista de clientas en memoria del negocio activo
    const activeNegocioId = localStorage.getItem('active_negocio_id');
    if (activeNegocioId) {
      const listaMem = cacheManager.getRawData(`clientas_${activeNegocioId}`);
      if (Array.isArray(listaMem)) {
        const found = listaMem.find((c) => c.id === id || c.clienta_id === id);
        if (found) {
          cacheManager.set(`clienta_${id}`, found, 3 * 60 * 1000);
          return found;
        }
      }
    }

    // 3. Consulta directa a tabla clientas
    try {
      let query = supabase.from('clientas').select('*').eq('id', id);
      if (activeNegocioId) {
        query = query.eq('negocio_id', activeNegocioId);
      }
      let { data, error } = await query.maybeSingle();

      // Si no devolvió datos y filtramos con negocio_id, reintentar sólo por ID (RLS filtra automáticamente)
      if (!data && activeNegocioId) {
        const fallbackSinNegocio = await supabase
          .from('clientas')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (fallbackSinNegocio.data) {
          data = fallbackSinNegocio.data;
        }
      }

      if (data) {
        cacheManager.set(`clienta_${id}`, data, 3 * 60 * 1000);
        return data;
      }
    } catch (e) {
      console.warn('Consulta directa a clientas falló, intentando por lista/RPC:', e);
    }

    // 4. Fallback usando getClientas()
    try {
      const clientas = await this.getClientas(forceRefresh);
      const clienta = (clientas || []).find((c) => c.id === id || c.clienta_id === id);

      if (clienta) {
        const resultado = {
          ...clienta,
          id: clienta.id || clienta.clienta_id,
          nombre: clienta.nombre || clienta.clienta_nombre || 'Sin nombre',
          referencia: clienta.referencia || '',
          telefono: clienta.telefono || '',
          direccion: clienta.direccion || '',
          notas: clienta.notas || '',
          saldo: Number(clienta.saldo || 0)
        };
        cacheManager.set(`clienta_${id}`, resultado, 3 * 60 * 1000);
        return resultado;
      }
    } catch (err) {
      console.error('Error en fallback getClientas para clienta:', err);
    }

    return null;
  },

  async getById(id) {
    return this.getClientaById(id);
  },

  async getAll() {
    return this.getClientas();
  },

  /**
   * Crear una nueva clienta
   */
  async createClienta(clientaData) {
    const { negocioId } = await obtenerNegocioActivo();

    const nuevaClienta = {
      negocio_id: negocioId,
      nombre: clientaData.nombre.trim(),
      telefono: clientaData.telefono ? clientaData.telefono.trim() : null,
      direccion: clientaData.direccion ? clientaData.direccion.trim() : null,
      referencia: clientaData.referencia ? clientaData.referencia.trim() : null,
      notas: clientaData.notas ? clientaData.notas.trim() : null,
      fecha_registro: new Date().toISOString(),
      activo: true
    };

    const { data, error } = await supabase
      .from('clientas')
      .insert(nuevaClienta)
      .select()
      .single();

    if (error) {
      console.error('Error al crear clienta:', error);
      throw error;
    }

    // Invalidar caché
    cacheManager.invalidate([`clientas_${negocioId}`, 'clientas', 'dashboard']);

    return data;
  },

  /**
   * Actualizar una clienta
   */
  async updateClienta(id, clientaData) {
    const { negocioId } = await obtenerNegocioActivo();

    const datosActualizar = {
      nombre: clientaData.nombre.trim(),
      telefono: clientaData.telefono ? clientaData.telefono.trim() : null,
      direccion: clientaData.direccion ? clientaData.direccion.trim() : null,
      referencia: clientaData.referencia ? clientaData.referencia.trim() : null,
      notas: clientaData.notas ? clientaData.notas.trim() : null
    };

    const { data, error } = await supabase
      .from('clientas')
      .update(datosActualizar)
      .eq('id', id)
      .eq('negocio_id', negocioId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar clienta:', error);
      throw error;
    }

    // Invalidar caché
    cacheManager.invalidate([`clientas_${negocioId}`, 'clientas', `clienta_${id}`, 'dashboard']);

    return data;
  },

  /**
   * Eliminar una clienta
   */
  async deleteClienta(id) {
    const { negocioId } = await obtenerNegocioActivo();

    const { error } = await supabase
      .from('clientas')
      .delete()
      .eq('id', id)
      .eq('negocio_id', negocioId);

    if (error) {
      console.error('Error al eliminar clienta:', error);
      throw error;
    }

    // Invalidar caché
    cacheManager.invalidate([`clientas_${negocioId}`, 'clientas', `clienta_${id}`, `cuentas_detalle_${id}`, 'dashboard']);

    return true;
  },

  /**
   * Activar / Desactivar clienta
   */
  async setActivoClienta(id, activo) {
    const { negocioId } = await obtenerNegocioActivo();

    const { data, error } = await supabase
      .from('clientas')
      .update({ activo })
      .eq('id', id)
      .eq('negocio_id', negocioId)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar estado activo de clienta:', error);
      throw error;
    }

    // Invalidar caché
    cacheManager.invalidate([`clientas_${negocioId}`, 'clientas', `clienta_${id}`, 'dashboard']);

    return data;
  },

  /**
   * Buscar clientas
   */
  async searchClientas(searchTerm) {
    const { negocioId } = await obtenerNegocioActivo();
    const termino = searchTerm?.trim() || '';

    if (!termino) {
      return this.getClientas();
    }

    const { data, error } = await supabase
      .from('clientas')
      .select('*')
      .eq('negocio_id', negocioId)
      .eq('activo', true)
      .or(
        `nombre.ilike.%${termino}%,telefono.ilike.%${termino}%`
      )
      .order('nombre', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Obtener clientas con deuda.
   */
  async getClientasConDeuda() {
    const clientas = await this.getClientas();
    return (clientas || []).filter((clienta) => Number(clienta.saldo || 0) > 0);
  }
};