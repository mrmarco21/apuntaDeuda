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
      .select(`
        id,
        negocio_id,
        auth_user_id,
        nombre,
        rol,
        activo,
        created_at,
        updated_at,
        negocios:negocio_id (
          id,
          nombre,
          activo
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener usuarios directamente:', error);
      throw new Error(error.message || 'Error al consultar los usuarios');
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
      };
    });

    return resultado;
  },

  /**
   * Crea un usuario y su cuenta en Supabase Auth mediante la Edge Function 'admin-usuarios'.
   * No expone service_role_key en el cliente.
   */
  async crearUsuario({ email, password, nombre, rol, negocio_id }) {
    if (!email || !password || !nombre || !rol || !negocio_id) {
      throw new Error('Todos los campos son obligatorios.');
    }

    if (password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    if (!['admin', 'usuario'].includes(rol)) {
      throw new Error('El rol asignado debe ser "admin" o "usuario".');
    }

    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        action: 'crear',
        email: email.trim().toLowerCase(),
        password,
        nombre: nombre.trim(),
        rol,
        negocio_id,
      },
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
  async actualizarUsuario(id, { nombre, rol, negocio_id, activo }) {
    const payload = {
      nombre: nombre.trim(),
      rol,
      negocio_id,
      activo: Boolean(activo),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select(`
        id,
        negocio_id,
        auth_user_id,
        nombre,
        rol,
        activo,
        created_at,
        updated_at,
        negocios:negocio_id (
          id,
          nombre,
          activo
        )
      `)
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
      .select(`
        id,
        negocio_id,
        auth_user_id,
        nombre,
        rol,
        activo,
        created_at,
        updated_at,
        negocios:negocio_id (
          id,
          nombre,
          activo
        )
      `)
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

    const { data, error } = await supabase.functions.invoke('admin-usuarios', {
      body: {
        action: 'cambiar_password',
        auth_user_id: authUserId,
        password,
      },
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

