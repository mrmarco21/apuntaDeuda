import { supabase } from '../lib/supabaseClient';
import { parsearPrendas } from '../utils/helpers';
import { CATEGORIAS_PREDETERMINADAS } from './categoriasService';

/**
 * Servicio para generar y restaurar copias de seguridad completas (Backup)
 * consultando directamente los datos reales del negocio en Supabase y
 * permitiendo importar tanto backups nativos de la Web (v1.2) como
 * copias exportadas desde el APK de Android (v1.0).
 */

/**
 * Consulta todos los registros de una tabla filtrando por negocio_id,
 * manejando paginación automática para no truncar si hay más de 1000 filas.
 */
async function fetchAllByNegocio(tabla, negocioId) {
  const PAGE_SIZE = 1000;
  let allRecords = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .eq('negocio_id', negocioId)
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(
        `Error al consultar la tabla "${tabla}" en Supabase: ${error.message} (Código: ${error.code || 'N/A'})`
      );
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allRecords = allRecords.concat(data);
      if (data.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        from += PAGE_SIZE;
      }
    }
  }

  return allRecords;
}

/**
 * Divide un array en lotes más pequeños para inserciones masivas seguras en Supabase.
 */
function chunkArray(array, size = 50) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export const backupService = {
  /**
   * Genera el backup completo con los datos reales del negocio autenticado.
   */
  async generarBackupCompleto() {
    // 1. Obtener usuario autenticado en la sesión de Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw new Error('No hay una sesión activa de usuario en Supabase. Por favor, inicia sesión de nuevo.');
    }
    const authUser = authData.user;

    // 2. Obtener el registro del usuario en la tabla 'usuarios' priorizando el negocio activo
    const activeNegocioId = localStorage.getItem('active_negocio_id');
    let usuarioRecord = null;

    if (activeNegocioId) {
      const { data: usuarioNegocio, error: errNegocio } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .eq('negocio_id', activeNegocioId)
        .maybeSingle();

      if (!errNegocio && usuarioNegocio) {
        usuarioRecord = usuarioNegocio;
      }
    }

    if (!usuarioRecord) {
      const { data: usuariosList, error: usuarioError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (usuarioError || !usuariosList || usuariosList.length === 0) {
        throw new Error(
          `Error al obtener los datos del usuario en Supabase: ${
            usuarioError?.message || 'No se encontró el registro en la tabla "usuarios"'
          }`
        );
      }
      usuarioRecord = usuariosList[0];
    }

    const negocioId = usuarioRecord.negocio_id;
    if (!negocioId) {
      throw new Error('El usuario autenticado no tiene un "negocio_id" asignado en la base de datos.');
    }

    // 3. Obtener el registro del negocio en la tabla 'negocios'
    const { data: negocioRecord, error: negocioError } = await supabase
      .from('negocios')
      .select('*')
      .eq('id', negocioId)
      .single();

    if (negocioError || !negocioRecord) {
      throw new Error(
        `Error al obtener los datos del negocio en Supabase: ${
          negocioError?.message || 'No se encontró el registro en la tabla "negocios"'
        }`
      );
    }

    // 4. Obtener las tablas principales requeridas en paralelo
    const [
      categorias,
      clientas,
      cuentas,
      movimientos,
      detallesCargo
    ] = await Promise.all([
      fetchAllByNegocio('categorias', negocioId),
      fetchAllByNegocio('clientas', negocioId),
      fetchAllByNegocio('cuentas', negocioId),
      fetchAllByNegocio('movimientos', negocioId),
      fetchAllByNegocio('detalles_cargo', negocioId).catch(() => [])
    ]);

    // 5. Consultar gastos
    let gastos = [];
    try {
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select('*')
        .eq('negocio_id', negocioId);

      if (!gastosError && gastosData) {
        gastos = gastosData;
      } else {
        gastos = movimientos.filter((m) => m.tipo === 'gasto');
      }
    } catch {
      gastos = movimientos.filter((m) => m.tipo === 'gasto');
    }

    // 6. Construir el objeto de Backup estructurado
    const backup = {
      version: '1.2',
      tipo: 'BACKUP_COMPLETO',
      fechaExportacion: new Date().toISOString(),
      generadoPor: {
        usuario_id: usuarioRecord.id,
        auth_user_id: usuarioRecord.auth_user_id || authUser.id,
        nombre: usuarioRecord.nombre || '',
        email: usuarioRecord.email || authUser.email || '',
        rol: usuarioRecord.rol || ''
      },
      negocio: negocioRecord,
      usuario: usuarioRecord,
      totalCategorias: categorias.length,
      totalClientas: clientas.length,
      totalCuentas: cuentas.length,
      totalMovimientos: movimientos.length,
      totalDetallesCargo: detallesCargo.length,
      totalGastos: gastos.length,
      datos: {
        negocio: negocioRecord,
        usuario: usuarioRecord,
        categorias,
        clientas,
        cuentas,
        movimientos,
        detalles_cargo: detallesCargo,
        gastos
      }
    };

    return backup;
  },

  /**
   * Detecta el tipo y versión de backup (Android v1.0 o Web v1.2)
   */
  detectarTipoBackup(json) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      return { esValido: false, error: 'El archivo no contiene un formato de objeto JSON válido.' };
    }

    // Formato 1: Backup Android APK v1.0
    if (json.version === '1.0' && json.data && typeof json.data === 'object') {
      const { clientas, cuentas, movimientos } = json.data;
      if (Array.isArray(clientas) && Array.isArray(cuentas) && Array.isArray(movimientos)) {
        return {
          esValido: true,
          formato: 'ANDROID_V1',
          version: '1.0',
          nombreNegocio: json.data.storeName || 'ChestShop',
          totalClientas: clientas.length,
          totalCuentas: cuentas.length,
          totalMovimientos: movimientos.length,
          totalCategorias: 0
        };
      }
    }

    // Formato 2: Backup Web Completo v1.2
    if (json.tipo === 'BACKUP_COMPLETO' || (json.version === '1.2' && json.datos)) {
      const datos = json.datos || {};
      const clientas = Array.isArray(datos.clientas) ? datos.clientas : [];
      const cuentas = Array.isArray(datos.cuentas) ? datos.cuentas : [];
      const movimientos = Array.isArray(datos.movimientos) ? datos.movimientos : [];
      const categorias = Array.isArray(datos.categorias) ? datos.categorias : [];

      return {
        esValido: true,
        formato: 'WEB_V1_2',
        version: json.version || '1.2',
        nombreNegocio: json.negocio?.nombre || 'Negocio',
        totalClientas: json.totalClientas ?? clientas.length,
        totalCuentas: json.totalCuentas ?? cuentas.length,
        totalMovimientos: json.totalMovimientos ?? movimientos.length,
        totalCategorias: json.totalCategorias ?? categorias.length
      };
    }

    return {
      esValido: false,
      error: 'Formato de backup no reconocido. Debe ser un archivo .json exportado de la app de Android o de la plataforma web.'
    };
  },

  /**
   * Valida que un objeto cumpla con las reglas de un Backup Completo válido (v1.0 Android o v1.2 Web)
   */
  validarBackupJSON(json) {
    const deteccion = this.detectarTipoBackup(json);
    if (!deteccion.esValido) {
      throw new Error(deteccion.error);
    }
    return deteccion;
  },

  /**
   * Ejecuta la importación del backup según su formato.
   */
  async importarBackup(jsonCompleto) {
    const deteccion = this.validarBackupJSON(jsonCompleto);

    // Si es un backup exportado desde el APK de Android (v1.0)
    if (deteccion.formato === 'ANDROID_V1') {
      return await this.importarBackupAndroidV1(jsonCompleto);
    }

    // Si es un backup de la Web v1.2
    return await this.importarBackupWebV1_2(jsonCompleto);
  },

  /**
   * Importa de forma integral y fiel el backup JSON generado por el APK de Android (v1.0).
   * Mapea IDs alfanuméricos originales a UUIDs de Supabase manteniendo integridad relacional total.
   */
  async importarBackupAndroidV1(jsonAndroid) {
    // 1. Obtener usuario autenticado en Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw new Error('Debes tener una sesión activa en Supabase para importar un backup. Por favor inicia sesión.');
    }
    const authUser = authData.user;

    // 2. Obtener el negocio_id activo del usuario
    let negocioId = localStorage.getItem('active_negocio_id');
    let usuarioRecord = null;

    if (negocioId) {
      const { data: uData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .eq('negocio_id', negocioId)
        .maybeSingle();
      if (uData) usuarioRecord = uData;
    }

    if (!usuarioRecord) {
      const { data: uList } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (uList && uList.length > 0) {
        usuarioRecord = uList[0];
        negocioId = usuarioRecord.negocio_id;
        localStorage.setItem('active_negocio_id', negocioId);
      }
    }

    if (!negocioId) {
      throw new Error('No se encontró un negocio asociado a tu usuario. Asegúrate de haber completado el registro.');
    }

    const { clientas: rawClientas = [], cuentas: rawCuentas = [], movimientos: rawMovimientos = [], storeName, storeLogo } = jsonAndroid.data;

    // 3. Actualizar información del negocio si viene en el JSON
    const updatesNegocio = {};
    if (storeName && typeof storeName === 'string' && storeName.trim()) {
      updatesNegocio.nombre = storeName.trim();
    }
    if (storeLogo && typeof storeLogo === 'string' && storeLogo.trim()) {
      updatesNegocio.logo_url = storeLogo.trim();
    }
    if (Object.keys(updatesNegocio).length > 0) {
      await supabase
        .from('negocios')
        .update(updatesNegocio)
        .eq('id', negocioId);
    }

    // 4. Sembrar categorías iniciales si no existen
    let categoriasExistentes = [];
    const { data: catsData } = await supabase
      .from('categorias')
      .select('*')
      .eq('negocio_id', negocioId);

    if (!catsData || catsData.length === 0) {
      const catsInsert = [
        ...CATEGORIAS_PREDETERMINADAS,
        { nombre: 'Útiles', icono: '📚' }
      ].map(c => ({
        negocio_id: negocioId,
        nombre: c.nombre,
        icono: c.icono,
        activo: true
      }));

      const { data: insertedCats } = await supabase
        .from('categorias')
        .insert(catsInsert)
        .select();

      categoriasExistentes = insertedCats || [];
    } else {
      categoriasExistentes = catsData;
    }

    // 5. Mapear e insertar Clientas
    const clientaIdMap = new Map(); // androidId -> supabaseUuid
    const clientasPayload = rawClientas.map(c => {
      const newUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);
      if (newUuid) {
        clientaIdMap.set(c.id, newUuid);
      }
      return {
        ...(newUuid ? { id: newUuid } : {}),
        negocio_id: negocioId,
        user_id: authUser.id,
        nombre: c.nombre ? c.nombre.trim() : 'Sin nombre',
        referencia: c.referencia ? c.referencia.trim() : null,
        saldo: 0,
        fecha_registro: c.fechaRegistro || new Date().toISOString(),
        created_at: c.fechaRegistro || new Date().toISOString(),
        activo: true
      };
    });

    const clientasChunks = chunkArray(clientasPayload, 40);
    for (let i = 0; i < clientasChunks.length; i++) {
      const chunk = clientasChunks[i];
      const { data: inserted, error: errCli } = await supabase
        .from('clientas')
        .insert(chunk)
        .select('id, nombre, created_at');

      if (errCli) {
        // Fallback sin columna user_id si no existe
        const chunkFallback = chunk.map(item => {
          const copy = { ...item };
          delete copy.user_id;
          return copy;
        });
        const { data: insFallback, error: errCli2 } = await supabase
          .from('clientas')
          .insert(chunkFallback)
          .select('id, nombre, created_at');

        if (errCli2) {
          throw new Error(`Error insertando clientas en Supabase: ${errCli2.message}`);
        }
        if (insFallback) {
          insFallback.forEach((ins, idx) => {
            const originalCli = rawClientas[i * 40 + idx];
            if (originalCli) {
              clientaIdMap.set(originalCli.id, ins.id);
            }
          });
        }
      } else if (inserted) {
        inserted.forEach((ins, idx) => {
          const originalCli = rawClientas[i * 40 + idx];
          if (originalCli) {
            clientaIdMap.set(originalCli.id, ins.id);
          }
        });
      }
    }

    // 6. Mapear e insertar Cuentas
    const cuentaIdMap = new Map(); // androidCuentaId -> { id: supabaseUuid, clientaId: supabaseClientaId }
    const cuentasPayload = [];

    rawCuentas.forEach(cta => {
      const supabaseClientaId = clientaIdMap.get(cta.clientaId);
      if (!supabaseClientaId) return;

      const newCuentaUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);
      if (newCuentaUuid) {
        cuentaIdMap.set(cta.id, { id: newCuentaUuid, clientaId: supabaseClientaId });
      }

      cuentasPayload.push({
        ...(newCuentaUuid ? { id: newCuentaUuid } : {}),
        negocio_id: negocioId,
        clienta_id: supabaseClientaId,
        user_id: authUser.id,
        numero_cuenta: cta.numeroCuenta || 1,
        saldo: Number(cta.saldo || 0),
        estado: cta.estado === 'ACTIVA' ? 'ACTIVA' : 'CERRADA',
        anulada: Boolean(cta.anulada),
        created_at: cta.fechaCreacion || new Date().toISOString(),
        fecha_cierre: cta.fechaCierre || null
      });
    });

    const cuentasChunks = chunkArray(cuentasPayload, 40);
    for (let i = 0; i < cuentasChunks.length; i++) {
      const chunk = cuentasChunks[i];
      const { data: insertedCuentas, error: errCta } = await supabase
        .from('cuentas')
        .insert(chunk)
        .select('id, clienta_id');

      if (errCta) {
        const chunkFallback = chunk.map(item => {
          const copy = { ...item };
          delete copy.user_id;
          return copy;
        });
        const { data: insCtaFb, error: errCta2 } = await supabase
          .from('cuentas')
          .insert(chunkFallback)
          .select('id, clienta_id');

        if (errCta2) {
          throw new Error(`Error insertando cuentas en Supabase: ${errCta2.message}`);
        }
        if (insCtaFb) {
          insCtaFb.forEach((ins, idx) => {
            const originalCta = rawCuentas[i * 40 + idx];
            if (originalCta) {
              cuentaIdMap.set(originalCta.id, { id: ins.id, clientaId: ins.clienta_id });
            }
          });
        }
      } else if (insertedCuentas) {
        insertedCuentas.forEach((ins, idx) => {
          const originalCta = rawCuentas[i * 40 + idx];
          if (originalCta) {
            cuentaIdMap.set(originalCta.id, { id: ins.id, clientaId: ins.clienta_id });
          }
        });
      }
    }

    // 7. Mapear e insertar Movimientos
    const movimientosPayload = [];
    const detallesCargoParaInsertar = [];

    rawMovimientos.forEach(mov => {
      const cuentaObj = cuentaIdMap.get(mov.cuentaId);
      if (!cuentaObj) return;

      const newMovUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);

      let metodoPago = null;
      let montoEfectivo = 0;
      let montoYape = 0;

      if (mov.metodosPago) {
        const ef = Number(mov.metodosPago.efectivo || 0);
        const yp = Number(mov.metodosPago.yape || 0);
        if (ef > 0 && yp > 0) {
          metodoPago = 'mixto';
          montoEfectivo = ef;
          montoYape = yp;
        } else if (yp > 0) {
          metodoPago = 'yape';
          montoYape = yp;
        } else if (ef > 0) {
          metodoPago = 'efectivo';
          montoEfectivo = ef;
        }
      }

      const tipoMov = (mov.tipo || '').toUpperCase() === 'ABONO' ? 'ABONO' : 'CARGO';

      movimientosPayload.push({
        ...(newMovUuid ? { id: newMovUuid } : {}),
        negocio_id: negocioId,
        cuenta_id: cuentaObj.id,
        clienta_id: cuentaObj.clientaId,
        user_id: authUser.id,
        usuario_id: usuarioRecord?.id || null,
        tipo: tipoMov,
        monto: Number(mov.monto || 0),
        comentario: mov.comentario || '',
        descripcion: mov.comentario || '',
        fecha: mov.fecha || new Date().toISOString(),
        created_at: mov.fecha || new Date().toISOString(),
        metodo_pago: metodoPago,
        monto_efectivo: montoEfectivo,
        monto_yape: montoYape,
        anulado: false
      });

      // Si es un cargo con prendas, preparar detalles_cargo
      if (newMovUuid && tipoMov === 'CARGO' && mov.comentario) {
        const prendas = parsearPrendas(mov.comentario, mov.fecha, categoriasExistentes);
        prendas.forEach(p => {
          detallesCargoParaInsertar.push({
            negocio_id: negocioId,
            movimiento_id: newMovUuid,
            descripcion: p.descripcion,
            monto: p.monto,
            cantidad: p.cantidad || 1,
            fecha: p.fecha || mov.fecha,
            created_at: mov.fecha || new Date().toISOString()
          });
        });
      }
    });

    const movChunks = chunkArray(movimientosPayload, 40);
    for (let i = 0; i < movChunks.length; i++) {
      const chunk = movChunks[i];
      const { error: errMov } = await supabase
        .from('movimientos')
        .insert(chunk);

      if (errMov) {
        const chunkFallback = chunk.map(item => {
          const copy = { ...item };
          delete copy.user_id;
          delete copy.usuario_id;
          return copy;
        });
        const { error: errMov2 } = await supabase
          .from('movimientos')
          .insert(chunkFallback);

        if (errMov2) {
          throw new Error(`Error insertando movimientos en Supabase: ${errMov2.message}`);
        }
      }
    }

    // 8. Intentar insertar detalles de cargo en tabla detalles_cargo si existe
    if (detallesCargoParaInsertar.length > 0) {
      try {
        const detChunks = chunkArray(detallesCargoParaInsertar, 40);
        for (const detChunk of detChunks) {
          await supabase.from('detalles_cargo').insert(detChunk);
        }
      } catch (detErr) {
        console.warn('Advertencia insertando detalles_cargo secundarios:', detErr);
      }
    }

    // 9. Actualizar saldos finales de clientas
    try {
      const { data: todasCuentas } = await supabase
        .from('cuentas')
        .select('clienta_id, saldo, estado')
        .eq('negocio_id', negocioId);

      if (todasCuentas && todasCuentas.length > 0) {
        const saldoPorClienta = {};
        todasCuentas.forEach(cta => {
          if (!saldoPorClienta[cta.clienta_id]) saldoPorClienta[cta.clienta_id] = 0;
          if (cta.estado === 'ACTIVA') {
            saldoPorClienta[cta.clienta_id] += Number(cta.saldo || 0);
          }
        });

        for (const [cliId, sTotal] of Object.entries(saldoPorClienta)) {
          await supabase
            .from('clientas')
            .update({ saldo: sTotal })
            .eq('id', cliId);
        }
      }
    } catch (sErr) {
      console.warn('Error recalculando saldos de clientas:', sErr);
    }

    return {
      exito: true,
      formato: 'ANDROID_V1',
      negocio_id: negocioId,
      totalClientas: clientasPayload.length,
      totalCuentas: cuentasPayload.length,
      totalMovimientos: movimientosPayload.length,
      nombreNegocio: storeName || 'ChestShop'
    };
  },

  /**
   * Importa el backup de la Web v1.2 utilizando el RPC o inserción directa según disponibilidad.
   */
  async importarBackupWebV1_2(jsonCompleto) {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw new Error('Debes tener una sesión activa en Supabase para importar un backup. Por favor inicia sesión.');
    }

    // 1. Intentar llamar al RPC oficial si está configurado en Supabase
    try {
      const { data, error } = await supabase.rpc('importar_backup', {
        p_backup: jsonCompleto
      });

      if (!error && data && !data.error) {
        const nuevoNegocioId = data.negocio_id || data.negocioId;
        if (nuevoNegocioId) {
          localStorage.setItem('active_negocio_id', nuevoNegocioId);
        }
        return data;
      }
    } catch (rpcErr) {
      console.warn('RPC importar_backup no disponible o falló:', rpcErr);
    }

    // 2. Si no hay RPC, procesar los datos de jsonCompleto.datos
    const datos = jsonCompleto.datos || {};
    const rawClientas = datos.clientas || [];
    const rawCuentas = datos.cuentas || [];
    const rawMovimientos = datos.movimientos || [];
    const storeName = jsonCompleto.negocio?.nombre || 'Negocio Importado';

    return await this.importarBackupAndroidV1({
      version: '1.0',
      data: {
        clientas: rawClientas.map(c => ({
          id: c.id,
          nombre: c.nombre,
          referencia: c.referencia || c.notas,
          fechaRegistro: c.created_at || c.fecha_registro
        })),
        cuentas: rawCuentas.map(c => ({
          id: c.id,
          clientaId: c.clienta_id || c.clientaId,
          numeroCuenta: c.numero_cuenta || c.numeroCuenta || 1,
          saldo: c.saldo || 0,
          estado: c.estado || 'ACTIVA',
          anulada: c.anulada || false,
          fechaCreacion: c.created_at || c.fecha_creacion,
          fechaCierre: c.fecha_cierre || c.fechaCierre
        })),
        movimientos: rawMovimientos.map(m => ({
          id: m.id,
          cuentaId: m.cuenta_id || m.cuentaId,
          tipo: m.tipo,
          monto: m.monto,
          comentario: m.comentario || m.descripcion,
          fecha: m.fecha || m.created_at,
          metodosPago: {
            efectivo: m.monto_efectivo || (m.metodo_pago === 'efectivo' ? m.monto : 0),
            yape: m.monto_yape || (m.metodo_pago === 'yape' ? m.monto : 0)
          }
        })),
        storeName
      }
    });
  }
};
