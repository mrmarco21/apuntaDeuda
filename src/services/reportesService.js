import { supabase } from '../lib/supabaseClient';
import { clientasService } from './clientasService';
import { cuentasService } from './cuentasService';
import { gastosService } from './gastosService';
import { obtenerFechaInput } from '../utils/helpers';

/**
 * Servicio para generar reportes y estadísticas
 */
export const reportesService = {
  /**
   * Obtener resumen general del negocio
   */
  async getResumenGeneral() {
    try {
      // Obtener datos en paralelo
      const [clientas, gastosMes] = await Promise.all([
        clientasService.getClientas().catch((err) => {
          console.error('Error al obtener clientas en getResumenGeneral:', err);
          return [];
        }),
        gastosService.getGastosMesActual().catch((err) => {
          console.warn('Error al obtener gastos en getResumenGeneral:', err);
          return [];
        }),
      ]);

      const listaClientas = clientas || [];
      const listaGastos = gastosMes || [];

      // Calcular totales
      const totalClientas = listaClientas.length;
      const clientasConDeuda = listaClientas.filter(
        (c) => Number(c.saldo || 0) > 0
      ).length;
      const totalDeudas = listaClientas.reduce(
        (sum, c) => sum + parseFloat(c.saldo || 0),
        0
      );
      const totalGastosMes = listaGastos.reduce(
        (sum, g) => sum + parseFloat(g.monto || 0),
        0
      );

      return {
        totalClientas,
        clientasConDeuda,
        totalDeudas,
        totalGastosMes,
        clientasAlDia: totalClientas - clientasConDeuda,
      };
    } catch (error) {
      console.error('Error al obtener resumen general:', error);
      throw error;
    }
  },

  /**
   * Obtener movimientos recientes (últimos 7 días)
   */
  async getMovimientosRecientes(limite = 20) {
    try {
      const movimientos = await cuentasService.getAllMovimientos().catch((err) => {
        console.warn('Error al obtener movimientos en getMovimientosRecientes:', err);
        return [];
      });
      if (!movimientos || movimientos.length === 0) return [];

      const noAnulados = movimientos.filter((m) => !m.anulado);
      return noAnulados.slice(0, limite);
    } catch (error) {
      console.warn('Error al obtener movimientos recientes:', error);
      return [];
    }
  },

  /**
   * Obtener estadísticas de ventas por periodo
   */
  async getEstadisticasVentas(fechaInicio, fechaFin) {
    try {
      const movimientos = await cuentasService.getAllMovimientos();
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      const ventas = (movimientos || []).filter((m) => {
        if (m.anulado) return false;
        const esVenta =
          m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta';
        if (!esVenta) return false;
        const f = new Date(m.fecha);
        return f >= inicio && f <= fin;
      });

      const totalVentas = ventas.reduce(
        (sum, v) => sum + parseFloat(v.monto || 0),
        0
      );
      const cantidadVentas = ventas.length;
      const promedioVenta = cantidadVentas > 0 ? totalVentas / cantidadVentas : 0;

      return {
        totalVentas,
        cantidadVentas,
        promedioVenta,
        ventas
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de ventas:', error);
      throw error;
    }
  },

  /**
   * Obtener estadísticas de pagos por periodo
   */
  async getEstadisticasPagos(fechaInicio, fechaFin) {
    try {
      const movimientos = await cuentasService.getAllMovimientos();
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      const pagos = (movimientos || []).filter((m) => {
        if (m.anulado) return false;
        const esPago =
          m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago';
        if (!esPago) return false;
        const f = new Date(m.fecha);
        return f >= inicio && f <= fin;
      });

      const totalPagos = pagos.reduce(
        (sum, p) => sum + parseFloat(p.monto || 0),
        0
      );
      const cantidadPagos = pagos.length;

      return {
        totalPagos,
        cantidadPagos,
        pagos
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de pagos:', error);
      throw error;
    }
  },

  /**
   * Obtener reporte mensual completo
   */
  async getReporteMensual(anio, mes) {
    try {
      const fechaInicio = new Date(anio, mes - 1, 1).toISOString();
      const fechaFin = new Date(anio, mes, 0, 23, 59, 59).toISOString();

      const [ventas, pagos, gastos] = await Promise.all([
        this.getEstadisticasVentas(fechaInicio, fechaFin),
        this.getEstadisticasPagos(fechaInicio, fechaFin),
        gastosService.getGastos(fechaInicio, fechaFin)
      ]);

      const totalGastos = gastos.reduce((sum, g) => sum + parseFloat(g.monto), 0);
      const ingresoNeto = ventas.totalVentas + pagos.totalPagos - totalGastos;

      return {
        periodo: {
          mes,
          anio,
          fechaInicio,
          fechaFin
        },
        ventas,
        pagos,
        gastos: {
          totalGastos,
          cantidadGastos: gastos.length,
          gastos
        },
        resumen: {
          totalIngresos: ventas.totalVentas + pagos.totalPagos,
          totalGastos,
          ingresoNeto
        }
      };
    } catch (error) {
      console.error('Error al obtener reporte mensual:', error);
      throw error;
    }
  },

  /**
   * Obtener top clientas con más deuda
   */
  async getTopClientasDeuda(limite = 10) {
    try {
      const clientas = await clientasService.getClientas();
      const conDeuda = clientas.filter((c) => c.saldo > 0);
      conDeuda.sort((a, b) => b.saldo - a.saldo);
      return conDeuda.slice(0, limite);
    } catch (error) {
      console.error('Error al obtener top clientas:', error);
      throw error;
    }
  },

  /**
   * Obtener movimientos diarios para un rango de fechas
   */
  async getMovimientosDiarios(fechaInicio, fechaFin) {
    try {
      const movimientos = await cuentasService.getAllMovimientos();
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      const filtrados = (movimientos || []).filter((m) => {
        if (m.anulado) return false;
        const f = new Date(m.fecha);
        return f >= inicio && f <= fin;
      });

      // Agrupar por fecha
      const movimientosPorDia = {};

      filtrados.forEach((mov) => {
        const fecha = obtenerFechaInput(mov.fecha);
        if (!movimientosPorDia[fecha]) {
          movimientosPorDia[fecha] = {
            fecha,
            ventas: [],
            pagos: [],
            totalVentas: 0,
            totalPagos: 0
          };
        }

        const esVenta =
          mov.tipo === 'CARGO' || mov.tipo === 'cargo' || mov.tipo === 'venta';
        if (esVenta) {
          movimientosPorDia[fecha].ventas.push(mov);
          movimientosPorDia[fecha].totalVentas += parseFloat(mov.monto || 0);
        } else {
          movimientosPorDia[fecha].pagos.push(mov);
          movimientosPorDia[fecha].totalPagos += parseFloat(mov.monto || 0);
        }
      });

      return Object.values(movimientosPorDia);
    } catch (error) {
      console.error('Error al obtener movimientos diarios:', error);
      throw error;
    }
  }
};
