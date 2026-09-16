// supabase/functions/admin-usuarios/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Manejo de preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obtener y validar header de autorización
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'No autorizado: falta encabezado de autorización' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Configuración incompleta del servidor Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cliente administrativo con service_role_key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Validar token del usuario llamante directamente con supabaseAdmin
    const { data: authData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !authData?.user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Sesión no válida o expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const callerUser = authData.user;

    // Verificar en public.administradores_plataforma que activo = true
    const { data: superadminRecord, error: superadminErr } = await supabaseAdmin
      .from('administradores_plataforma')
      .select('id, activo')
      .eq('auth_user_id', callerUser.id)
      .maybeSingle();

    if (superadminErr || !superadminRecord || !superadminRecord.activo) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Acceso denegado: solo superadministradores activos pueden realizar esta operación',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Leer y procesar la acción solicitada
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ACCIÓN: Listar usuarios con sus correos de Auth
    if (action === 'listar') {
      const { data: usuariosList, error: listError } = await supabaseAdmin
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

      if (listError) {
        return new Response(
          JSON.stringify({ ok: false, error: listError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Obtener correos de auth.users usando el cliente admin
      const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers();
      const emailMap = new Map();
      authUsersData?.users?.forEach((u: { id: string; email?: string }) => {
        if (u.email) emailMap.set(u.id, u.email);
      });

      const usuariosEnriquecidos = (usuariosList || []).map((u: any) => ({
        ...u,
        email: emailMap.get(u.auth_user_id) || null,
      }));

      return new Response(
        JSON.stringify({ ok: true, usuarios: usuariosEnriquecidos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACCIÓN: Crear usuario en Auth y en public.usuarios
    if (action === 'crear') {
      const { email, password, nombre, rol, negocio_id } = body;

      if (!email || !password || !nombre || !rol || !negocio_id) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Datos incompletos: todos los campos son obligatorios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['admin', 'usuario'].includes(rol)) {
        return new Response(
          JSON.stringify({ ok: false, error: 'El rol debe ser "admin" o "usuario"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ ok: false, error: 'La contraseña debe tener al menos 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4.1. Verificar existencia y estado del negocio
      const { data: negocio, error: negErr } = await supabaseAdmin
        .from('negocios')
        .select('id, nombre, activo')
        .eq('id', negocio_id)
        .maybeSingle();

      if (negErr || !negocio) {
        return new Response(
          JSON.stringify({ ok: false, error: 'El negocio seleccionado no existe' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!negocio.activo) {
        return new Response(
          JSON.stringify({ ok: false, error: 'El negocio seleccionado se encuentra inactivo o pausado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 4.2. Crear usuario en Supabase Auth
      const { data: newAuthUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          nombre: nombre.trim(),
          negocio_id,
          negocio_nombre: negocio.nombre,
        },
      });

      if (authCreateError) {
        let mensaje = authCreateError.message;
        if (mensaje.includes('already registered') || mensaje.includes('already exists')) {
          mensaje = 'El correo electrónico ya está registrado en la plataforma.';
        }
        return new Response(
          JSON.stringify({ ok: false, error: mensaje }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const authUserId = newAuthUser.user.id;

      // 4.3. Crear registro en la tabla public.usuarios
      const { data: nuevoRegistro, error: insertError } = await supabaseAdmin
        .from('usuarios')
        .insert([
          {
            negocio_id,
            auth_user_id: authUserId,
            nombre: nombre.trim(),
            rol,
            activo: true,
          },
        ])
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

      if (insertError) {
        // Revertir la creación en auth para no dejar usuario huérfano
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        return new Response(
          JSON.stringify({ ok: false, error: `Error al vincular usuario: ${insertError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          usuario: {
            ...nuevoRegistro,
            email: newAuthUser.user.email,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ACCIÓN: Cambiar contraseña de un usuario en Supabase Auth
    if (action === 'cambiar_password') {
      const { auth_user_id, password } = body;

      if (!auth_user_id || !password) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Faltan datos requeridos (ID de usuario o nueva contraseña)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (password.length < 6) {
        return new Response(
          JSON.stringify({ ok: false, error: 'La nueva contraseña debe tener al menos 6 caracteres' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Actualizar la contraseña en Supabase Auth
      const { data: updatedAuthUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        auth_user_id,
        { password: password }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ ok: false, error: `Error al actualizar contraseña: ${updateError.message}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Contraseña actualizada correctamente',
          user_id: updatedAuthUser.user.id,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: false, error: `Operación "${action}" no reconocida` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ ok: false, error: err.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
