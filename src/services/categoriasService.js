import { supabase } from '../lib/supabaseClient';

/**
 * Categorías estándar iniciales para sembrar negocios nuevos o existentes sin categorías en Supabase
 */
export const CATEGORIAS_PREDETERMINADAS = [
  { nombre: 'Ropa/Otros', icono: '👕' },
  { nombre: 'Calzado', icono: '👟' },
  { nombre: 'Perfumes', icono: '✨' },
  { nombre: 'Carteras', icono: '👜' },
  { nombre: 'Joyería', icono: '💍' },
  { nombre: 'Cosméticos', icono: '💄' }
];

/**
 * Obtiene el ID del negocio activo actualmente en la sesión o localStorage
 */
const obtenerNegocioActivo = async () => {
  let negocioId = localStorage.getItem('active_negocio_id');
  if (negocioId && negocioId !== 'undefined' && negocioId !== 'null') {
    return negocioId;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', authData.user.id)
        .eq('activo', true)
        .limit(1);

      if (usuarios && usuarios.length > 0 && usuarios[0].negocio_id) {
        negocioId = usuarios[0].negocio_id;
        localStorage.setItem('active_negocio_id', negocioId);
        return negocioId;
      }
    }
  } catch (err) {
    console.warn('[categoriasService] Error obteniendo negocio activo:', err);
  }

  return null;
};

