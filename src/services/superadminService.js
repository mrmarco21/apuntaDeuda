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

    // 3. Cargar conteo de clientas registradas por negocio
    let { data: clientas, error: cliErr } = await supabase
      .from('clientas')
      .select('id, negocio_id, updated_at, created_at');

    if (cliErr) console.warn('Error al cargar clientas para adopción:', cliErr);

    // Fallback si RLS en 'clientas' restringe la consulta global para Superadmin
    let fallbackClientasMap = {};
    try {
      const { data: cuentasData } = await supabase
        .from('cuentas')
        .select('negocio_id, clienta_id, updated_at, created_at');

      if (cuentasData && cuentasData.length > 0) {
        cuentasData.forEach((ct) => {
          if (ct.negocio_id && ct.clienta_id) {
            if (!fallbackClientasMap[ct.negocio_id]) {
              fallbackClientasMap[ct.negocio_id] = new Map();
            }
            fallbackClientasMap[ct.negocio_id].set(ct.clienta_id, ct);
          }
        });
      }
    } catch (_) {}

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
      let clientasNegocio = (clientas || []).filter((c) => c.negocio_id === n.id);
      let totalClientasCount = clientasNegocio.length;

      if (totalClientasCount === 0 && fallbackClientasMap[n.id]) {
        totalClientasCount = fallbackClientasMap[n.id].size;
        clientasNegocio = Array.from(fallbackClientasMap[n.id].values());
      }

      const accesosNegocio = (accesos || []).filter((a) => a.negocio_id === n.id);

      // Calcular la última fecha de actividad/uso OPERACIONAL del negocio
      // (Se excluye n.updated_at para evitar que los cambios de suscripción/edición del Superadmin modifiquen la actividad)
      const fechasActividad = [
        ...accesosNegocio.map((a) => a.created_at),
        ...clientasNegocio.map((c) => c.updated_at || c.created_at),
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
    let { data: clientas } = await supabase
      .from('clientas')
      .select('id, created_at, updated_at')
      .eq('negocio_id', negocioId);

    let totalClientas = (clientas || []).length;
    if (totalClientas === 0) {
      try {
        const { data: cuentasData } = await supabase
          .from('cuentas')
          .select('clienta_id, created_at, updated_at')
          .eq('negocio_id', negocioId);

        if (cuentasData && cuentasData.length > 0) {
          const uniqueSet = new Set(cuentasData.map((c) => c.clienta_id).filter(Boolean));
          totalClientas = uniqueSet.size;
          if (!clientas || clientas.length === 0) {
            clientas = cuentasData;
          }
        }
      } catch (_) {}
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
      ...(clientas || []).map((c) => c.updated_at || c.created_at),
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
