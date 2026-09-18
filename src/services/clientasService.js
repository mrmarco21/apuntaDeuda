import { supabase } from '../lib/supabaseClient';
import { cuentasService } from './cuentasService';

async function obtenerNegocioActivo() {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Usuario no autenticado');
  }

  const activeNegocioId = localStorage.getItem('active_negocio_id');

  if (activeNegocioId) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('negocio_id', activeNegocioId)
      .maybeSingle();

    if (!error && data) {
      return {
        user,
        negocioId: data.negocio_id,
        usuario: data
      };
    }
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
   */
  async getClientas() {
    const { negocioId } = await obtenerNegocioActivo();

    // 1. Obtener clientas registradas
    const { data: dbClientas, error: dbErr } = await supabase
      .from('clientas')
      .select('*')
      .eq('negocio_id', negocioId)
      .order('nombre', { ascending: true });

    let listaBase = dbClientas || [];

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
            notas: c.notas || ''
          }));
        }
      } catch (e) {
        console.warn('Fallback a RPC obtener_clientas_negocio falló:', e);
      }
    }

    if (listaBase.length === 0) {
      return [];
    }

    // 2. Calcular los saldos y cuentas exactos usando el mismo método que la vista de detalle
    const clientasCompletas = await Promise.all(
      listaBase.map(async (c) => {
        const clientaId = c.id || c.clienta_id;
        try {
          const detalle = await cuentasService.getCuentasDetalleByClientaId(clientaId);
          const totalDeuda = Number(detalle?.resumen?.totalDeuda || 0);
          const cuentas = detalle?.cuentas || [];
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
        } catch (errDetalle) {
          console.warn(`Error calculando detalle de clienta ${clientaId}:`, errDetalle);
          return {
            id: clientaId,
            nombre: c.nombre || c.clienta_nombre || 'Sin nombre',
            referencia: c.referencia || '',
            telefono: c.telefono || '',
            direccion: c.direccion || '',
            notas: c.notas || '',
            saldo: Number(c.saldo || c.deuda_total || 0),
            total_cuentas: Number(c.total_cuentas || 0),
            cuentas_activas: Number(c.cuentas_activas || 0),
            cuentas_inactivas: Number(c.cuentas_inactivas || 0),
            ultima_actividad: c.updated_at || c.created_at || null,
            activo: c.activo !== false
          };
        }
      })
    );

    return clientasCompletas;
  },

  /**
   * Obtener una clienta por ID
   */
  async getClientaById(id) {
    const { negocioId } = await obtenerNegocioActivo();

    try {
      const { data, error } = await supabase
        .from('clientas')
        .select('*')
        .eq('id', id)
        .eq('negocio_id', negocioId)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn('Consulta directa a clientas falló, intentando por RPC:', e);
    }

    // Fallback usando el RPC oficial obtener_clientas_negocio
    const clientas = await this.getClientas();
    const clienta = (clientas || []).find((c) => c.id === id || c.clienta_id === id);

    if (clienta) {
      return {
        id: clienta.id,
        nombre: clienta.nombre,
        referencia: clienta.referencia || '',
        telefono: clienta.telefono || '',
        direccion: clienta.direccion || '',
        notas: clienta.notas || '',
        saldo: clienta.saldo || 0
      };
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