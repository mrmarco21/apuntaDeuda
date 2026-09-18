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
  }

  /**
   * Obtiene o genera el token único del dispositivo actual
   */
  getDeviceToken() {
    return getOrCreateDeviceToken();
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
          this.presenceState = this.channel.presenceState();
          this.notifyListeners();
        })
        .on('presence', { event: 'join' }, () => {
          this.presenceState = this.channel.presenceState();
          this.notifyListeners();
        })
        .on('presence', { event: 'leave' }, () => {
          this.presenceState = this.channel.presenceState();
          this.notifyListeners();
        });

      await new Promise((resolve) => {
        this.channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.presenceState = this.channel.presenceState();
          }
          resolve(status);
        });
      });
    } else if (this.channel.state !== 'joined') {
      await this.channel.subscribe();
    }

    return this.channel;
  }

  /**
   * Inicializa la presencia para el usuario autenticado actual
   */
  async trackPresence(userData) {
    if (!userData || !userData.user_id) return;

    const deviceToken = getOrCreateDeviceToken();

    this.currentTrackData = {
      user_id: userData.user_id,
      email: userData.email || '',
      nombre: userData.nombre || userData.email || 'Usuario',
      negocio_id: userData.negocio_id || null,
      negocio_nombre: userData.negocio_nombre || 'Sin Negocio',
      rol: userData.rol || 'admin',
      current_page: userData.current_page || window.location.pathname,
      user_agent: userData.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : ''),
      device_token: deviceToken,
      online_at: new Date().toISOString(),
    };

    await this.ensurePresenceChannel();
    if (this.channel && this.currentTrackData) {
      await this.channel.track(this.currentTrackData);
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
  async updateLocation(pathName) {
    if (!this.currentTrackData || !this.channel) return;
    this.currentTrackData = {
      ...this.currentTrackData,
      current_page: pathName,
      online_at: new Date().toISOString(),
    };
    if (this.channel.state === 'joined') {
      await this.channel.track(this.currentTrackData);
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

