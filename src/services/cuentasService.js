import { supabase } from '../lib/supabaseClient';
import { parsearFechaLocalAISO } from '../utils/helpers';
import { cacheManager } from '../lib/cacheManager';

/**
 * Servicio para gestionar cuentas y movimientos.
 *
 * Relación:
 * clientas -> cuentas -> movimientos -> detalles_cargo
 *
 * Tipos de movimiento:
 * CARGO = aumenta la deuda
 * ABONO = disminuye la deuda
 */

export const invalidarCachesOperativos = (clientaId = null, negocioId = null) => {
  const keys = ['dashboard', 'clientas', 'movimientos'];
  if (negocioId) {
    keys.push(`clientas_${negocioId}`);
    keys.push(`movimientos_${negocioId}`);
  }
  if (clientaId) {
    keys.push(`cuentas_detalle_${clientaId}`);
    keys.push(`clienta_${clientaId}`);
  }
  cacheManager.invalidate(keys);
  cacheManager.invalidatePrefix('movimientos_');
  cacheManager.invalidatePrefix('clientas_');
};

const obtenerNegocioActivo = async () => {
  let negocioId = localStorage.getItem('active_negocio_id');

  if (negocioId) {
    return negocioId;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', user.id)
        .order('created_at', { ascending: false });

      if (usuarios && usuarios.length > 0 && usuarios[0].negocio_id) {
        negocioId = usuarios[0].negocio_id;
        localStorage.setItem('active_negocio_id', negocioId);
        return negocioId;
      }
    }
  } catch (e) {
    console.warn('[cuentasService] Error obteniendo negocio activo:', e);
  }

  return negocioId || null;
};

/**
 * Inserta un movimiento de forma segura con fallback automático
 * si las columnas de auditoría aún no se han creado en Supabase.
 */
const insertarMovimientoSeguro = async (payload) => {
  const { data, error } = await supabase
    .from('movimientos')
    .insert(payload)
    .select()
    .single();

  if (!error) return { data, error: null };

  if (
    error.code === 'PGRST204' ||
    error.message?.includes('column') ||
    error.message?.includes('schema cache')
  ) {
    const payloadLimpio = { ...payload };
    delete payloadLimpio.usuario_id;
    delete payloadLimpio.user_id;
    delete payloadLimpio.creado_por;

    const { data: dataFallback, error: errFallback } = await supabase
      .from('movimientos')
      .insert(payloadLimpio)
      .select()
      .single();

    return { data: dataFallback, error: errFallback };
  }

  return { data, error };
};

/**
 * Normaliza un movimiento para que el frontend
 * trabaje siempre con la misma estructura.
 */
const normalizarMovimiento = (movimiento, clienta = null) => {
  return {
    id: movimiento.movimiento_id || movimiento.id,
    movimiento_id: movimiento.movimiento_id || movimiento.id,

    cuenta_id: movimiento.cuenta_id || null,

    clienta_id:
      movimiento.clienta_id ||
      movimiento.clienta?.id ||
      clienta?.clienta_id ||
      clienta?.id ||
      null,

    clienta_nombre:
      movimiento.clienta_nombre ||
      movimiento.clienta?.nombre ||
      clienta?.clienta_nombre ||
      clienta?.nombre ||
      'Sin nombre',

    tipo: movimiento.tipo,

    monto: Number(movimiento.monto || 0),

    comentario: movimiento.comentario || movimiento.descripcion || '',

    descripcion: movimiento.comentario || movimiento.descripcion || '',

    fecha: movimiento.fecha,

    metodo_pago: movimiento.metodo_pago || null,

    monto_efectivo: Number(movimiento.monto_efectivo || 0),

    monto_yape: Number(movimiento.monto_yape || 0),

    anulado: Boolean(movimiento.anulado),

    anulado_por: movimiento.anulado_por || null,

    fecha_anulacion: movimiento.fecha_anulacion || null,

    motivo_anulacion: movimiento.motivo_anulacion || null,

    user_id: movimiento.user_id || movimiento.usuario_id || movimiento.created_by || null,

    usuario_id: movimiento.usuario_id || movimiento.user_id || movimiento.created_by || null,

    detalles: Array.isArray(movimiento.detalles)
      ? movimiento.detalles
      : Array.isArray(movimiento.detalles_cargo)
      ? movimiento.detalles_cargo
      : []
  };
};

