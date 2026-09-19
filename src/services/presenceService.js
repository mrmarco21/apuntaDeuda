import { supabase } from '../lib/supabaseClient';

function getOrCreateDeviceToken() {
  if (typeof window === 'undefined') return 'server';
  let token = localStorage.getItem('device_session_token');
  if (!token) {
    token =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('device_session_token', token);
  }
  return token;
}

class PresenceService {
  constructor() {
    this.channel = null;
    this.controlChannel = null;
    this.presenceState = {};
    this.listeners = new Set();
    this.currentTrackData = null;
    this.heartbeatInterval = null;
    this.isVisibilityListenerAttached = false;
    this.isReconnecting = false;
    this.syncDebounceTimeout = null;
  }

  /**
   * Obtiene o genera el token único del dispositivo actual
   */
  getDeviceToken() {
    return getOrCreateDeviceToken();
  }

  /**
   * Inicia el pulso periódico continuo (cada 18s) para garantizar que Supabase nunca expire la presencia
   */
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      if (!this.currentTrackData) return;

      // Si el canal no está en estado 'joined', intentar recuperarlo
      if (!this.channel || this.channel.state !== 'joined') {
        try {
          await this.reconnectChannel();
        } catch (_) {}
        return;
      }

      try {
        await this.channel.track({
          ...this.currentTrackData,
          online_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[presenceService] Error en pulso de presencia, recuperando canal:', err);
        try {
          await this.reconnectChannel();
        } catch (_) {}
      }
    }, 18000);
  }

  /**
   * Detiene el pulso periódico
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Reconstruye el canal limpiando estados colgados en Supabase si se desconectó
   */
  async reconnectChannel() {
    if (this.isReconnecting) return this.channel;
    this.isReconnecting = true;
    try {
      if (this.channel) {
        try {
          await supabase.removeChannel(this.channel);
        } catch (_) {}
        this.channel = null;
      }
      const ch = await this.ensurePresenceChannel();
      if (ch && this.currentTrackData) {
        try {
          await ch.track(this.currentTrackData);
        } catch (_) {}
      }
      return ch;
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Escucha cuando el usuario vuelve a enfocar la pestaña o desbloquea el celular
   */
  attachVisibilityListener() {
    if (this.isVisibilityListenerAttached || typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        // 1. En cuanto el usuario vuelve a la pantalla, refrescar presencia inmediatamente
        if (this.currentTrackData) {
          try {
            await this.ensurePresenceChannel();
            if (this.channel && this.channel.state === 'joined') {
              await this.channel.track({
                ...this.currentTrackData,
                online_at: new Date().toISOString(),
              });
            } else {
              await this.reconnectChannel();
            }
          } catch (_) {}
          this.startHeartbeat();
        }

        // 2. Si este cliente tiene escuchadores (ej: Superadmin), sincronizar inmediatamente el estado
        if (this.channel && this.listeners.size > 0) {
          try {
            this.presenceState = this.channel.presenceState();
            this.notifyListeners();
          } catch (_) {}
        }
      }
    });

    this.isVisibilityListenerAttached = true;
  }

  /**
   * Procesa cambios de presencia con debounce para fusionar los eventos diff (leave + join) de Phoenix
   */
  handlePresenceUpdate() {
    if (this.syncDebounceTimeout) {
      clearTimeout(this.syncDebounceTimeout);
    }
    this.syncDebounceTimeout = setTimeout(() => {
      if (this.channel) {
        this.presenceState = this.channel.presenceState();
        this.notifyListeners();
      }
    }, 80);
  }

  /**
   * Asegura que el canal de presencia global esté creado y suscrito para recibir estados
   */
  async ensurePresenceChannel() {
    if (this.channel && (this.channel.state === 'joined' || this.channel.state === 'joining')) {
      return this.channel;
    }

    if (!this.channel) {
      this.channel = supabase.channel('online-presence');

      this.channel
        .on('presence', { event: 'sync' }, () => {
          this.handlePresenceUpdate();
        })
        .on('presence', { event: 'join' }, () => {
          this.handlePresenceUpdate();
        })
        .on('presence', { event: 'leave' }, () => {
          this.handlePresenceUpdate();
        });

      await new Promise((resolve) => {
        this.channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            this.presenceState = this.channel.presenceState();
            // Si ya hay datos de usuario (por ejemplo en una reconexión de red), re-trackear automáticamente
            if (this.currentTrackData) {
              try {
                await this.channel.track(this.currentTrackData);
              } catch (_) {}
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('[presenceService] Estado de canal:', status, 'reintentando conexión...');
            setTimeout(() => {
              if (this.currentTrackData || this.listeners.size > 0) {
                this.reconnectChannel();
              }
            }, 2000);
          }
          resolve(status);
        });
      });
    } else if (this.channel.state !== 'joined') {
      await this.channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && this.currentTrackData) {
          try {
            await this.channel.track(this.currentTrackData);
          } catch (_) {}
        }
      });
    }

    return this.channel;
  }

  /**
   * Inicializa la presencia para el usuario autenticado actual
   */
  async trackPresence(userData) {
    if (!userData || !userData.user_id) return;

    const deviceToken = getOrCreateDeviceToken();
    const fallbackNegocioId =
      userData.negocio_id ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('active_negocio_id') : null) ||
      null;

    this.currentTrackData = {
      user_id: userData.user_id,
      email: userData.email || '',
      nombre: userData.nombre || userData.email || 'Usuario',
      negocio_id: fallbackNegocioId,
      negocio_nombre: userData.negocio_nombre || 'Sin Negocio',
      rol: userData.rol || 'admin',
      current_page: userData.current_page || (typeof window !== 'undefined' ? window.location.pathname : '/'),
      user_agent: userData.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      device_token: deviceToken,
      online_at: new Date().toISOString(),
    };

    await this.ensurePresenceChannel();
    if (this.channel && this.currentTrackData) {
      try {
        await this.channel.track(this.currentTrackData);
      } catch (_) {}
      this.startHeartbeat();
      this.attachVisibilityListener();
    }
  }

  /**
   * Verifica si un usuario ya tiene una sesión activa en otro dispositivo en tiempo real
   */
  isUserOnlineInAnotherDevice(userId) {
    if (!userId) return false;
    const myToken = getOrCreateDeviceToken();
    const onlineList = this.getOnlineUsers();
    return onlineList.some(
      (u) => (u.user_id === userId || u.auth_user_id === userId) && u.device_token && u.device_token !== myToken
    );
  }

  /**
   * Escucha mensajes de control de sesión (expulsión en tiempo real)
   */
  initSessionControl(userId, onKicked) {
    if (!userId) return;
    const myToken = getOrCreateDeviceToken();

    if (this.controlChannel) {
      supabase.removeChannel(this.controlChannel);
      this.controlChannel = null;
    }

    this.controlChannel = supabase.channel(`session-control-${userId}`);

    this.controlChannel
      .on('broadcast', { event: 'kick_device' }, (payload) => {
        const data = payload?.payload || {};
        if (data.userId === userId && data.deviceToken !== myToken) {
          if (typeof onKicked === 'function') {
            onKicked(data.reason || 'Tu sesión fue cerrada porque ingresaste desde otro dispositivo.');
          }
        }
      })
      .subscribe();
  }

  /**
   * Envía señal de expulsión en tiempo real a otros dispositivos abiertos de este usuario
   */
  async kickOtherDevices(userId) {
    if (!userId) return;
    const myToken = getOrCreateDeviceToken();
    const tempChannel = supabase.channel(`session-control-${userId}`);

    await tempChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await tempChannel.send({
          type: 'broadcast',
          event: 'kick_device',
          payload: {
            userId,
            deviceToken: myToken,
            reason: 'Tu sesión ha sido cerrada porque ingresaste desde otro dispositivo.',
          },
        });
        setTimeout(() => {
          supabase.removeChannel(tempChannel);
        }, 1200);
      }
    });
  }

  /**
   * Actualiza la ubicación (ruta/página) del usuario actual
   */
  async updateLocation(pathName, extraData = {}) {
    if (!this.channel) {
      await this.ensurePresenceChannel();
    }

    const fallbackNegocioId =
      extraData.negocio_id ||
      this.currentTrackData?.negocio_id ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('active_negocio_id') : null) ||
      null;

    const fallbackNegocioNombre =
      extraData.negocio_nombre ||
      this.currentTrackData?.negocio_nombre ||
      'Sin Negocio';

    this.currentTrackData = {
      ...(this.currentTrackData || {}),
      ...extraData,
      negocio_id: fallbackNegocioId,
      negocio_nombre: fallbackNegocioNombre,
      current_page: pathName,
      online_at: new Date().toISOString(),
    };

    if (this.channel && this.channel.state === 'joined') {
      try {
        await this.channel.track(this.currentTrackData);
      } catch (err) {
        console.warn('[presenceService] Error enviando actualización de ruta:', err);
      }
    } else {
      this.ensurePresenceChannel().then(async (ch) => {
        if (ch && ch.state === 'joined' && this.currentTrackData) {
          try {
            await ch.track(this.currentTrackData);
          } catch (_) {}
        }
      });
    }
  }

  /**
   * Suscribe un callback para recibir cambios en la presencia global
   */
  subscribePresence(callback) {
    this.listeners.add(callback);
    callback(this.getOnlineUsers());

    return () => {
      this.listeners.delete(callback);
    };
  }

  notifyListeners() {
    const onlineList = this.getOnlineUsers();
    this.listeners.forEach((cb) => cb(onlineList));
  }

  /**
   * Retorna una lista plana de todos los usuarios actualmente en línea
   */
  getOnlineUsers() {
    const onlineUsers = [];
    Object.keys(this.presenceState).forEach((key) => {
      const presences = this.presenceState[key];
      if (Array.isArray(presences) && presences.length > 0) {
        const latest = presences[presences.length - 1];
        onlineUsers.push(latest);
      }
    });
    return onlineUsers;
  }

  /**
   * Abandona la presencia al cerrar sesión
   */
  async leavePresence() {
    this.stopHeartbeat();
    if (this.controlChannel) {
      await supabase.removeChannel(this.controlChannel);
      this.controlChannel = null;
    }
    if (this.channel) {
      try {
        await this.channel.untrack();
      } catch (_) {}
      this.currentTrackData = null;
    }
  }
}

export const presenceService = new PresenceService();
if (typeof window !== 'undefined') {
  presenceService.ensurePresenceChannel().catch(() => {});
}

