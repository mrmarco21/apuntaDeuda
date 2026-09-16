import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { session, loading, loadingSuperadmin, esSuperadmin, usuario, negocioActual } = useAuth();

  if (loading || loadingSuperadmin) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-background, #F5F6F8)'
      }}>
        <LoadingSpinner text="Validando permisos de acceso..." />
      </div>
    );
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