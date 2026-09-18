import { useAuth } from '../context/AuthContext';

const ROLE_PERMISSIONS = {
  superadmin: ['*'],
  admin: ['*'],
  encargado: [
    'clientas:read',
    'clientas:create',
    'clientas:edit',
    'movimientos:read',
    'movimientos:create',
    'gastos:read',
    'gastos:create',
    'reportes:read',
  ],
  cajero: [
    'clientas:read',
    'clientas:create',
    'movimientos:read',
    'movimientos:create',
  ],
  asistente: [
    'clientas:read',
    'movimientos:read',
    'movimientos:create',
  ],
  temporal: [
    'clientas:read',
    'clientas:create',
    'movimientos:read',
    'movimientos:create',
  ],
  usuario: ['*'], // Fallback para compatibilidad previa
};

const MODULE_REQUIRED_PERMISSIONS = {
  dashboard: 'clientas:read',
  clientas: 'clientas:read',
  movimientos: 'movimientos:read',
  gastos: 'gastos:read',
  reportes: 'reportes:read',
  configuracion: 'configuracion:read',
  equipo: 'equipo:manage',
};

export const ROLE_LABELS = {
  admin: '👑 Administrador',
  encargado: '👔 Encargado de Tienda',
  cajero: '🛒 Cajero',
  asistente: '📋 Asistente de Ventas',
  temporal: '⏳ Encargado Temporal',
  superadmin: '⚡ Superadministrador',
};

export function usePermissions() {
  const { usuario, esSuperadmin } = useAuth();

  const rolActual = esSuperadmin ? 'superadmin' : (usuario?.rol || 'admin');

  // Verificar si la cuenta temporal ha expirado
  let expirado = false;
  if (rolActual === 'temporal' && usuario?.fecha_expiracion_acceso) {
    if (new Date(usuario.fecha_expiracion_acceso) < new Date()) {
      expirado = true;
    }
  }

  /**
   * Verifica si el usuario actual tiene un permiso específico
   */
  const can = (permission) => {
    if (expirado) return false;
    if (esSuperadmin || rolActual === 'admin') return true;

    const allowed = ROLE_PERMISSIONS[rolActual] || [];
    if (allowed.includes('*')) return true;

    return allowed.includes(permission);
  };

  /**
   * Verifica si el usuario puede acceder a un módulo de navegación principal
   */
  const hasModuleAccess = (moduleName) => {
    if (expirado) return false;
    if (esSuperadmin || rolActual === 'admin') return true;

    if (moduleName === 'configuracion' || moduleName === 'equipo') {
      return rolActual === 'admin' || esSuperadmin;
    }

    const reqPerm = MODULE_REQUIRED_PERMISSIONS[moduleName];
    if (!reqPerm) return true;

    return can(reqPerm);
  };

  const isRole = (targetRole) => {
    return rolActual === targetRole;
  };

  return {
    can,
    hasModuleAccess,
    isRole,
    rolActual,
    rolNombreDisplay: ROLE_LABELS[rolActual] || 'Empleado',
    expirado,
    isAdmin: rolActual === 'admin' || esSuperadmin,
  };
}