/**
 * Elimina duplicados utilizando el ID.
 *
 * Importante:
 * No cambia datos de Supabase.
 * Solamente evita que el mismo registro llegue
 * dos veces al frontend.
 */
const eliminarMovimientosDuplicados = (movimientos) => {
  const vistos = new Set();

  return movimientos.filter((movimiento, index) => {
    const id = movimiento?.id || movimiento?.movimiento_id;

    // Si por alguna razón un movimiento no tiene ID,
    // lo dejamos pasar para no eliminar información.
    if (!id) {
      return true;
    }

    if (vistos.has(id)) {
      return false;
    }

    vistos.add(id);
    return true;
  });
};

export const cuentasService = {

  /**
   * Obtener movimientos de una clienta.
   *
   * 1. Obtiene las cuentas de la clienta.
   * 2. Elimina cuentas repetidas.
   * 3. Obtiene movimientos de cada cuenta mediante RPC.
   * 4. Elimina movimientos repetidos.
   * 5. Ordena del más reciente al más antiguo.
   */
  async getMovimientosByClientaId(clientaId) {
    try {
      if (!clientaId) {
        throw new Error('El ID de la clienta es obligatorio');
      }

      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) {
        return [];
      }

      // Obtener las cuentas de la clienta.
      const { data: cuentas, error: cuentasError } =
        await supabase.rpc('obtener_resumen_clienta', {
          p_negocio_id: negocioId,
          p_clienta_id: clientaId
        });

      if (cuentasError) {
        throw cuentasError;
      }

      if (!cuentas || cuentas.length === 0) {
        return [];
      }

      /**
       * IMPORTANTE:
       * Si la RPC devuelve la misma cuenta más de una vez,
       * no debemos consultar sus movimientos varias veces.
       */
      const cuentasUnicas = Array.from(
        new Map(
          cuentas
            .filter((cuenta) => cuenta?.cuenta_id)
            .map((cuenta) => [cuenta.cuenta_id, cuenta])
        ).values()
      );

      const movimientosPorCuenta = await Promise.all(
        cuentasUnicas.map(async (cuenta) => {
          try {
            const { data: dbMovs, error: dbErr } = await supabase
              .from('movimientos')
              .select('*')
              .eq('cuenta_id', cuenta.cuenta_id)
              .order('fecha', { ascending: false });

            if (!dbErr && dbMovs) {
              return dbMovs.map((movimiento) =>
                normalizarMovimiento(movimiento, {
                  clienta_id: clientaId,
                  clienta_nombre: cuenta.clienta_nombre
                })
              );
            }
          } catch (e) {
            console.warn('[cuentasService] Error en consulta directa a movimientos:', e);
          }

          const { data, error } = await supabase.rpc(
            'obtener_movimientos_cuenta',
            {
              p_negocio_id: negocioId,
              p_cuenta_id: cuenta.cuenta_id
            }
          );

          if (error) {
            throw error;
          }

          return (data || []).map((movimiento) =>
            normalizarMovimiento(movimiento, {
              clienta_id: clientaId,
              clienta_nombre: cuenta.clienta_nombre
            })
          );
        })
      );

      // Unir todos los movimientos.
      const movimientos = movimientosPorCuenta.flat();

      // Protección adicional contra duplicados.
      const movimientosUnicos =
        eliminarMovimientosDuplicados(movimientos);

      // Ordenar del más reciente al más antiguo.
      return movimientosUnicos.sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );

    } catch (error) {
      console.error(
        'Error al obtener movimientos de la clienta:',
        error
      );

      throw error;
    }
  },

  /**
   * Obtener todos los movimientos del negocio con caché SWR.
   */
  async getAllMovimientos(forceRefresh = false) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) {
        return [];
      }

      const cacheKey = `movimientos_${negocioId}`;
      return cacheManager.fetchWithCache(
        cacheKey,
        async () => {
          // 1. Consulta limpia y robusta en paralelo sin relaciones anidadas propensas a 400
          try {
            const [resMovs, resCuentas, resClientas] = await Promise.all([
              supabase
                .from('movimientos')
                .select('*')
                .eq('negocio_id', negocioId)
                .order('fecha', { ascending: false }),
              supabase
                .from('cuentas')
                .select('id, numero_cuenta, clienta_id')
                .eq('negocio_id', negocioId),
              supabase
                .from('clientas')
                .select('id, nombre, referencia')
                .eq('negocio_id', negocioId)
            ]);

            if (!resMovs.error && resMovs.data) {
              const cuentasMap = new Map((resCuentas.data || []).map(c => [c.id, c]));
              const clientasMap = new Map((resClientas.data || []).map(c => [c.id, c]));

              const normalizados = resMovs.data.map((m) => {
                const cta = cuentasMap.get(m.cuenta_id);
                const clienta = cta ? clientasMap.get(cta.clienta_id) : null;

                return {
                  id: m.id,
                  movimiento_id: m.id,
                  cuenta_id: m.cuenta_id,
                  numero_cuenta: cta?.numero_cuenta || 1,
                  clienta_id: cta?.clienta_id || null,
                  clienta_nombre: clienta?.nombre || 'Clienta',
                  clienta_referencia: clienta?.referencia || '',
                  tipo: m.tipo,
                  monto: Number(m.monto || 0),
                  comentario: m.comentario || '',
                  fecha: m.fecha,
                  created_at: m.created_at,
                  anulado: Boolean(m.anulado),
                  motivo_anulacion: m.motivo_anulacion || null
                };
              });

              return eliminarMovimientosDuplicados(normalizados).sort(
                (a, b) => {
                  const diff = new Date(b.fecha) - new Date(a.fecha);
                  if (diff !== 0) return diff;
                  return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
              );
            }
          } catch (directErr) {
            console.warn('[cuentasService] Fallback a consulta por RPC:', directErr);
          }

          // 2. Fallback: Obtener clientas del negocio y sus movimientos por RPC
          const {
            data: clientas,
            error: clientasError
          } = await supabase.rpc('obtener_clientas_negocio', {
            p_negocio_id: negocioId
          });

          if (clientasError) {
            throw clientasError;
          }

          if (!clientas || clientas.length === 0) {
            return [];
          }

          const clientasUnicas = Array.from(
            new Map(
              clientas
                .filter((clienta) => clienta?.clienta_id)
                .map((clienta) => [clienta.clienta_id, clienta])
            ).values()
          );

          const movimientosPorClienta = await Promise.all(
            clientasUnicas.map(async (clienta) => {
              try {
                return await this.getMovimientosByClientaId(clienta.clienta_id);
              } catch (err) {
                console.warn(
                  `[cuentasService] Error cargando movimientos de clienta ${clienta.clienta_id}:`,
                  err
                );
                return [];
              }
            })
          );

          const todosLosMovimientos = movimientosPorClienta.flat();

          // Protección final.
          const movimientosUnicos =
            eliminarMovimientosDuplicados(
              todosLosMovimientos
            );

          return movimientosUnicos.sort(
            (a, b) => new Date(b.fecha) - new Date(a.fecha)
          );
        },
        2 * 60 * 1000,
        forceRefresh
      );
    } catch (error) {
      console.error(
        'Error al obtener todos los movimientos:',
        error
      );

      throw error;
    }
  },

  /**
   * Registrar un CARGO.
   *
   * Utiliza la función registrar_cargo de Supabase.  /**
   * Obtener todas las cuentas activas y detalladas de una clienta con sus movimientos.
   * Optimizado con consulta por lote y caché SWR en memoria.
   */
  async getCuentasDetalleByClientaId(clientaId, forceRefresh = false) {
    if (!clientaId) throw new Error('El ID de la clienta es obligatorio');

    const cacheKey = `cuentas_detalle_${clientaId}`;
    return cacheManager.fetchWithCache(
      cacheKey,
      async () => {
        const negocioId = await obtenerNegocioActivo();
        if (!negocioId) return { cuentas: [], resumen: { totalDeuda: 0, totalAbonos: 0, totalCargos: 0 } };

        // 1. Obtener cuentas de la clienta desde la base de datos
        let listaCuentas = [];
        try {
          const { data: dbCuentas, error: dbError } = await supabase
            .from('cuentas')
            .select('id, clienta_id, negocio_id, numero_cuenta, saldo, nota, created_at')
            .eq('clienta_id', clientaId)
            .eq('negocio_id', negocioId)
            .order('created_at', { ascending: true });

          if (!dbError && dbCuentas && dbCuentas.length > 0) {
            listaCuentas = dbCuentas.map((c, idx) => ({
              id: c.id,
              numeroCuenta: c.numero_cuenta || (idx + 1),
              saldo: Number(c.saldo || 0),
              nota: c.nota || null,
              estado: Number(c.saldo || 0) > 0 ? 'ACTIVA' : 'CERRADA',
              fechaCreacion: c.created_at || new Date().toISOString()
            }));
          }
        } catch (eDb) {
          console.warn('[cuentasService] Error consultando tabla cuentas:', eDb);
        }

        // Fallback a RPC obtener_resumen_clienta si la consulta directa no trajo cuentas
        if (listaCuentas.length === 0) {
          try {
            const { data: rpcCuentas, error: rpcError } = await supabase.rpc('obtener_resumen_clienta', {
              p_negocio_id: negocioId,
              p_clienta_id: clientaId
            });

            if (!rpcError && rpcCuentas && rpcCuentas.length > 0) {
              listaCuentas = rpcCuentas.map((c, idx) => ({
                id: c.cuenta_id || c.id,
                numeroCuenta: c.numero_cuenta || (idx + 1),
                saldo: Number(c.saldo || 0),
                nota: c.nota || null,
                estado: Number(c.saldo || 0) > 0 ? 'ACTIVA' : 'CERRADA',
                fechaCreacion: c.created_at || c.fecha_creacion || new Date().toISOString()
              }));
            }
          } catch (eRpc) {
            console.warn('[cuentasService] Error en RPC obtener_resumen_clienta:', eRpc);
          }
        }

        // Si no existe ninguna cuenta en la BD, devolver lista vacía
        if (listaCuentas.length === 0) {
          return {
            cuentas: [],
            cuentasCerradas: [],
            resumen: { totalDeuda: 0, totalAbonos: 0, totalCargos: 0 }
          };
        }

        // Deduplicar cuentas por ID
        const cuentasUnicas = Array.from(
          new Map(listaCuentas.filter(c => c.id).map(c => [c.id, c])).values()
        );

        // 2. Obtener movimientos de todas las cuentas en una sola consulta por lote
        const cuentaIds = cuentasUnicas.map(c => c.id).filter(Boolean);
        const movsPorCuenta = new Map();

        if (cuentaIds.length > 0) {
          try {
            const { data: dbMovs, error: dbErr } = await supabase
              .from('movimientos')
              .select('*')
              .in('cuenta_id', cuentaIds)
              .order('fecha', { ascending: false });

            if (!dbErr && dbMovs) {
              for (const m of dbMovs) {
                if (!movsPorCuenta.has(m.cuenta_id)) {
                  movsPorCuenta.set(m.cuenta_id, []);
                }
                movsPorCuenta.get(m.cuenta_id).push(normalizarMovimiento(m, { clienta_id: clientaId }));
              }
            }
          } catch (eBatch) {
            console.warn('[cuentasService] Error cargando movimientos por lote:', eBatch);
          }
        }

        let totalDeudaGlobal = 0;
        let totalAbonosGlobal = 0;
        let totalCargosGlobal = 0;

        const cuentasConMovimientos = await Promise.all(
          cuentasUnicas.map(async (cuenta, index) => {
            let movs = movsPorCuenta.get(cuenta.id) || [];

            // Fallback individual solo si el lote no trajo nada y podría haber datos por RPC
            if (movs.length === 0) {
              try {
                const { data, error } = await supabase.rpc('obtener_movimientos_cuenta', {
                  p_negocio_id: negocioId,
                  p_cuenta_id: cuenta.id
                });
                if (!error && data && data.length > 0) {
                  movs = data.map(m => normalizarMovimiento(m, { clienta_id: clientaId }));
                }
              } catch (e) {
                // ignore
              }
            }

            const movsUnicos = eliminarMovimientosDuplicados(movs).sort(
              (a, b) => new Date(b.fecha) - new Date(a.fecha)
            );

            // Calcular totales de esta cuenta
            const cargosCuenta = movsUnicos
              .filter(m => (m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta') && !m.anulado)
              .reduce((sum, m) => sum + Number(m.monto || 0), 0);

            const abonosCuenta = movsUnicos
              .filter(m => (m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago') && !m.anulado)
              .reduce((sum, m) => sum + Number(m.monto || 0), 0);

            const saldoCuenta = Math.max(0, cargosCuenta - abonosCuenta);

            // Total Abonado y Cargos del resumen global solo corresponden a cuentas activas (saldo > 0)
            if (saldoCuenta > 0) {
              totalDeudaGlobal += saldoCuenta;
              totalAbonosGlobal += abonosCuenta;
              totalCargosGlobal += cargosCuenta;
            }

            return {
              ...cuenta,
              numeroCuenta: cuenta.numeroCuenta || (index + 1),
              saldo: saldoCuenta,
              nota: cuenta.nota || null,
              totalCargos: cargosCuenta,
              totalAbonos: abonosCuenta,
              movimientos: movsUnicos
            };
          })
        );

        // Separar activas (con movimientos o saldo)
        const cuentasActivas = cuentasConMovimientos.length > 0 ? cuentasConMovimientos : [];

        return {
          cuentas: cuentasActivas,
          cuentasCerradas: [],
          resumen: {
            totalDeuda: totalDeudaGlobal,
            totalAbonos: totalAbonosGlobal,
            totalCargos: totalCargosGlobal,
            totalCuentas: cuentasConMovimientos.length
          }
        };
      },
      3 * 60 * 1000,
      forceRefresh
    );
  },

  /**
   * Abrir una nueva cuenta para una clienta.
   */
  async abrirNuevaCuenta(clientaId, nota = null) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado');
      if (!clientaId) throw new Error('El ID de la clienta es obligatorio');

      // 1. Obtener cuentas actuales de la clienta para calcular correlativo
      let nuevoNumero = 1;
      try {
        const { data: cuentasActuales } = await supabase
          .from('cuentas')
          .select('id, numero_cuenta, saldo')
          .eq('clienta_id', clientaId)
          .eq('negocio_id', negocioId);

        if (cuentasActuales && cuentasActuales.length > 0) {
          const maxNum = Math.max(...cuentasActuales.map(c => Number(c.numero_cuenta || 0)), 0);
          nuevoNumero = maxNum > 0 ? maxNum + 1 : cuentasActuales.length + 1;
        }
      } catch (eCuentas) {
        console.warn('Error calculando correlativo de cuenta:', eCuentas);
      }

      const notaLimpia = nota && typeof nota === 'string' && nota.trim() ? nota.trim() : null;

      // 2. Insertar la nueva cuenta con su numero_cuenta correlativo y nota opcional
      const { data: nuevaCuenta, error: errCrear } = await supabase
        .from('cuentas')
        .insert({
          negocio_id: negocioId,
          clienta_id: clientaId,
          numero_cuenta: nuevoNumero,
          saldo: 0,
          nota: notaLimpia
        })
        .select()
        .single();

      if (errCrear) throw errCrear;

      invalidarCachesOperativos(clientaId, negocioId);

      return {
        id: nuevaCuenta.id,
        numeroCuenta: nuevoNumero,
        saldo: 0,
        nota: nuevaCuenta.nota || null,
        estado: 'ACTIVA',
        fechaCreacion: nuevaCuenta.created_at || new Date().toISOString(),
        movimientos: []
      };
    } catch (error) {
      console.error('[cuentasService] Error al abrir nueva cuenta:', error);
      throw error;
    }
  },

  /**
   * Actualizar la nota de una cuenta existente.
   */
  async actualizarNotaCuenta(cuentaId, nota) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado');
      if (!cuentaId) throw new Error('ID de la cuenta es requerido');

      const notaLimpia = nota && typeof nota === 'string' && nota.trim() ? nota.trim() : null;

      const { data, error } = await supabase
        .from('cuentas')
        .update({ nota: notaLimpia })
        .eq('id', cuentaId)
        .eq('negocio_id', negocioId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('[cuentasService] Error al actualizar nota de cuenta:', error);
      throw error;
    }
  },

  /**
   * Registrar o Editar un CARGO completo con desglose de productos/prendas y categorías
   */
  async registrarCargoCompleto({ movimientoId = null, cuentaId, clientaId, monto, descripcion = '', fecha = null, detalles = [], nuevaCuenta = false, notaCuenta = null }) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado');

      const montoNum = Number(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        throw new Error('El monto del cargo debe ser mayor a 0');
      }

      const fechaFinal = fecha || (detalles && detalles.length > 0 && detalles[0].fecha) || null;
      const fechaISO = parsearFechaLocalAISO(fechaFinal);

      if (movimientoId) {
        // Modo Edición de Movimiento Cargo existente
        const { data: movEdit, error: errEdit } = await supabase
          .from('movimientos')
          .update({
            monto: montoNum,
            comentario: descripcion || '',
            fecha: fechaISO
          })
          .eq('id', movimientoId)
          .select()
          .single();

        if (errEdit) throw errEdit;

        // Recalcular saldo de la cuenta
        if (cuentaId) {
          const { data: todosMovs } = await supabase
            .from('movimientos')
            .select('*')
            .eq('cuenta_id', cuentaId)
            .eq('anulado', false);

          const cargos = (todosMovs || [])
            .filter(m => m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta')
            .reduce((s, m) => s + Number(m.monto || 0), 0);
          const abonos = (todosMovs || [])
            .filter(m => m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago')
            .reduce((s, m) => s + Number(m.monto || 0), 0);

          await supabase
            .from('cuentas')
            .update({ saldo: Math.max(0, cargos - abonos) })
            .eq('id', cuentaId);
        }

        return movEdit;
      }

      // Modo Creación: si es nueva cuenta, crearla ahora con su nota opcional
      let targetCuentaId = cuentaId;
      if (nuevaCuenta || !targetCuentaId) {
        const cuentaNueva = await this.abrirNuevaCuenta(clientaId, notaCuenta);
        targetCuentaId = cuentaNueva.id;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      // Inserción segura en tabla movimientos
      const { data: mov, error: errMov } = await insertarMovimientoSeguro({
        negocio_id: negocioId,
        cuenta_id: targetCuentaId,
        tipo: 'CARGO',
        monto: montoNum,
        comentario: descripcion || '',
        fecha: fechaISO,
        anulado: false,
        usuario_id: currentUser?.id || null
      });

      if (errMov) throw errMov;

      // Actualizar saldo de la cuenta
      try {
        const { data: cData } = await supabase.from('cuentas').select('saldo').eq('id', targetCuentaId).single();
        const saldoActual = Number(cData?.saldo || 0);
        await supabase
          .from('cuentas')
          .update({ saldo: saldoActual + montoNum })
          .eq('id', targetCuentaId);
      } catch (eUpd) {
        console.warn('Error actualizando saldo en cuentas:', eUpd);
      }

      invalidarCachesOperativos(clientaId, negocioId);

      return mov;
    } catch (error) {
      console.error('[cuentasService] Error al registrar cargo completo:', error);
      throw error;
    }
  },

  /**
   * Registrar o Editar un ABONO con métodos de pago (Efectivo, Yape, Mixto)
   */
  async registrarAbonoCompleto({
    movimientoId = null,
    cuentaId,
    clientaId,
    monto,
    descripcion = '',
    fecha = null,
    metodoPago = 'EFECTIVO',
    montoEfectivo = 0,
    montoYape = 0
  }) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado');

      const montoNum = Number(monto);
      if (isNaN(montoNum) || montoNum <= 0) {
        throw new Error('El monto del abono debe ser mayor a 0');
      }

      const fechaISO = parsearFechaLocalAISO(fecha);

      // Normalizar método de pago en mayúsculas y ajustar montos según la restricción de BD
      const metodoPagoUpper = String(metodoPago || 'EFECTIVO').trim().toUpperCase();
      let montoEf = Number(montoEfectivo || 0);
      let montoYp = Number(montoYape || 0);

      if (metodoPagoUpper === 'EFECTIVO') {
        montoEf = montoNum;
        montoYp = 0;
      } else if (metodoPagoUpper === 'YAPE' || metodoPagoUpper === 'PLIN') {
        montoYp = montoNum;
        montoEf = 0;
      } else if (metodoPagoUpper === 'MIXTO') {
        if (Math.abs(montoEf + montoYp - montoNum) > 0.01) {
          montoYp = Number((montoNum - montoEf).toFixed(2));
        }
      } else {
        montoEf = montoNum;
        montoYp = 0;
      }

      if (movimientoId) {
        // Modo Edición de Abono existente
        const { data: movEdit, error: errEdit } = await supabase
          .from('movimientos')
          .update({
            monto: montoNum,
            comentario: descripcion ? descripcion.trim() : '',
            metodo_pago: metodoPagoUpper,
            monto_efectivo: montoEf,
            monto_yape: montoYp,
            fecha: fechaISO
          })
          .eq('id', movimientoId)
          .select()
          .single();

        if (errEdit) throw errEdit;

        // Recalcular saldo de la cuenta
        if (cuentaId) {
          const { data: todosMovs } = await supabase
            .from('movimientos')
            .select('*')
            .eq('cuenta_id', cuentaId)
            .eq('anulado', false);

          const cargos = (todosMovs || [])
            .filter(m => m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta')
            .reduce((s, m) => s + Number(m.monto || 0), 0);
          const abonos = (todosMovs || [])
            .filter(m => m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago')
            .reduce((s, m) => s + Number(m.monto || 0), 0);

          await supabase
            .from('cuentas')
            .update({ saldo: Math.max(0, cargos - abonos) })
            .eq('id', cuentaId);
        }

        invalidarCachesOperativos(clientaId, negocioId);

        return movEdit;
      }

      let targetCuentaId = cuentaId;
      if (!targetCuentaId) {
        const cuenta = await this.obtenerOCrearCuenta(clientaId);
        targetCuentaId = cuenta.id;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const { data: mov, error: errMov } = await insertarMovimientoSeguro({
        negocio_id: negocioId,
        cuenta_id: targetCuentaId,
        tipo: 'ABONO',
        monto: montoNum,
        comentario: descripcion ? descripcion.trim() : '',
        metodo_pago: metodoPagoUpper,
        monto_efectivo: montoEf,
        monto_yape: montoYp,
        fecha: fechaISO,
        anulado: false,
        usuario_id: currentUser?.id || null
      });

      if (errMov) throw errMov;

      // Actualizar saldo de la cuenta
      try {
        const { data: cData } = await supabase.from('cuentas').select('saldo').eq('id', targetCuentaId).single();
        const saldoActual = Number(cData?.saldo || 0);
        const nuevoSaldo = Math.max(0, saldoActual - montoNum);

        await supabase
          .from('cuentas')
          .update({ saldo: nuevoSaldo })
          .eq('id', targetCuentaId);
      } catch (eUpd) {
        console.warn('Error actualizando saldo en cuentas:', eUpd);
      }

      invalidarCachesOperativos(clientaId, negocioId);

      return mov;
    } catch (error) {
      console.error('[cuentasService] Error al registrar abono completo:', error);
      throw error;
    }
  },

  /**
   * Anular / Eliminar un movimiento y recalcular el saldo
   */
  async anularMovimiento(movimientoId, cuentaId, motivo = 'Eliminado por usuario') {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: mov, error: errGet } = await supabase
        .from('movimientos')
        .select('*')
        .eq('id', movimientoId)
        .single();

      if (errGet || !mov) throw new Error('Movimiento no encontrado');

      // Marcar como anulado con registro de usuario y motivo
      let { error: errUpdate } = await supabase
        .from('movimientos')
        .update({
          anulado: true,
          anulado_por: user?.id || null,
          motivo_anulacion: motivo,
          fecha_anulacion: new Date().toISOString()
        })
        .eq('id', movimientoId);

      if (
        errUpdate &&
        (errUpdate.code === 'PGRST204' ||
          errUpdate.message?.includes('anulado_por') ||
          errUpdate.message?.includes('schema cache'))
      ) {
        const fallbackRes = await supabase
          .from('movimientos')
          .update({
            anulado: true,
            motivo_anulacion: motivo,
            fecha_anulacion: new Date().toISOString()
          })
          .eq('id', movimientoId);
        errUpdate = fallbackRes.error;
      }

      if (errUpdate) throw errUpdate;

      // Recalcular saldo de la cuenta
      const targetCuentaId = cuentaId || mov.cuenta_id;
      if (targetCuentaId) {
        try {
          const { data: todosMovs } = await supabase
            .from('movimientos')
            .select('*')
            .eq('cuenta_id', targetCuentaId)
            .eq('anulado', false);

          const cargos = (todosMovs || [])
            .filter(m => m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta')
            .reduce((s, m) => s + Number(m.monto || 0), 0);
          const abonos = (todosMovs || [])
            .filter(m => m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago')
            .reduce((s, m) => s + Number(m.monto || 0), 0);

          const nuevoSaldo = Math.max(0, cargos - abonos);
          await supabase
            .from('cuentas')
            .update({ saldo: nuevoSaldo })
            .eq('id', targetCuentaId);

          // Obtener clienta_id de la cuenta para invalidar su detalle específico
          try {
            const { data: ctaData } = await supabase
              .from('cuentas')
              .select('clienta_id, negocio_id')
              .eq('id', targetCuentaId)
              .single();
            if (ctaData) {
              invalidarCachesOperativos(ctaData.clienta_id, ctaData.negocio_id);
            } else {
              invalidarCachesOperativos();
            }
          } catch (_) {
            invalidarCachesOperativos();
          }
        } catch (eRecalc) {
          console.warn('Error recalculando saldo en cuentas:', eRecalc);
          invalidarCachesOperativos();
        }
      } else {
        invalidarCachesOperativos();
      }

      return true;
    } catch (error) {
      console.error('[cuentasService] Error al anular movimiento:', error);
      throw error;
    }
  },

  /**
   * Obtener o crear una cuenta activa para la clienta.
   */
  async obtenerOCrearCuenta(clientaId) {
    const negocioId = await obtenerNegocioActivo();
    
    // 1. Buscar cuenta existente activa
    try {
      const { data: cuentas, error: errCuentas } = await supabase
        .from('cuentas')
        .select('*')
        .eq('clienta_id', clientaId)
        .eq('negocio_id', negocioId)
        .order('created_at', { ascending: false });

      if (!errCuentas && cuentas && cuentas.length > 0) {
        return cuentas[0];
      }
    } catch (e) {
      console.warn('Error buscando cuentas existentes:', e);
    }

    // 2. Crear nueva cuenta si no existe
    const { data: nuevaCuenta, error: errCrear } = await supabase
      .from('cuentas')
      .insert({
        clienta_id: clientaId,
        negocio_id: negocioId,
        numero_cuenta: 1,
        saldo: 0
      })
      .select()
      .single();

    if (errCrear) throw errCrear;
    return nuevaCuenta;
  },

  /**
   * Registrar una Venta / Cargo para una clienta
   */
  async registrarVenta(clientaId, monto, descripcion = '', fecha = null, cuentaId = null) {
    return this.registrarCargoCompleto({
      clientaId,
      cuentaId,
      monto,
      descripcion,
      fecha
    });
  },

  /**
   * Registrar un Pago / Abono para una clienta
   */
  async registrarPago(clientaId, monto, descripcion = '', fecha = null, cuentaId = null, metodoPago = 'efectivo', montoEfectivo = 0, montoYape = 0) {
    return this.registrarAbonoCompleto({
      clientaId,
      cuentaId,
      monto,
      descripcion,
      fecha,
      metodoPago,
      montoEfectivo,
      montoYape
    });
  },

  /**
   * Obtener resumen de movimientos de una clienta.
   */
  async getResumenCuenta(clientaId, movimientosExistentes = null) {
    try {
      const movimientos = movimientosExistentes || await this.getMovimientosByClientaId(clientaId);

      const cargos = movimientos
        .filter(
          (m) =>
            (m.tipo === 'CARGO' || m.tipo === 'cargo' || m.tipo === 'venta') &&
            !m.anulado
        )
        .reduce(
          (sum, m) =>
            sum + Number(m.monto || 0),
          0
        );

      const abonos = movimientos
        .filter(
          (m) =>
            (m.tipo === 'ABONO' || m.tipo === 'abono' || m.tipo === 'pago') &&
            !m.anulado
        )
        .reduce(
          (sum, m) =>
            sum + Number(m.monto || 0),
          0
        );

      const saldo = Math.max(
        0,
        cargos - abonos
      );

      return {
        totalVentas: cargos,
        totalPagos: abonos,
        saldoPendiente: saldo,
        cantidadMovimientos:
          movimientos.length,
        ultimoMovimiento:
          movimientos[0] || null
      };

    } catch (error) {
      console.error(
        'Error al obtener resumen de cuenta:',
        error
      );

      return {
        totalVentas: 0,
        totalPagos: 0,
        saldoPendiente: 0,
        cantidadMovimientos: 0,
        ultimoMovimiento: null
      };
    }
  },

  getMovimientosByClienta(clientaId) {
    return this.getMovimientosByClientaId(clientaId);
  },

  getResumenClienta(clientaId) {
    return this.getResumenCuenta(clientaId);
  }
};