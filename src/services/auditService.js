import { supabase } from '../lib/supabaseClient';

export const auditService = {
  /**
   * Registra un inicio de sesión exitoso en el historial de accesos
   */
  async registrarAcceso({ auth_user_id, usuario_id = null, negocio_id = null, email = '', nombre_usuario = '' }) {
    if (!auth_user_id) return;

    try {
      const payload = {
        auth_user_id,
        usuario_id,
        negocio_id,
        email,
        nombre_usuario,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Web Browser',
      };

      const { error } = await supabase.from('historial_accesos').insert([payload]);
      if (error) {
        // Si la tabla aún no se ha creado en Supabase, registrar warning en consola sin bloquear login
        console.warn('Nota: historial_accesos no disponible aún o error al insertar:', error.message);
      }
    } catch (err) {
      console.warn('Excepción al registrar historial de accesos:', err);
    }
  },

  /**
   * Obtiene los últimos inicios de sesión registrados a nivel global
   */
  async obtenerUltimosAccesos(limit = 15) {
    try {
      const { data, error } = await supabase
        .from('historial_accesos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Error al obtener historial de accesos:', error.message);
        return [];
      }

      const negocioIds = [...new Set((data || []).map((a) => a.negocio_id).filter(Boolean))];
      let negMap = {};
      if (negocioIds.length > 0) {
        try {
          const { data: negsData } = await supabase
            .from('negocios')
            .select('id, nombre')
            .in('id', negocioIds);

          (negsData || []).forEach((n) => {
            negMap[n.id] = n.nombre;
          });
        } catch (_) {}
      }

      return (data || []).map((acc) => ({
        id: acc.id,
        email: acc.email,
        nombre: acc.nombre_usuario || acc.email,
        fecha: acc.created_at,
        negocioNombre: negMap[acc.negocio_id] || 'Superadmin / Plataforma',
        userAgent: acc.user_agent,
      }));
    } catch (err) {
      console.warn('Excepción al obtener historial de accesos:', err);
      return [];
    }
  },

  /**
   * Obtiene los inicios de sesión para un negocio específico
   */
  async obtenerAccesosPorNegocio(negocioId, limit = 20) {
    if (!negocioId) return [];
    try {
      const { data, error } = await supabase
        .from('historial_accesos')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Error al obtener accesos de negocio:', error.message);
      }

      if (data && data.length > 0) {
        return data;
      }

      // Fallback: si no hay accesos con negocio_id explícito, buscar por auth_user_id de los usuarios del negocio
      const { data: usrData } = await supabase
        .from('usuarios')
        .select('auth_user_id')
        .eq('negocio_id', negocioId);

      const authUserIds = [...new Set((usrData || []).map((u) => u.auth_user_id).filter(Boolean))];
      if (authUserIds.length > 0) {
        const { data: fallbackData } = await supabase
          .from('historial_accesos')
          .select('*')
          .in('auth_user_id', authUserIds)
          .order('created_at', { ascending: false })
          .limit(limit);

        return fallbackData || [];
      }

      return data || [];
    } catch (err) {
      console.warn('Excepción al obtener accesos por negocio:', err);
      return [];
    }
  },
};
