import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { auditService } from '../services/auditService';
import { presenceService } from '../services/presenceService';
import { cacheManager } from '../lib/cacheManager';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null); // fila de la tabla "usuarios" (negocio_id, rol, etc.)
  const [negocioActual, setNegocioActual] = useState(null); // fila de la tabla "negocios" (nombre, logo_url, etc.)
  const [esSuperadmin, setEsSuperadmin] = useState(false);
  const [loadingSuperadmin, setLoadingSuperadmin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [bloqueoInfo, setBloqueoInfo] = useState(null); // { bloqueado: true, tipo: 'usuario_inactivo'|'negocio_inactivo'|'sin_asignacion'|'sesion_expulsada', titulo, mensaje, negocioNombre }

  const isAuthenticatingRef = useRef(false);

  /**
   * Consulta la función RPC de Supabase para verificar si el usuario es superadmin de la plataforma.
   */
  const verificarSuperadmin = async () => {
    try {
      setLoadingSuperadmin(true);
      const { data, error } = await supabase.rpc('usuario_es_superadmin');
      if (error) {
        console.warn('Error al verificar superadmin:', error.message);
        setEsSuperadmin(false);
        return false;
      }
      const esAdmin = Boolean(data);
      setEsSuperadmin(esAdmin);
      return esAdmin;
    } catch (e) {
      console.warn('Excepción al verificar superadmin:', e);
      setEsSuperadmin(false);
      return false;
    } finally {
      setLoadingSuperadmin(false);
    }
  };

  /**
   * Carga los datos del negocio activo actual.
   */
  const cargarNegocio = async (negocioId) => {
    if (!negocioId) {
      setNegocioActual(null);
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', negocioId)
        .maybeSingle();

      if (!error && data) {
        setNegocioActual(data);
        return data;
      } else {
        setNegocioActual(null);
        return null;
      }
    } catch (e) {
      console.warn('Error al cargar negocio en AuthContext:', e);
      setNegocioActual(null);
      return null;
    }
  };

  /**
   * Carga el usuario y su negocio asociado, validando que ambos se encuentren ACTIVOS.
   * Si alguno está inactivo, retorna un objeto descriptivo del bloqueo con el nombre del negocio.
   */
  const cargarUsuario = async (authUserId, targetNegocioId = null, authUserMeta = null) => {
    try {
      const activeNegocioId = targetNegocioId || localStorage.getItem('active_negocio_id');
      let usuarios = [];

      // 1. Consultar registros en public.usuarios (sin joins de PostgREST para evitar HTTP 400 por falta de FK en cache)
      const { data: directData, error: errList } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .order('created_at', { ascending: false });

      if (errList) {
        console.warn('Advertencia al consultar usuarios directamente:', errList.message);
      }

      if (directData && directData.length > 0) {
        usuarios = directData;

        // Cargar datos de negocios para asociar a los usuarios encontrados
        const negocioIds = [...new Set(usuarios.map((u) => u.negocio_id).filter(Boolean))];
        if (negocioIds.length > 0) {
          try {
            const { data: negsData } = await supabase
              .from('negocios')
              .select('*')
              .in('id', negocioIds);

            const negMap = {};
            (negsData || []).forEach((n) => {
              negMap[n.id] = n;
            });

            usuarios.forEach((u) => {
              u.negocios = negMap[u.negocio_id] || null;
            });
          } catch (negErr) {
            console.warn('Error al cargar relacion de negocios:', negErr);
          }
        }
      }

      // 2. Fallback inteligente usando user_metadata de Auth (cuando RLS oculta registros de usuarios inactivos)
      if (usuarios.length === 0 && authUserMeta?.negocio_id) {
        let negocioNombre = authUserMeta.negocio_nombre || authUserMeta.nombre_negocio || null;
        if (!negocioNombre) {
          try {
            const { data: negData } = await supabase
              .from('negocios')
              .select('id, nombre, activo')
              .eq('id', authUserMeta.negocio_id)
              .maybeSingle();
            if (negData?.nombre) {
              negocioNombre = negData.nombre;
            }
          } catch (_) {}
        }

        setUsuario(null);
        setNegocioActual(null);
        return {
          bloqueado: true,
          tipo: 'usuario_inactivo',
          titulo: 'Cuenta de Usuario Desactivada',
          mensaje: `Tu cuenta de usuario (${authUserMeta.nombre || 'asignada'}) se encuentra desactivada. Comunícate con el soporte técnico o con el administrador de tu negocio para reactivarla.`,
          negocioNombre: negocioNombre || null,
        };
      }

      // 4. Caso: El usuario no tiene ningún registro de negocio asociado
      if (!usuarios || usuarios.length === 0) {
        setUsuario(null);
        setNegocioActual(null);
        return {
          bloqueado: true,
          tipo: 'sin_asignacion',
          titulo: 'Sin Negocio Asignado',
          mensaje: 'Tu cuenta de usuario no tiene asignado ningún negocio o tienda en la plataforma. Por favor, comunícate con el soporte técnico.',
          negocioNombre: null,
        };
      }

      // 5. Caso: Todos los registros de usuario están inactivos
      const todosInactivos = usuarios.every((u) => u.activo === false);
      if (todosInactivos) {
        const u = usuarios[0];
        setUsuario(null);
        setNegocioActual(null);
        return {
          bloqueado: true,
          tipo: 'usuario_inactivo',
          titulo: 'Cuenta de Usuario Desactivada',
          mensaje: `Tu cuenta de usuario (${u.nombre || 'asignada'}) se encuentra desactivada. Comunícate con el soporte técnico o con el administrador de tu negocio para reactivarla.`,
          negocioNombre: u.negocios?.nombre || null,
        };
      }

      // Seleccionar el registro adecuado (según negocio guardado o el primero activo)
      let candidato = null;
      if (activeNegocioId) {
        candidato = usuarios.find((u) => u.negocio_id === activeNegocioId);
      }
      if (!candidato) {
        candidato = usuarios.find((u) => u.activo !== false) || usuarios[0];
      }

      // 6. Caso: El usuario específico seleccionado está inactivo
      if (candidato.activo === false) {
        setUsuario(null);
        setNegocioActual(null);
        return {
          bloqueado: true,
          tipo: 'usuario_inactivo',
          titulo: 'Cuenta de Usuario Desactivada',
          mensaje: `Tu cuenta de usuario (${candidato.nombre || 'asignada'}) se encuentra desactivada. Comunícate con el soporte técnico o con el administrador de tu negocio para reactivarla.`,
          negocioNombre: candidato.negocios?.nombre || null,
        };
      }

      // 7. Caso: El negocio asignado está inactivo o suspendido
      if (candidato.negocios && candidato.negocios.activo === false) {
        setUsuario(null);
        setNegocioActual(null);
        return {
          bloqueado: true,
          tipo: 'negocio_inactivo',
          titulo: 'Negocio Temporalmente Inactivo',
          mensaje: `El negocio "${candidato.negocios.nombre || 'asignado'}" se encuentra inactivo o suspendido en la plataforma. Comunícate con el soporte técnico para restablecer el servicio.`,
          negocioNombre: candidato.negocios.nombre || null,
        };
      }

      // 7.5. Caso: La suscripción del negocio ha alcanzado su fecha de vencimiento (excepto Plan Vitalicio)
      if (
        candidato.negocios &&
        candidato.negocios.plan !== 'vitalicio' &&
        candidato.negocios.fecha_vencimiento
      ) {
        const fechaVenc = new Date(candidato.negocios.fecha_vencimiento);
        if (fechaVenc < new Date()) {
          setUsuario(null);
          setNegocioActual(null);
          return {
            bloqueado: true,
            tipo: 'suscripcion_vencida',
            titulo: 'Suscripción o Periodo de Prueba Vencido',
            mensaje: `El periodo de servicio o suscripción de "${candidato.negocios.nombre || 'tu negocio'}" ha vencido. Comunícate con el soporte técnico de ApuntaDeuda para renovar tu acceso.`,
            negocioNombre: candidato.negocios.nombre || null,
          };
        }
      }

      // 8. Usuario y Negocio válidos y activos
      setUsuario(candidato);
      setNegocioActual(candidato.negocios || null);
      localStorage.setItem('active_negocio_id', candidato.negocio_id);
      return candidato;
    } catch (e) {
      console.error('Error en cargarUsuario:', e);
      setUsuario(null);
      setNegocioActual(null);
      return null;
    }
  };

  // Escuchar la señal de expulsión cuando se inicia sesión en otro dispositivo
  useEffect(() => {
    if (session?.user?.id) {
      presenceService.initSessionControl(session.user.id, (mensajeReason) => {
        setBloqueoInfo({
          bloqueado: true,
          tipo: 'sesion_expulsada',
          titulo: 'Sesión Cerrada en este Dispositivo',
          mensaje: mensajeReason || 'Tu sesión se cerró porque ingresaste desde otro dispositivo.',
          negocioNombre: null,
        });
        logout();
      });
    }
  }, [session?.user?.id]);

  useEffect(() => {
    // Sesión al cargar la app
    supabase.auth.getSession().then(async ({ data: { session: ses } }) => {
      if (ses?.user) {
        const esAdmin = await verificarSuperadmin();
        if (esAdmin) {
          setSession(ses);
          setLoading(false);
          return;
        }

        const userRes = await cargarUsuario(ses.user.id, null, ses.user.user_metadata);
        if (userRes?.bloqueado) {
          setBloqueoInfo(userRes);
          setSession(null);
          setUsuario(null);
          setNegocioActual(null);
          localStorage.removeItem('active_negocio_id');
          await supabase.auth.signOut();
        } else {
          setSession(ses);
        }
        setLoading(false);
      } else {
        setSession(null);
        setEsSuperadmin(false);
        setLoadingSuperadmin(false);
        setLoading(false);
      }
    });

    // Escuchar cambios (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, ses) => {
      // Si login() ya está procesando de manera síncrona, no duplicar la verificación
      if (isAuthenticatingRef.current) {
        return;
      }

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUsuario(null);
        setNegocioActual(null);
        setEsSuperadmin(false);
        setLoadingSuperadmin(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (ses) setSession(ses);
        return;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const login = async (email, password, { force = false } = {}) => {
    isAuthenticatingRef.current = true;
    try {
      setBloqueoInfo(null);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { data: null, error };
      }

      if (data?.user) {
        // 1. Verificar si es Superadmin (Superadmin no se restringe a 1 solo dispositivo)
        const esAdmin = await verificarSuperadmin();
        if (esAdmin) {
          setSession(data.session);
          setBloqueoInfo(null);
          auditService.registrarAcceso({
            auth_user_id: data.user.id,
            email: data.user.email,
            nombre_usuario: 'Superadmin',
          });
          return { data, error: null, esSuperadmin: true };
        }

        // 2. Verificar si el usuario ya tiene una sesión abierta en otro dispositivo en tiempo real
        await presenceService.ensurePresenceChannel();
        const tieneOtraSesionActiva = presenceService.isUserOnlineInAnotherDevice(data.user.id);
        if (tieneOtraSesionActiva && !force) {
          // Desconectar temporalmente de Supabase para no dejar estado guardado
          await supabase.auth.signOut();
          return {
            data: null,
            error: null,
            requiereConfirmacion: true,
            email,
            password,
          };
        }

        // Enviar señal para expulsar inmediatamente cualquier otra sesión abierta en otro dispositivo
        await presenceService.kickOtherDevices(data.user.id);

        // 3. Verificar estado activo de Usuario y Negocio
        const userRes = await cargarUsuario(data.user.id, null, data.user.user_metadata);
        if (userRes?.bloqueado) {
          setBloqueoInfo(userRes);
          setSession(null);
          setUsuario(null);
          setNegocioActual(null);
          localStorage.removeItem('active_negocio_id');
          await supabase.auth.signOut();
          return {
            data: null,
            error: { message: userRes.mensaje, code: userRes.tipo },
            bloqueoInfo: userRes,
            esSuperadmin: false,
          };
        }

        setSession(data.session);
        auditService.registrarAcceso({
          auth_user_id: data.user.id,
          usuario_id: userRes?.id || null,
          negocio_id: userRes?.negocio_id || null,
          email: data.user.email,
          nombre_usuario: userRes?.nombre || data.user.email,
        });
        return { data, error: null, esSuperadmin: false };
      }

      return { data, error };
    } finally {
      isAuthenticatingRef.current = false;
    }
  };

  const logout = async () => {
    cacheManager.clear();
    localStorage.removeItem('active_negocio_id');
    setEsSuperadmin(false);
    setUsuario(null);
    setNegocioActual(null);
    setBloqueoInfo(null);
    await supabase.auth.signOut();
  };

  const limpiarBloqueo = () => {
    setBloqueoInfo(null);
  };

  /**
   * Cambia el negocio activo en el contexto y en el almacenamiento local.
   */
  const cambiarNegocio = async (nuevoNegocioId) => {
    if (!session?.user) return null;
    cacheManager.clear();
    localStorage.setItem('active_negocio_id', nuevoNegocioId);
    return await cargarUsuario(session.user.id, nuevoNegocioId);
  };

  /**
   * Actualiza el estado local de negocioActual inmediatamente.
   */
  const actualizarNegocioActual = (datosActualizados) => {
    setNegocioActual((prev) => (prev ? { ...prev, ...datosActualizados } : datosActualizados));
  };

  /**
   * Recarga los datos del negocio actual desde Supabase.
   */
  const recargarNegocioActual = async () => {
    if (usuario?.negocio_id) {
      return await cargarNegocio(usuario.negocio_id);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        usuario,
        negocioActual,
        esSuperadmin,
        loading,
        loadingSuperadmin,
        bloqueoInfo,
        limpiarBloqueo,
        verificarSuperadmin,
        login,
        logout,
        cargarUsuario,
        cambiarNegocio,
        actualizarNegocioActual,
        recargarNegocioActual,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

