import { supabase } from '../lib/supabaseClient';
import { parsearPrendas } from '../utils/helpers';
import { CATEGORIAS_PREDETERMINADAS, categoriasService } from './categoriasService';

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

    // Formato 0: Backup Oficial WEB_MIGRATION (v1.0)
    if (json.backup_type === 'WEB_MIGRATION' && json.data && typeof json.data === 'object') {
      const { clientas = [], cuentas = [], movimientos = [] } = json.data;
      return {
        esValido: true,
        formato: 'WEB_MIGRATION',
        version: json.backup_version || '1.0',
        nombreNegocio: json.data.storeName || json.source || 'ChestShop',
        totalClientas: clientas.length,
        totalCuentas: cuentas.length,
        totalMovimientos: movimientos.length,
        totalCategorias: 0,
        summary: json.summary || null
      };
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

    // Si es un backup oficial de migración WEB_MIGRATION (v1.0)
    if (deteccion.formato === 'WEB_MIGRATION') {
      return await this.importarBackupWebMigration(jsonCompleto);
    }

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
      try {
        await supabase
          .from('negocios')
          .update(updatesNegocio)
          .eq('id', negocioId);
      } catch (negErr) {
        console.warn('Advertencia actualizando negocio:', negErr);
      }
    }

    // 4. Sembrar categorías iniciales de forma segura
    let categoriasExistentes = [];
    try {
      const { data: catsData } = await supabase
        .from('categorias')
        .select('*')
        .eq('negocio_id', negocioId);

      if (!catsData || catsData.length === 0) {
        categoriasExistentes = await categoriasService.sembrarCategoriasPredeterminadas(negocioId);
      } else {
        categoriasExistentes = catsData;
      }
    } catch (cErr) {
      console.warn('Advertencia verificando categorías:', cErr);
    }

    // 4.1 No realizar DELETE masivos para preservar datos existentes y permitir importaciones idempotentes

    // 5. Mapear e insertar Clientas
    // Columnas exactas en Supabase: (id, negocio_id, nombre, referencia, fecha_registro, activo, created_at)
    const clientaIdMap = new Map(); // androidId -> supabaseUuid
    const clientasPayload = rawClientas.map(c => {
      const newUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);
      if (newUuid) {
        clientaIdMap.set(c.id, newUuid);
      }
      return {
        ...(newUuid ? { id: newUuid } : {}),
        negocio_id: negocioId,
        nombre: c.nombre ? c.nombre.trim() : 'Sin nombre',
        referencia: c.referencia ? c.referencia.trim() : null,
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
        throw new Error(`Error insertando clientas en Supabase: ${errCli.message}`);
      }
      if (inserted) {
        inserted.forEach((ins, idx) => {
          const originalCli = rawClientas[i * 40 + idx];
          if (originalCli) {
            clientaIdMap.set(originalCli.id, ins.id);
          }
        });
      }
    }

    // 6. Mapear e insertar Cuentas
    // Garantizar que (clienta_id, numero_cuenta) sea siempre único para respetar cuentas_clienta_numero_unique
    const cuentaIdMap = new Map(); // androidCuentaId -> { id: supabaseUuid, clientaId: supabaseClientaId }
    const cuentasPayload = [];

    // Rastrear números de cuenta únicos por clienta
    const correlativoPorClienta = new Map(); // supabaseClientaId -> maxNumeroCuenta
    const numerosUsadosPorClienta = new Map(); // supabaseClientaId -> Set<number>

    rawCuentas.forEach(cta => {
      const supabaseClientaId = clientaIdMap.get(cta.clientaId);
      if (!supabaseClientaId) return;

      if (!correlativoPorClienta.has(supabaseClientaId)) {
        correlativoPorClienta.set(supabaseClientaId, 0);
        numerosUsadosPorClienta.set(supabaseClientaId, new Set());
      }

      let num = parseInt(cta.numeroCuenta, 10);
      const usados = numerosUsadosPorClienta.get(supabaseClientaId);

      // Si el número es nulo, NaN, <= 0 o ya fue asignado a otra cuenta de esta misma clienta:
      if (isNaN(num) || num <= 0 || usados.has(num)) {
        num = correlativoPorClienta.get(supabaseClientaId) + 1;
        while (usados.has(num)) {
          num++;
        }
      }

      usados.add(num);
      if (num > correlativoPorClienta.get(supabaseClientaId)) {
        correlativoPorClienta.set(supabaseClientaId, num);
      }

      const newCuentaUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);
      if (newCuentaUuid) {
        cuentaIdMap.set(cta.id, { id: newCuentaUuid, clientaId: supabaseClientaId });
      }

      cuentasPayload.push({
        ...(newCuentaUuid ? { id: newCuentaUuid } : {}),
        negocio_id: negocioId,
        clienta_id: supabaseClientaId,
        numero_cuenta: num,
        fecha_creacion: cta.fechaCreacion || new Date().toISOString(),
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
        throw new Error(`Error insertando cuentas en Supabase: ${errCta.message}`);
      }
      if (insertedCuentas) {
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
        tipo: tipoMov,
        monto: Number(mov.monto || 0),
        comentario: mov.comentario || '',
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
        // Fallback sin columnas de métodos de pago si no existieran en tablas antiguas
        const chunkFallback = chunk.map(item => {
          const copy = { ...item };
          delete copy.metodo_pago;
          delete copy.monto_efectivo;
          delete copy.monto_yape;
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
  },

  /**
   * Importa de forma integral y fiel el backup JSON de WEB_MIGRATION (v1.0).
   * Idempotente: NO borra datos, reutiliza clientas/cuentas/movimientos existentes
   * por legacy_id o llaves naturales, e inserta únicamente los faltantes.
   * La relación se resuelve estrictamente: clienta -> cuenta -> movimiento (usando cuenta_id).
   * JAMÁS envía clienta_id a la tabla movimientos.
   */
  async importarBackupWebMigration(jsonWebMigration) {
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

    const { clientas: rawClientas = [], cuentas: rawCuentas = [], movimientos: rawMovimientos = [] } = jsonWebMigration.data || {};

    // 3. Actualizar información del negocio si viene en el JSON
    const storeName = jsonWebMigration.data?.storeName || jsonWebMigration.source || 'ChestShop';
    try {
      await supabase
        .from('negocios')
        .update({ nombre: storeName })
        .eq('id', negocioId);
    } catch (negErr) {
      console.warn('Advertencia actualizando negocio:', negErr);
    }

    // 4. Sembrar o verificar categorías para parsear prendas
    let categoriasExistentes = [];
    try {
      const { data: catsData } = await supabase
        .from('categorias')
        .select('*')
        .eq('negocio_id', negocioId);

      if (!catsData || catsData.length === 0) {
        categoriasExistentes = await categoriasService.sembrarCategoriasPredeterminadas(negocioId);
      } else {
        categoriasExistentes = catsData;
      }
    } catch (cErr) {
      console.warn('Advertencia verificando categorías:', cErr);
    }

    // 5. IMPORTAR / REUTILIZAR CLIENTAS (Idempotente, identidad por negocio_id + legacy_id)
    let dbClientas = [];
    try {
      dbClientas = await fetchAllByNegocio('clientas', negocioId);
    } catch (errDbCli) {
      console.warn('Error leyendo clientas existentes:', errDbCli);
    }

    const clientaIdMap = new Map(); // rawClienta.legacy_id -> supabaseUuid
    const clientasByLegacyId = new Map();

    dbClientas.forEach(c => {
      if (c.legacy_id) clientasByLegacyId.set(c.legacy_id, c.id);
    });

    const clientasParaInsertar = [];
    let clientasExistentesCount = 0;

    rawClientas.forEach(cli => {
      // Identidad estricta por negocio_id + legacy_id (NUNCA por nombre)
      const existingId = clientasByLegacyId.get(cli.legacy_id);

      if (existingId) {
        clientaIdMap.set(cli.legacy_id, existingId);
        clientasExistentesCount++;
      } else {
        const newUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);
        const uuidFinal = newUuid || (cli.legacy_id.length === 36 ? cli.legacy_id : undefined);
        if (uuidFinal) {
          clientaIdMap.set(cli.legacy_id, uuidFinal);
        }

        clientasParaInsertar.push({
          ...(uuidFinal ? { id: uuidFinal } : {}),
          negocio_id: negocioId,
          nombre: cli.nombre ? cli.nombre.trim() : 'Sin nombre',
          referencia: cli.referencia ? cli.referencia.trim() : null,
          fecha_registro: cli.fecha_registro || new Date().toISOString(),
          created_at: cli.fecha_registro || new Date().toISOString(),
          activo: true,
          legacy_id: cli.legacy_id
        });
      }
    });

    if (clientasParaInsertar.length > 0) {
      const cliChunks = chunkArray(clientasParaInsertar, 40);
      for (let i = 0; i < cliChunks.length; i++) {
        let chunk = cliChunks[i];
        let { data: inserted, error: errCli } = await supabase
          .from('clientas')
          .insert(chunk)
          .select('id, nombre, created_at');

        // Si la columna legacy_id no existe en la tabla clientas, reintentar sin ella
        if (errCli && (errCli.code === 'PGRST204' || errCli.message?.includes('legacy_id'))) {
          chunk = chunk.map(c => {
            const copy = { ...c };
            delete copy.legacy_id;
            return copy;
          });
          const retryRes = await supabase.from('clientas').insert(chunk).select('id, nombre, created_at');
          inserted = retryRes.data;
          errCli = retryRes.error;
        }

        if (errCli) {
          throw new Error(`Error insertando clientas en Supabase: ${errCli.message}`);
        }

        if (inserted) {
          inserted.forEach((ins, idx) => {
            const originalCli = clientasParaInsertar[i * 40 + idx];
            if (originalCli && originalCli.legacy_id) {
              clientaIdMap.set(originalCli.legacy_id, ins.id);
            }
          });
        }
      }
    }

    // 6. IMPORTAR / REUTILIZAR CUENTAS (Idempotente, identidad por negocio_id + legacy_id)
    let dbCuentas = [];
    try {
      dbCuentas = await fetchAllByNegocio('cuentas', negocioId);
    } catch (errDbCta) {
      console.warn('Error leyendo cuentas existentes:', errDbCta);
    }

    const cuentaIdMap = new Map(); // rawCuenta.legacy_id -> supabaseUuid
    const cuentasByLegacyId = new Map();

    dbCuentas.forEach(cta => {
      if (cta.legacy_id) cuentasByLegacyId.set(cta.legacy_id, cta.id);
    });

    const cuentasParaInsertar = [];
    let cuentasExistentesCount = 0;

    // Agrupar y ordenar cuentas por clienta para garantizar numero_cuenta único y correlativo
    const cuentasPorClienta = new Map();
    rawCuentas.forEach(cta => {
      const cliId = cta.clienta_legacy_id;
      if (!cuentasPorClienta.has(cliId)) {
        cuentasPorClienta.set(cliId, []);
      }
      cuentasPorClienta.get(cliId).push(cta);
    });

    for (const [cliLegacyId, listaCuentas] of cuentasPorClienta.entries()) {
      const supabaseClientaId = clientaIdMap.get(cliLegacyId);
      if (!supabaseClientaId) continue;

      // Orden cronológico determinista
      listaCuentas.sort((a, b) => {
        const da = new Date(a.fecha_creacion).getTime();
        const db = new Date(b.fecha_creacion).getTime();
        if (da !== db) return da - db;
        return (a.legacy_id || '').localeCompare(b.legacy_id || '');
      });

      listaCuentas.forEach((cta, index) => {
        const numCuentaCorrelativo = index + 1;

        // Identidad estricta por negocio_id + legacy_id
        const existingCtaId = cuentasByLegacyId.get(cta.legacy_id);

        const rawEstado = (cta.estado || '').toUpperCase();
        let estadoFinal = 'ACTIVA';
        if (rawEstado === 'ACTIVA') {
          estadoFinal = 'ACTIVA';
        } else if (rawEstado === 'CERRADA' || rawEstado === 'INACTIVA') {
          estadoFinal = 'INACTIVA';
        } else {
          throw new Error(`Estado de cuenta no reconocido: "${cta.estado}" en cuenta legacy_id "${cta.legacy_id}". La importación se ha detenido para evitar datos corruptos.`);
        }

        if (existingCtaId) {
          cuentaIdMap.set(cta.legacy_id, existingCtaId);
          cuentasExistentesCount++;
        } else {
          const newCtaUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);
          const ctaUuidFinal = newCtaUuid || (cta.legacy_id.length === 36 ? cta.legacy_id : undefined);
          if (ctaUuidFinal) {
            cuentaIdMap.set(cta.legacy_id, ctaUuidFinal);
          }

          cuentasParaInsertar.push({
            ...(ctaUuidFinal ? { id: ctaUuidFinal } : {}),
            negocio_id: negocioId,
            clienta_id: supabaseClientaId,
            numero_cuenta: numCuentaCorrelativo,
            saldo: Number(cta.saldo || 0),
            estado: estadoFinal,
            fecha_creacion: cta.fecha_creacion || new Date().toISOString(),
            created_at: cta.fecha_creacion || new Date().toISOString(),
            fecha_cierre: cta.fecha_cierre || null,
            legacy_id: cta.legacy_id
          });
        }
      });
    }

    if (cuentasParaInsertar.length > 0) {
      const ctaChunks = chunkArray(cuentasParaInsertar, 40);
      for (let i = 0; i < ctaChunks.length; i++) {
        let chunk = ctaChunks[i];
        let { data: insertedCta, error: errCta } = await supabase
          .from('cuentas')
          .insert(chunk)
          .select('id, clienta_id');

        // Si la columna legacy_id no existe en la tabla cuentas, reintentar sin ella
        if (errCta && (errCta.code === 'PGRST204' || errCta.message?.includes('legacy_id'))) {
          chunk = chunk.map(c => {
            const copy = { ...c };
            delete copy.legacy_id;
            return copy;
          });
          const retryRes = await supabase.from('cuentas').insert(chunk).select('id, clienta_id');
          insertedCta = retryRes.data;
          errCta = retryRes.error;
        }

        if (errCta) {
          throw new Error(`Error insertando cuentas en Supabase: ${errCta.message}`);
        }

        if (insertedCta) {
          insertedCta.forEach((ins, idx) => {
            const originalCta = cuentasParaInsertar[i * 40 + idx];
            if (originalCta && originalCta.legacy_id) {
              cuentaIdMap.set(originalCta.legacy_id, ins.id);
            }
          });
        }
      }
    }

    // 7. IMPORTAR MOVIMIENTOS USANDO EXCLUSIVAMENTE cuenta_id (JAMÁS clienta_id)
    let dbMovs = [];
    try {
      dbMovs = await fetchAllByNegocio('movimientos', negocioId);
    } catch (errDbMov) {
      console.warn('Error leyendo movimientos existentes:', errDbMov);
    }

    const existingMovLegacySet = new Set((dbMovs || []).map(m => m.legacy_id).filter(Boolean));
    const movimientosParaInsertar = [];
    const movimientosSinCuenta = [];
    let movimientosExistentesCount = 0;

    rawMovimientos.forEach(mov => {
      // Idempotencia: Si ya existe por negocio_id + legacy_id en Supabase, no duplicar
      if (existingMovLegacySet.has(mov.legacy_id)) {
        movimientosExistentesCount++;
        return;
      }

      // Buscar el UUID de la cuenta en Supabase a través de cuenta_legacy_id
      const targetCuentaId = cuentaIdMap.get(mov.cuenta_legacy_id);
      if (!targetCuentaId) {
        movimientosSinCuenta.push(mov.legacy_id);
        return;
      }

      const newMovUuid = crypto.randomUUID ? crypto.randomUUID() : (self.crypto?.randomUUID ? self.crypto.randomUUID() : null);

      const tipoMov = (mov.tipo || '').toUpperCase() === 'ABONO' ? 'ABONO' : 'CARGO';

      // Estructura limpia y conforme a las constraints reales de Supabase:
      // CARGO: metodo_pago = null, monto_efectivo = 0, monto_yape = 0
      // ABONO: metodo_pago en mayúsculas, montos acordes
      const metodoPago = tipoMov === 'CARGO' ? null : (mov.metodo_pago ? mov.metodo_pago.toUpperCase() : 'EFECTIVO');
      const ef = tipoMov === 'CARGO' ? 0 : Number(mov.monto_efectivo || 0);
      const yp = tipoMov === 'CARGO' ? 0 : Number(mov.monto_yape || 0);

      const payloadMov = {
        ...(newMovUuid ? { id: newMovUuid } : {}),
        negocio_id: negocioId,
        cuenta_id: targetCuentaId, // <-- ÚNICO vínculo relacional, NUNCA clienta_id
        legacy_id: mov.legacy_id,
        tipo: tipoMov,
        monto: Number(mov.monto || 0),
        comentario: mov.comentario || '',
        fecha: mov.fecha || new Date().toISOString(),
        metodo_pago: metodoPago,
        monto_efectivo: ef,
        monto_yape: yp,
        created_at: mov.fecha || new Date().toISOString(),
        updated_at: mov.fecha || new Date().toISOString(),
        anulado: false,
        fecha_anulacion: null,
        anulado_por: null,
        motivo_anulacion: null,
        movimiento_reversion_id: null,
        usuario_id: authUser?.id || null
      };

      movimientosParaInsertar.push(payloadMov);
    });

    const errores = [];

    if (movimientosParaInsertar.length > 0) {
      const movChunks = chunkArray(movimientosParaInsertar, 40);
      for (let i = 0; i < movChunks.length; i++) {
        let chunk = movChunks[i];
        let { error: errMov } = await supabase.from('movimientos').insert(chunk);

        // Si da error por columnas de auditoría opcionales, reintentar sin ellas
        if (errMov && (errMov.code === 'PGRST204' || errMov.message?.includes('usuario_id') || errMov.message?.includes('anulado_por') || errMov.message?.includes('schema cache'))) {
          chunk = chunk.map(item => {
            const copy = { ...item };
            delete copy.usuario_id;
            delete copy.anulado_por;
            delete copy.movimiento_reversion_id;
            return copy;
          });
          const retryRes = await supabase.from('movimientos').insert(chunk);
          errMov = retryRes.error;
        }

        if (errMov) {
          errores.push(`Error en bloque ${i + 1} de movimientos: ${errMov.message}`);
          throw new Error(`Error insertando movimientos en Supabase: ${errMov.message}`);
        }
      }
    }

    return {
      exito: errores.length === 0,
      formato: 'WEB_MIGRATION',
      negocio_id: negocioId,
      nombreNegocio: storeName,
      clientas_creadas: clientasParaInsertar.length,
      clientas_existentes: clientasExistentesCount,
      total_clientas: rawClientas.length,
      cuentas_creadas: cuentasParaInsertar.length,
      cuentas_existentes: cuentasExistentesCount,
      total_cuentas: rawCuentas.length,
      movimientos_creados: movimientosParaInsertar.length,
      movimientos_existentes: movimientosExistentesCount,
      total_movimientos: rawMovimientos.length,
      movimientos_sin_cuenta: movimientosSinCuenta.length,
      detalles_importados: 0,
      categorias_importadas: categoriasExistentes.length,
      errores,
      // Compatibilidad con la UI de TabBackup
      clientas_importadas: clientasParaInsertar.length + clientasExistentesCount,
      cuentas_importadas: cuentasParaInsertar.length + cuentasExistentesCount,
      movimientos_importados: movimientosParaInsertar.length + movimientosExistentesCount,
      totalClientas: rawClientas.length,
      totalCuentas: rawCuentas.length,
      totalMovimientos: rawMovimientos.length
    };
  }
};
