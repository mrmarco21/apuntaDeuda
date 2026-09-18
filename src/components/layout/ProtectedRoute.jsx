import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { session, loading, loadingSuperadmin, esSuperadmin, usuario, negocioActual } = useAuth();

  if (loading || loadingSuperadmin) {
    return <LoadingSpinner screen="auth" text="Validando permisos de acceso..." fullPage />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Si no es superadmin, verificar que el usuario y negocio estén activos
  if (!esSuperadmin) {
    if (!usuario || usuario.activo === false || !negocioActual || negocioActual.activo === false) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
