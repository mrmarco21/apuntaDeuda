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

    const activeNegId =
      negocioActual?.id ||
      usuario?.negocio_id ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('active_negocio_id') : null) ||
      null;

    const activeNegNombre =
      negocioActual?.nombre ||
      usuario?.negocios?.nombre ||
      (esSuperadmin ? 'Superadmin' : 'Mi Negocio');

    const userData = {
      user_id: session.user.id,
      email: session.user.email || '',
      nombre: usuario?.nombre || session.user.user_metadata?.nombre || session.user.email?.split('@')[0] || 'Usuario',
      negocio_id: activeNegId,
      negocio_nombre: activeNegNombre,
      rol: esSuperadmin ? 'superadmin' : (usuario?.rol || 'admin'),
      current_page: location.pathname,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    presenceService.trackPresence(userData);
  }, [session?.user?.id, usuario?.id, negocioActual?.id, esSuperadmin]);

  // Actualizar la ubicación cada vez que navega a una nueva ruta con debounce
  useEffect(() => {
    if (!session?.user) return;

    const activeNegId =
      negocioActual?.id ||
      usuario?.negocio_id ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('active_negocio_id') : null) ||
      null;

    const activeNegNombre =
      negocioActual?.nombre ||
      usuario?.negocios?.nombre ||
      (esSuperadmin ? 'Superadmin' : 'Mi Negocio');

    const timer = setTimeout(() => {
      presenceService.updateLocation(location.pathname, {
        negocio_id: activeNegId,
        negocio_nombre: activeNegNombre,
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [location.pathname, session?.user?.id, negocioActual?.id, usuario?.negocio_id, esSuperadmin]);
}