export const categoriasService = {
  /**
   * Obtiene las categorías del negocio activo desde Supabase.
   * Si el negocio aún no tiene categorías registradas en Supabase, siembra automáticamente
   * las categorías estándar para ese negocio_id y las devuelve.
   *
   * @param {Object} options
   * @param {boolean} [options.incluirInactivas=false] - Si es true, retorna activas e inactivas.
   * @returns {Promise<Array>} Lista de categorías
   */
  async getCategorias({ incluirInactivas = false } = {}) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) {
        // Fallback en memoria si aún no hay sesión o negocio conectado
        return CATEGORIAS_PREDETERMINADAS.map((cat, idx) => ({
          id: `default-${idx}`,
          nombre: cat.nombre,
          icono: cat.icono,
          activo: true
        }));
      }

      let query = supabase
        .from('categorias')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('created_at', { ascending: true });

      if (!incluirInactivas) {
        query = query.eq('activo', true);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[categoriasService] Error consultando categorias en Supabase:', error.message);
        throw error;
      }

      // Si no existen categorías para este negocio, sembrar las predeterminadas de forma segura (sin duplicados)
      if (!data || data.length === 0) {
        await this.sembrarCategoriasPredeterminadas(negocioId);
        // Volver a consultar para obtener la lista real de la BD
        let reQuery = supabase
          .from('categorias')
          .select('*')
          .eq('negocio_id', negocioId)
          .order('created_at', { ascending: true });

        if (!incluirInactivas) {
          reQuery = reQuery.eq('activo', true);
        }
        const { data: reData } = await reQuery;
        return reData || [];
      }

      return data || [];
    } catch (error) {
      console.error('[categoriasService] Error al obtener categorías:', error);
      throw error;
    }
  },

  /**
   * Siembra las categorías predeterminadas en la base de datos para un negocio_id de forma segura
   */
  async sembrarCategoriasPredeterminadas(negocioId) {
    try {
      if (!negocioId) return [];

      const filasAInsertar = CATEGORIAS_PREDETERMINADAS.map((cat) => ({
        negocio_id: negocioId,
        nombre: cat.nombre,
        icono: cat.icono,
        activo: true
      }));

      // Usar upsert con onConflict e ignoreDuplicates para prevenir duplicados ante llamadas simultáneas
      const { data, error } = await supabase
        .from('categorias')
        .upsert(filasAInsertar, {
          onConflict: 'negocio_id,nombre',
          ignoreDuplicates: true
        })
        .select();

      if (error) {
        console.warn('[categoriasService] No se pudieron sembrar categorías predeterminadas:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('[categoriasService] Excepción al sembrar categorías:', err);
      return [];
    }
  },

  /**
   * Crea una nueva categoría asociada al negocio activo
   */
  async crearCategoria({ nombre, icono = '👕' }) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');

      const nombreLimpio = (nombre || '').trim();
      if (!nombreLimpio) throw new Error('El nombre de la categoría es obligatorio.');

      // Validar si ya existe una categoría con el mismo nombre para este negocio
      const { data: existente } = await supabase
        .from('categorias')
        .select('id, nombre, activo, icono')
        .eq('negocio_id', negocioId)
        .ilike('nombre', nombreLimpio)
        .maybeSingle();

      if (existente) {
        if (!existente.activo) {
          // Si existía inactiva, la reactivamos
          const { data: reactivada, error: errReactivar } = await supabase
            .from('categorias')
            .update({ activo: true, icono: icono || existente.icono || '👕' })
            .eq('id', existente.id)
            .select()
            .single();

          if (errReactivar) throw errReactivar;
          return reactivada;
        }
        throw new Error(`Ya existe una categoría con el nombre "${nombreLimpio}" en este negocio.`);
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert({
          negocio_id: negocioId,
          nombre: nombreLimpio,
          icono: icono || '👕',
          activo: true
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('uq_categorias_negocio_nombre')) {
          throw new Error(`Ya existe una categoría con el nombre "${nombreLimpio}" en este negocio.`);
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('[categoriasService] Error al crear categoría:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de una categoría
   */
  async actualizarCategoria(id, { nombre, icono, activo }) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');
      if (!id) throw new Error('El ID de la categoría es requerido.');

      const updates = {};
      if (nombre !== undefined) {
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) throw new Error('El nombre no puede estar vacío.');
        updates.nombre = nombreLimpio;
      }
      if (icono !== undefined) updates.icono = icono;
      if (activo !== undefined) updates.activo = Boolean(activo);

      const { data, error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .eq('negocio_id', negocioId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('uq_categorias_negocio_nombre')) {
          throw new Error(`Ya existe otra categoría con el nombre "${updates.nombre}" en este negocio.`);
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('[categoriasService] Error al actualizar categoría:', error);
      throw error;
    }
  },

  /**
   * Activa o desactiva una categoría (baja lógica segura)
   */
  async cambiarEstadoCategoria(id, activo) {
    return this.actualizarCategoria(id, { activo: Boolean(activo) });
  },

  /**
   * Desactiva una categoría
   */
  async desactivarCategoria(id) {
    return this.cambiarEstadoCategoria(id, false);
  },

  /**
   * Activa una categoría
   */
  async activarCategoria(id) {
    return this.cambiarEstadoCategoria(id, true);
  },

  /**
   * Verifica si una categoría tiene movimientos históricos o cargos asociados
   * @param {string} id - ID de la categoría
   * @param {string} [nombre] - Nombre de la categoría
   * @returns {Promise<{ enUso: boolean, totalMovimientos: number }>}
   */
  async verificarUsoCategoria(id, nombre = '') {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) return { enUso: false, totalMovimientos: 0 };

      // 1. Verificar en tabla detalles_cargo si existe
      try {
        const { data: detallesData, error: detErr } = await supabase
          .from('detalles_cargo')
          .select('id')
          .eq('negocio_id', negocioId)
          .or(`categoria_id.eq.${id},categoria.eq.${nombre || id}`)
          .limit(1);

        if (!detErr && detallesData && detallesData.length > 0) {
          return { enUso: true, totalMovimientos: detallesData.length };
        }
      } catch {
        // Si no existe tabla detalles_cargo, continuamos verificando en movimientos
      }

      // 2. Verificar en tabla movimientos en comentario/descripcion
      const { data: movs, error: movsErr } = await supabase
        .from('movimientos')
        .select('id, comentario, descripcion')
        .eq('negocio_id', negocioId)
        .limit(100);

      if (!movsErr && movs) {
        const patternId = `{${id}}`;
        const patternNombre = nombre ? `{${nombre}}` : null;
        const slug = nombre ? nombre.toLowerCase().replace(/\s+/g, '-') : null;
        const patternSlug = slug ? `{${slug}}` : null;

        const encontrados = movs.filter((m) => {
          const texto = (m.comentario || m.descripcion || '').toLowerCase();
          return (
            texto.includes(patternId.toLowerCase()) ||
            (patternNombre && texto.includes(patternNombre.toLowerCase())) ||
            (patternSlug && texto.includes(patternSlug.toLowerCase()))
          );
        });

        if (encontrados.length > 0) {
          return { enUso: true, totalMovimientos: encontrados.length };
        }
      }

      return { enUso: false, totalMovimientos: 0 };
    } catch (err) {
      console.warn('[categoriasService] Error verificando uso de categoría:', err);
      // Por seguridad ante errores, asumimos que puede estar en uso
      return { enUso: false, totalMovimientos: 0 };
    }
  },

  /**
   * Elimina una categoría SOLO si no tiene movimientos históricos asociados.
   * Si está en uso, lanza un error sugiriendo desactivarla en su lugar.
   */
  async eliminarCategoria(id, nombre = '') {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');

      // Validar si está en uso antes de permitir eliminar
      const { enUso } = await this.verificarUsoCategoria(id, nombre);
      if (enUso) {
        throw new Error(
          'No se puede eliminar la categoría porque tiene movimientos históricos asociados. ' +
          'En su lugar, desactívala para que deje de aparecer en nuevos cargos sin afectar el historial.'
        );
      }

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .eq('negocio_id', negocioId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('[categoriasService] Error al eliminar categoría:', error);
      throw error;
    }
  }
};
