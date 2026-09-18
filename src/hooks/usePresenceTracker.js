import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { presenceService } from '../services/presenceService';

/**
 * Hook para rastrear la presencia del usuario autenticado en la plataforma
 */
export function usePresenceTracker() {
  const { session, usuario, negocioActual, esSuperadmin } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!session?.user) {
      presenceService.leavePresence();
      return;
    }

    const userData = {
      user_id: session.user.id,
      email: session.user.email || '',
      nombre: usuario?.nombre || session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
      negocio_id: negocioActual?.id || usuario?.negocio_id || null,
      negocio_nombre: negocioActual?.nombre || 'Superadmin',
      rol: esSuperadmin ? 'superadmin' : (usuario?.rol || 'admin'),
      current_page: location.pathname,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    presenceService.trackPresence(userData);
  }, [session?.user?.id, usuario?.id, negocioActual?.id, esSuperadmin]);

  // Actualizar la ubicación cada vez que navega a una nueva ruta
  useEffect(() => {
    if (session?.user) {
      presenceService.updateLocation(location.pathname);
    }
  }, [location.pathname, session?.user?.id]);
}
