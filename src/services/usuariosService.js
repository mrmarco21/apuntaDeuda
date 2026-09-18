import { supabase } from '../lib/supabaseClient';

export const usuariosService = {
  /**
   * Obtiene la lista consolidada de usuarios de la plataforma.
   * Intenta primero mediante la Edge Function 'admin-usuarios' para obtener los correos reales desde auth.users.
   * Si la Edge Function no responde, recurre a consultar directamente public.usuarios y su relación con negocios.
   */
  async obtenerUsuarios() {
    let sessionUser = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      sessionUser = sessionData?.session?.user;
      const accessToken = sessionData?.session?.access_token;

      // 1. Intentar consultar mediante Edge Function 'admin-usuarios' para traer correos de auth.users
      const { data, error } = await supabase.functions.invoke('admin-usuarios', {
        body: { action: 'listar' },
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!error && data?.ok && Array.isArray(data?.usuarios)) {
        return data.usuarios;
      }
      if (error) {
        console.warn('Edge Function admin-usuarios devolvió error:', error);
      }
    } catch (e) {
      console.warn('Excepción al consultar Edge Function admin-usuarios:', e);
    }

    // 2. Consulta fallback a public.usuarios
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener usuarios directamente:', error);
      throw new Error(error.message || 'Error al consultar los usuarios');
    }

    // Cargar datos de negocios para asociar a la lista de usuarios
    const negocioIds = [...new Set((usuarios || []).map((u) => u.negocio_id).filter(Boolean))];
    let negMap = {};
    if (negocioIds.length > 0) {
      try {
        const { data: negsData } = await supabase
          .from('negocios')
          .select('id, nombre, activo')
          .in('id', negocioIds);

        (negsData || []).forEach((n) => {
          negMap[n.id] = n;
        });
      } catch (_) {}
    }

    // Si el usuario en sesión coincide con auth_user_id, asociar su email conocido
    const resultado = (usuarios || []).map((u) => {
      let email = u.email || null;
      if (!email && sessionUser && sessionUser.id === u.auth_user_id) {
        email = sessionUser.email;
      }
      return {
        ...u,
        email,
        negocios: negMap[u.negocio_id] || null,
      };
    });

    return resultado;
  },

  /**
   * Obtiene la lista de usuarios pertenecientes a un negocio específico
   */
  async obtenerUsuariosPorNegocio(negocioId) {
    try {
      let query = supabase.from('usuarios').select('*');
      if (negocioId) {
        query = query.or(`negocio_id.eq.${negocioId},negocio_id.is.null`);
      }

      const [{ data: usuariosData }, { data: superadminData }] = await Promise.all([
        query.order('created_at', { ascending: false }),
        supabase.from('administradores_plataforma').select('*'),
      ]);

      const todos = [
        ...(usuariosData || []).map((u) => ({
          ...u,
          rol: u.rol || 'admin',
        })),
        ...(superadminData || []).map((s) => ({
          id: s.id,
          auth_user_id: s.auth_user_id,
          nombre: s.nombre || 'Super Administrador',
          rol: 'superadmin',
        })),
      ];

      return todos;
    } catch (e) {
      console.warn('Error al obtener lista de usuarios en obtenerUsuariosPorNegocio:', e);
      return [];
    }
  },

  /**
   * Crea un usuario y su cuenta en Supabase Auth mediante la Edge Function 'admin-usuarios'.
   * No expone service_role_key en el cliente.
   */
  async crearUsuario({ email, password, nombre, rol, negocio_id, fecha_expiracion_acceso = null }) {
    if (!email || !password || !nombre || !rol || !negocio_id) {
      throw new Error('Todos los campos son obligatorios.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const ROLES_VALIDOS = ['admin', 'encargado', 'cajero', 'asistente', 'temporal', 'usuario'];
    if (!ROLES_VALIDOS.includes(rol)) {
      throw new Error(`El rol asignado no es válido. Opciones: ${ROLES_VALIDOS.join(', ')}.`);
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        action: 'crear',
        email: email.trim().toLowerCase(),
        password,
        nombre: nombre.trim(),
        rol,
        negocio_id,
        fecha_expiracion_acceso: fecha_expiracion_acceso || null,
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    if (error) {
      let errorMsg = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          if (errBody?.error) {
            errorMsg = errBody.error;
          }
        }
      } catch (_) {
        // En caso de que no se pueda parsear el context
      }
      console.error('Error invocando Edge Function admin-usuarios:', errorMsg);
      throw new Error(errorMsg || 'Error al conectar con la función de creación de usuarios');
    }

    if (!data?.ok) {
      throw new Error(data?.error || 'Error al registrar el usuario');
    }

    return data.usuario;
  },

  /**
   * Actualiza los datos de un usuario en public.usuarios.
   */
  async actualizarUsuario(id, { nombre, rol, negocio_id, activo, fecha_expiracion_acceso = null }) {
    const payload = {
      nombre: nombre.trim(),
      rol,
      negocio_id,
      activo: Boolean(activo),
      fecha_expiracion_acceso: fecha_expiracion_acceso || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al actualizar usuario:', error);
      throw new Error(error.message || 'Error al actualizar los datos del usuario');
    }

    return data;
  },

  /**
   * Cambia el estado activo / inactivo de un usuario.
   */
  async toggleEstadoUsuario(id, nuevoEstado) {
    const { data, error } = await supabase
      .from('usuarios')
      .update({
        activo: Boolean(nuevoEstado),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Error al cambiar estado del usuario:', error);
      throw new Error(error.message || 'Error al cambiar estado del usuario');
    }

    return data;
  },

  /**
   * Cambia la contraseña de un usuario en Supabase Auth mediante la Edge Function 'admin-usuarios'.
   */
  async cambiarPasswordUsuario({ authUserId, password }) {
    if (!authUserId) {
      throw new Error('ID de usuario inválido.');
    }
    if (!password || password.length < 6) {
      throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        action: 'cambiar_password',
        auth_user_id: authUserId,
        password,
      },
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });

    if (error) {
      let errorMsg = error.message;
      try {
        if (error.context && typeof error.context.json === 'function') {
          const errBody = await error.context.json();
          if (errBody?.error) {
            errorMsg = errBody.error;
          }
        }
      } catch (_) {}
      console.error('Error invocando cambiar_password en admin-usuarios:', errorMsg);
      throw new Error(errorMsg || 'Error al actualizar la contraseña del usuario');
    }

    if (!data?.ok) {
      throw new Error(data?.error || 'Error al actualizar la contraseña del usuario');
    }

    return data;
  },
};