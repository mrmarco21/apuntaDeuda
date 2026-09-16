import { supabase } from '../lib/supabaseClient';

/**
 * Servicio para gestionar gastos del negocio directamente en Supabase
 * con aislamiento multi-negocio estricto (negocio_id) y validación de respuestas.
 */

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
    console.warn('[gastosService] Error obteniendo negocio activo:', err);
  }

  return null;
};

export const gastosService = {
  /**
   * Obtener todos los gastos del negocio activo desde Supabase
   */
  async getGastos(fechaInicio = null, fechaFin = null) {
    const negocioId = await obtenerNegocioActivo();
    if (!negocioId) return [];

    let query = supabase
      .from('gastos')
      .select('*')
      .eq('negocio_id', negocioId);

    if (fechaInicio) {
      query = query.gte('fecha', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha', fechaFin);
    }

    const { data, error } = await query.order('fecha', { ascending: false });

    if (error) {
      console.error('[gastosService] Error consultando gastos en Supabase:', error);
      throw new Error(`Error al consultar gastos: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Crear un nuevo gasto en Supabase
   */
  async createGasto(gastoData) {
    const negocioId = await obtenerNegocioActivo();
    if (!negocioId) {
      throw new Error('No hay un negocio activo seleccionado para registrar el gasto.');
    }

    const conceptoLimpio = (gastoData.concepto || '').trim();
    if (!conceptoLimpio) {
      throw new Error('El concepto del gasto es obligatorio.');
    }

    const montoNum = parseFloat(gastoData.monto || 0);
    if (isNaN(montoNum) || montoNum <= 0) {
      throw new Error('El monto debe ser un número mayor a cero.');
    }

    const fecha = gastoData.fecha || new Date().toISOString();

    const { data, error } = await supabase
      .from('gastos')
      .insert([
        {
          concepto: conceptoLimpio,
          monto: montoNum,
          categoria: gastoData.categoria || 'Otros',
          descripcion: (gastoData.descripcion || '').trim(),
          fecha,
          negocio_id: negocioId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[gastosService] Error insertando gasto en Supabase:', error);
      throw new Error(`No se pudo registrar el gasto en la base de datos: ${error.message}`);
    }

    if (!data) {
      throw new Error('Supabase no confirmó la inserción del gasto.');
    }

    return data;
  },

  /**
   * Actualizar un gasto existente en Supabase
   */
  async updateGasto(id, gastoData) {
    const negocioId = await obtenerNegocioActivo();
    if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');
    if (!id) throw new Error('El ID del gasto es requerido.');

    const conceptoLimpio = (gastoData.concepto || '').trim();
    if (!conceptoLimpio) throw new Error('El concepto no puede estar vacío.');

    const montoNum = parseFloat(gastoData.monto || 0);
    if (isNaN(montoNum) || montoNum <= 0) throw new Error('El monto debe ser mayor a 0.');

    const { data, error } = await supabase
      .from('gastos')
      .update({
        concepto: conceptoLimpio,
        monto: montoNum,
        categoria: gastoData.categoria || 'Otros',
        descripcion: (gastoData.descripcion || '').trim(),
        fecha: gastoData.fecha || new Date().toISOString(),
      })
      .eq('id', id)
      .eq('negocio_id', negocioId)
      .select()
      .single();

    if (error) {
      console.error('[gastosService] Error actualizando gasto en Supabase:', error);
      throw new Error(`Error al actualizar el gasto: ${error.message}`);
    }

    return data;
  },

  /**
   * Eliminar un gasto en Supabase
   */
  async deleteGasto(id) {
    const negocioId = await obtenerNegocioActivo();
    if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');

    const { error } = await supabase
      .from('gastos')
      .delete()
      .eq('id', id)
      .eq('negocio_id', negocioId);

    if (error) {
      console.error('[gastosService] Error eliminando gasto en Supabase:', error);
      throw new Error(`Error al eliminar el gasto: ${error.message}`);
    }

    return true;
  },

  /**
   * Obtener total de gastos en un periodo
   */
  async getTotalGastos(fechaInicio, fechaFin) {
    try {
      const gastos = await this.getGastos(fechaInicio, fechaFin);
      return (gastos || []).reduce((total, gasto) => total + parseFloat(gasto.monto || 0), 0);
    } catch (error) {
      console.error('[gastosService] Error calculando total de gastos:', error);
      return 0;
    }
  },

  /**
   * Obtener gastos agrupados por categoría
   */
  async getGastosPorCategoria(fechaInicio = null, fechaFin = null) {
    try {
      const gastos = await this.getGastos(fechaInicio, fechaFin);

      const agrupados = (gastos || []).reduce((acc, gasto) => {
        const categoria = gasto.categoria || 'Sin categoría';
        if (!acc[categoria]) {
          acc[categoria] = {
            categoria,
            total: 0,
            cantidad: 0,
          };
        }
        acc[categoria].total += parseFloat(gasto.monto || 0);
        acc[categoria].cantidad += 1;
        return acc;
      }, {});

      return Object.values(agrupados);
    } catch (error) {
      console.error('[gastosService] Error agrupando gastos por categoría:', error);
      return [];
    }
  },

  /**
   * Obtener gastos del mes actual
   */
  async getGastosMesActual() {
    try {
      const now = new Date();
      const primerDia = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const ultimoDia = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      return await this.getGastos(primerDia, ultimoDia);
    } catch (error) {
      console.error('[gastosService] Error al obtener gastos del mes actual:', error);
      return [];
    }
  },
};
