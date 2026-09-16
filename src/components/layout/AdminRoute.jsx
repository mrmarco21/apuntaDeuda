import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner/LoadingSpinner';

/**
 * Componente de protección de rutas exclusivo para el área de superadministrador (/admin).
 * Verifica la sesión activa y el resultado de la función RPC public.usuario_es_superadmin().
 * Si no es superadmin, rechaza y redirige a la aplicación normal del negocio (/).
 */
export default function AdminRoute({ children }) {
  const { session, esSuperadmin, loading, loadingSuperadmin } = useAuth();

  // Esperar a que concluyan tanto la validación de sesión como la verificación de superadmin
  if (loading || loadingSuperadmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background, #F5F6F8)'
      }}>
        <LoadingSpinner text="Verificando permisos de superadministrador..." />
      </div>
    );
  }

  // Si no está autenticado, enviar a login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Si no tiene privilegios de superadmin en la plataforma, rechazar y enviar al área normal de negocio
  if (!esSuperadmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
