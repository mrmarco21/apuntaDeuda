import { supabase } from '../lib/supabaseClient';

export const negociosService = {
  /**
   * Obtiene la lista completa de negocios registrados en la plataforma.
   */
  async obtenerNegocios() {
    const { data, error } = await supabase
      .from('negocios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener negocios:', error);
      throw new Error(error.message || 'Error al cargar los negocios');
    }

    return data || [];
  },

  /**
   * Obtiene un negocio por su ID.
   */
  async obtenerNegocioPorId(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from('negocios')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Error al obtener negocio por ID:', error);
      return null;
    }

    return data;
  },

  /**
   * Crea un nuevo registro en la tabla negocios.
   * Utiliza la columna oficial 'logo_url' y extrae 'creado_por' desde el usuario autenticado.
   */
  async crearNegocio({ nombre, logo_url = '', activo = true }) {
    // Obtener UID del usuario autenticado de la sesión actual
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    let userId = sessionData?.session?.user?.id;

    if (!userId || sessionError) {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        throw new Error('No se detectó una sesión activa en Supabase. Inicia sesión nuevamente.');
      }
      userId = authData.user.id;
    }

    const payload = {
      nombre: nombre.trim(),
      logo_url: logo_url?.trim() || null,
      activo: Boolean(activo),
      creado_por: userId,
    };

    const { data, error } = await supabase
      .from('negocios')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error al crear negocio en Supabase:', error);
      throw new Error(error.message || 'Error al registrar el negocio');
    }

    return data;
  },

  /**
   * Actualiza los datos de un negocio existente.
   */
  async actualizarNegocio(id, { nombre, logo_url = '', activo = true }) {
    const payload = {
      nombre: nombre.trim(),
      logo_url: logo_url?.trim() || null,
      activo: Boolean(activo),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('negocios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al actualizar negocio en Supabase:', error);
      throw new Error(error.message || 'Error al actualizar el negocio');
    }

    return data;
  },

  /**
   * Cambia el estado activo / inactivo de un negocio.
   */
  async toggleEstadoNegocio(id, nuevoEstado) {
    const { data, error } = await supabase
      .from('negocios')
      .update({
        activo: Boolean(nuevoEstado),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error al cambiar estado del negocio:', error);
      throw new Error(error.message || 'Error al cambiar estado del negocio');
    }

    return data;
  },
};
