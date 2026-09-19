import { supabase } from '../lib/supabaseClient';

export const superadminService = {
  /**
   * Obtiene la lista completa de negocios enriquecida con estado de suscripción y riesgo de abandono
   */
  async obtenerNegociosConMetricas() {
    // 1. Obtener todos los negocios
    const { data: negocios, error: negErr } = await supabase
      .from('negocios')
      .select('*')
      .order('created_at', { ascending: false });

    if (negErr) {
      console.error('Error al cargar negocios para superadmin:', negErr);
      throw new Error(negErr.message || 'Error al obtener lista de negocios');
    }

    if (!negocios || negocios.length === 0) return [];

    // 2. Cargar usuarios asignados por negocio
    const { data: usuarios, error: usrErr } = await supabase
      .from('usuarios')
      .select('id, negocio_id, activo, updated_at, created_at');

    if (usrErr) console.warn('Error al cargar usuarios para métricas:', usrErr);

    // 3. Cargar conteo de clientas registradas por negocio y su última actividad
    const clientasPorNegocio = new Map();
    const ultimasFechasPorNegocio = new Map();

    // A. Intentar RPC consolidado global de superadmin
    try {
      const { data: batchData, error: batchErr } = await supabase.rpc('superadmin_obtener_conteo_clientas');
      if (!batchErr && Array.isArray(batchData) && batchData.length > 0) {
        batchData.forEach((row) => {
          if (row.negocio_id) {
            clientasPorNegocio.set(row.negocio_id, Number(row.total_clientas || 0));
            if (row.ultima_actividad) {
              ultimasFechasPorNegocio.set(row.negocio_id, row.ultima_actividad);
            }
          }
        });
      }
    } catch (_) {}

    // B. Para los negocios que aún no tengan conteo, consultar en paralelo por negocio_id
    await Promise.all(
      negocios.map(async (n) => {
        if (clientasPorNegocio.has(n.id) && clientasPorNegocio.get(n.id) > 0) return;

        try {
          // 1. Conteo exacto en tabla clientas por negocio_id
          const { count, error: countErr } = await supabase
            .from('clientas')
            .select('id', { count: 'exact', head: true })
            .eq('negocio_id', n.id);

          if (!countErr && typeof count === 'number' && count > 0) {
            clientasPorNegocio.set(n.id, count);
            return;
          }

          // 2. Select de clientas por negocio_id
          const { data: clis, error: clisErr } = await supabase
            .from('clientas')
            .select('id, updated_at, created_at')
            .eq('negocio_id', n.id);

          if (!clisErr && clis && clis.length > 0) {
            clientasPorNegocio.set(n.id, clis.length);
            const fechas = clis.map((c) => c.updated_at || c.created_at).filter(Boolean);
            if (fechas.length > 0) {
              fechas.sort((a, b) => new Date(b) - new Date(a));
              ultimasFechasPorNegocio.set(n.id, fechas[0]);
            }
            return;
          }

          // 3. Fallback a tabla cuentas por negocio_id
          const { data: cuentasData } = await supabase
            .from('cuentas')
            .select('clienta_id, updated_at, created_at')
            .eq('negocio_id', n.id);

          if (cuentasData && cuentasData.length > 0) {
            const uniqueClientas = new Set(cuentasData.map((c) => c.clienta_id).filter(Boolean));
            if (uniqueClientas.size > 0) {
              clientasPorNegocio.set(n.id, uniqueClientas.size);
              const fechas = cuentasData.map((c) => c.updated_at || c.created_at).filter(Boolean);
              if (fechas.length > 0) {
                fechas.sort((a, b) => new Date(b) - new Date(a));
                ultimasFechasPorNegocio.set(n.id, fechas[0]);
              }
              return;
            }
          }

          // 4. Intentar RPC obtener_clientas_negocio
          const { data: rpcClis, error: rpcErr } = await supabase.rpc('obtener_clientas_negocio', {
            p_negocio_id: n.id,
          });
          if (!rpcErr && Array.isArray(rpcClis) && rpcClis.length > 0) {
            clientasPorNegocio.set(n.id, rpcClis.length);
            const fechas = rpcClis.map((c) => c.ultima_actividad).filter(Boolean);
            if (fechas.length > 0) {
              fechas.sort((a, b) => new Date(b) - new Date(a));
              ultimasFechasPorNegocio.set(n.id, fechas[0]);
            }
          }
        } catch (err) {
          console.warn(`[superadminService] Error obteniendo clientas para negocio ${n.id}:`, err);
        }
      })
    );

    // 4. Cargar accesos de logins por negocio
    const { data: accesos } = await supabase
      .from('historial_accesos')
      .select('negocio_id, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    const ahora = new Date();

    // Mapear métricas SaaS por negocio
    const listCompleta = negocios.map((n) => {
      const usuariosNegocio = (usuarios || []).filter((u) => u.negocio_id === n.id);
      const totalClientasCount = clientasPorNegocio.get(n.id) || 0;
      const ultimaActividadClientas = ultimasFechasPorNegocio.get(n.id) || null;
      const accesosNegocio = (accesos || []).filter((a) => a.negocio_id === n.id);

      // Calcular la última fecha de actividad/uso OPERACIONAL del negocio
      // (Se excluye n.updated_at para evitar que los cambios de suscripción/edición del Superadmin modifiquen la actividad)
      const fechasActividad = [
        ...accesosNegocio.map((a) => a.created_at),
        ultimaActividadClientas,
        ...usuariosNegocio.map((u) => u.updated_at || u.created_at),
      ].filter(Boolean);

      let ultimoUso = null;
      if (fechasActividad.length > 0) {
        fechasActividad.sort((a, b) => new Date(b) - new Date(a));
        ultimoUso = fechasActividad[0];
      }

      // Calcular Estado de Suscripción
      let estadoSuscripcion = 'vigente'; // 'vigente' | 'por_vencer' | 'vencido' | 'vitalicio'
      let diasRestantesSuscripcion = null;

      if (n.plan === 'vitalicio') {
        estadoSuscripcion = 'vitalicio';
      } else if (n.fecha_vencimiento) {
        const fVenc = new Date(n.fecha_vencimiento);
        const diffMs = fVenc - ahora;
        diasRestantesSuscripcion = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diasRestantesSuscripcion < 0) {
          estadoSuscripcion = 'vencido';
        } else if (diasRestantesSuscripcion <= 7) {
          estadoSuscripcion = 'por_vencer';
        } else {
          estadoSuscripcion = 'vigente';
        }
      }

      // Calcular Riesgo de Abandono (Churn Risk)
      let riesgoAbandono = 'normal'; // 'normal' | 'medio' | 'alto'
      let diasSinUso = 0;

      if (ultimoUso) {
        const ultUsoDate = new Date(ultimoUso);
        const diffSinUsoMs = ahora - ultUsoDate;
        diasSinUso = Math.floor(diffSinUsoMs / (1000 * 60 * 60 * 24));

        if (n.activo !== false) {
          if (diasSinUso >= 14) {
            riesgoAbandono = 'alto';
          } else if (diasSinUso >= 7) {
            riesgoAbandono = 'medio';
          }
        }
      }

      return {
        ...n,
        total_usuarios: usuariosNegocio.length,
        usuarios_activos: usuariosNegocio.filter((u) => u.activo !== false).length,
        total_clientas: totalClientasCount,
        ultimo_uso: ultimoUso,
        dias_sin_uso: diasSinUso,
        estado_suscripcion: estadoSuscripcion,
        dias_restantes_suscripcion: diasRestantesSuscripcion,
        riesgo_abandono: riesgoAbandono,
      };
    });

    return listCompleta;
  },

  /**
   * Obtiene las estadísticas generales consolidadas del SaaS
   */
  async obtenerEstadisticasConsolidadas() {
    const negocios = await this.obtenerNegociosConMetricas();

    const totalNegocios = negocios.length;
    const negociosActivos = negocios.filter((n) => n.activo !== false).length;
    const negociosInactivos = totalNegocios - negociosActivos;
    const totalUsuariosSystem = negocios.reduce((acc, n) => acc + n.total_usuarios, 0);
    const totalClientasRegistradas = negocios.reduce((acc, n) => acc + n.total_clientas, 0);

    // Conteo de suscripciones
    const porVencerCount = negocios.filter((n) => n.estado_suscripcion === 'por_vencer').length;
    const vencidosCount = negocios.filter((n) => n.estado_suscripcion === 'vencido').length;

    // Conteo de riesgo de abandono
    const enRiesgoCount = negocios.filter((n) => n.riesgo_abandono === 'alto' || n.riesgo_abandono === 'medio').length;

    return {
      totalNegocios,
      negociosActivos,
      negociosInactivos,
      totalUsuariosSystem,
      totalClientasRegistradas,
      porVencerCount,
      vencidosCount,
      enRiesgoCount,
      negocios,
    };
  },

  /**
   * Obtiene la ficha técnica ampliada de un negocio para el Superadmin
   */
  async obtenerDetalleNegocioAmpliado(negocioId) {
    if (!negocioId) return null;

    // Negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('*')
      .eq('id', negocioId)
      .single();

    if (!negocio) return null;

    // Usuarios asignados al negocio
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('*')
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false });

    // Conteo de clientas en la tienda
    let totalClientas = 0;
    let ultimaFechaClientas = null;

    // 1. Intentar conteo exacto rápido en tabla clientas
    try {
      const { count, error: countErr } = await supabase
        .from('clientas')
        .select('id', { count: 'exact', head: true })
        .eq('negocio_id', negocioId);

      if (!countErr && typeof count === 'number' && count > 0) {
        totalClientas = count;
      }
    } catch (_) {}

    // 2. Consulta directa de registros de clientas por negocio_id
    if (totalClientas === 0) {
      try {
        const { data: directClis, error: directErr } = await supabase
          .from('clientas')
          .select('id, created_at, updated_at')
          .eq('negocio_id', negocioId);

        if (!directErr && directClis && directClis.length > 0) {
          totalClientas = directClis.length;
          const fechas = directClis.map((c) => c.updated_at || c.created_at).filter(Boolean);
          if (fechas.length > 0) {
            fechas.sort((a, b) => new Date(b) - new Date(a));
            ultimaFechaClientas = fechas[0];
          }
        }
      } catch (_) {}
    }

    // 3. Fallback a tabla cuentas por negocio_id
    if (totalClientas === 0) {
      try {
        const { data: cuentasData } = await supabase
          .from('cuentas')
          .select('clienta_id, created_at, updated_at')
          .eq('negocio_id', negocioId);

        if (cuentasData && cuentasData.length > 0) {
          const uniqueSet = new Set(cuentasData.map((c) => c.clienta_id).filter(Boolean));
          if (uniqueSet.size > 0) {
            totalClientas = uniqueSet.size;
            const fechas = cuentasData.map((c) => c.updated_at || c.created_at).filter(Boolean);
            if (fechas.length > 0) {
              fechas.sort((a, b) => new Date(b) - new Date(a));
              ultimaFechaClientas = fechas[0];
            }
          }
        }
      } catch (_) {}
    }

    // 4. Fallback a RPC específico
    if (totalClientas === 0) {
      try {
        const { data: rpcClis, error: rpcErr } = await supabase.rpc('obtener_clientas_negocio', {
          p_negocio_id: negocioId,
        });
        if (!rpcErr && Array.isArray(rpcClis) && rpcClis.length > 0) {
          totalClientas = rpcClis.length;
          const fechas = rpcClis.map((c) => c.ultima_actividad).filter(Boolean);
          if (fechas.length > 0) {
            fechas.sort((a, b) => new Date(b) - new Date(a));
            ultimaFechaClientas = fechas[0];
          }
        }
      } catch (e) {
        console.warn('[superadminService] Error obteniendo detalle clientas vía RPC:', e);
      }
    }

    // Cargar accesos de logins por negocio
    const { data: accesos } = await supabase
      .from('historial_accesos')
      .select('created_at')
      .eq('negocio_id', negocioId)
      .order('created_at', { ascending: false })
      .limit(100);

    // Calcular último uso excluyendo negocio.updated_at
    const fechas = [
      ...(accesos || []).map((a) => a.created_at),
      ultimaFechaClientas,
      ...(usuarios || []).map((u) => u.updated_at || u.created_at),
    ].filter(Boolean);

    fechas.sort((a, b) => new Date(b) - new Date(a));
    const ultimoUso = fechas[0] || null;

    // Calcular días sin uso y estado de suscripción
    const ahora = new Date();
    let diasSinUso = 0;
    let riesgoAbandono = 'normal';

    if (ultimoUso) {
      const ultUsoDate = new Date(ultimoUso);
      diasSinUso = Math.floor((ahora - ultUsoDate) / (1000 * 60 * 60 * 24));
      if (negocio.activo !== false) {
        if (diasSinUso >= 14) riesgoAbandono = 'alto';
        else if (diasSinUso >= 7) riesgoAbandono = 'medio';
      }
    }

    let estadoSuscripcion = 'vigente';
    let diasRestantes = null;
    if (negocio.plan === 'vitalicio') {
      estadoSuscripcion = 'vitalicio';
    } else if (negocio.fecha_vencimiento) {
      const fVenc = new Date(negocio.fecha_vencimiento);
      diasRestantes = Math.ceil((fVenc - ahora) / (1000 * 60 * 60 * 24));
      if (diasRestantes < 0) estadoSuscripcion = 'vencido';
      else if (diasRestantes <= 7) estadoSuscripcion = 'por_vencer';
    }

    return {
      negocio: {
        ...negocio,
        estado_suscripcion: estadoSuscripcion,
        dias_restantes: diasRestantes,
        dias_sin_uso: diasSinUso,
        riesgo_abandono: riesgoAbandono,
      },
      usuarios: usuarios || [],
      totalClientas,
      ultimoUso,
    };
  },
};
