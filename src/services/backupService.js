import { supabase } from '../lib/supabaseClient';

/**
 * Servicio para generar y restaurar copias de seguridad completas (Backup)
 * consultando directamente los datos reales del negocio en Supabase y
 * ejecutando la función RPC oficial importar_backup.
 */

/**
 * Consulta todos los registros de una tabla filtrando por negocio_id,
 * manejando paginación automática para no truncar si hay más de 1000 filas.
 * Si ocurre cualquier error, lo lanza de inmediato sin silenciarlo.
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

export const backupService = {
  /**
   * Genera el backup completo con los datos reales del negocio autenticado.
   * Lanza un error explícito si falla la autenticación o la consulta de cualquier tabla.
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
      fetchAllByNegocio('detalles_cargo', negocioId)
    ]);

    // 5. Consultar gastos (si existe la tabla 'gastos'; si no, filtrar desde movimientos)
    let gastos = [];
    try {
      const { data: gastosData, error: gastosError } = await supabase
        .from('gastos')
        .select('*')
        .eq('negocio_id', negocioId);

      if (!gastosError && gastosData) {
        gastos = gastosData;
      } else if (gastosError && gastosError.code !== 'PGRST205') {
        throw new Error(`Error al consultar la tabla "gastos" en Supabase: ${gastosError.message}`);
      } else {
        gastos = movimientos.filter((m) => m.tipo === 'gasto');
      }
    } catch (gErr) {
      if (gErr.message.includes('tabla "gastos"')) throw gErr;
      gastos = movimientos.filter((m) => m.tipo === 'gasto');
    }

    // 6. Construir el objeto de Backup estructurado con UUIDs y relaciones originales intactas
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
   * Valida que un objeto cumpla con las reglas estrictas de un Backup Completo versión 1.2
   * antes de intentar enviarlo a Supabase.
   */
  validarBackupJSON(json) {
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error('El archivo no contiene un formato de objeto JSON válido.');
    }

    if (json.tipo !== 'BACKUP_COMPLETO') {
      throw new Error(
        `Tipo de backup inválido: se esperaba "BACKUP_COMPLETO", pero se recibió "${json.tipo || 'no especificado'}".`
      );
    }

    if (json.version !== '1.2') {
      throw new Error(
        `Versión de backup incompatible: se requiere la versión "1.2", pero el archivo indica "${json.version || 'desconocida'}".`
      );
    }

    if (!json.datos || typeof json.datos !== 'object') {
      throw new Error('El archivo de backup no contiene la propiedad principal "datos".');
    }

    const camposRequeridos = [
      'categorias',
      'clientas',
      'cuentas',
      'movimientos',
      'detalles_cargo'
    ];

    const faltantes = camposRequeridos.filter(
      (campo) => json.datos[campo] === undefined || json.datos[campo] === null
    );

    if (faltantes.length > 0) {
      throw new Error(
        `El archivo de backup está incompleto. Faltan las siguientes secciones dentro de "datos": ${faltantes.join(', ')}.`
      );
    }

    return true;
  },

  /**
   * Ejecuta la importación del backup a través de la función RPC oficial importar_backup en Supabase.
   * NO inserta directamente en tablas ni expone service_role.
   */
  async importarBackup(jsonCompleto) {
    // 1. Validar la estructura del JSON
    this.validarBackupJSON(jsonCompleto);

    // 2. Verificar que exista una sesión activa en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      throw new Error('Debes tener una sesión activa en Supabase para importar un backup. Por favor inicia sesión.');
    }

    // 3. Llamar exclusivamente al RPC existente en Supabase
    const { data, error } = await supabase.rpc('importar_backup', {
      p_backup: jsonCompleto
    });

    if (error) {
      throw new Error(error.message || error.details || 'Error desconocido al ejecutar la importación en Supabase.');
    }

    if (!data) {
      throw new Error('La función de importación en Supabase finalizó pero no devolvió ninguna respuesta.');
    }

    // Si la función SQL devuelve un campo de error explícito
    if (data.error) {
      throw new Error(`Error durante la importación: ${data.error}`);
    }

    // 4. Guardar el nuevo negocio_id como negocio activo para que el frontend lo utilice
    const nuevoNegocioId = data.negocio_id || data.negocioId;
    if (nuevoNegocioId) {
      localStorage.setItem('active_negocio_id', nuevoNegocioId);
    }

    return data;
  }
};
