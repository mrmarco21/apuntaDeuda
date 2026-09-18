import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';

export default function PermissionRoute({ module, children }) {
  const { hasModuleAccess, expirado } = usePermissions();

  if (expirado || !hasModuleAccess(module)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
