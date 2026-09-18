import React from 'react';

/**
 * Rejilla de tarjetas de resumen estadístico (KPIs) de usuarios.
 *
 * Props:
 *   totalUsuarios  {number}
 *   totalAdmins    {number}
 *   totalActivos   {number}
 *   totalInactivos {number}
 */
export default function UserStats({
  totalUsuarios,
  totalAdmins,
  totalActivos,
  totalInactivos
}) {
  return (
    <div className="admin-stats-grid">
      <div className="admin-stat-card">
        <div className="admin-stat-icon-wrap icon-indigo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div className="admin-stat-info">
          <span className="admin-stat-label">Usuarios Totales</span>
          <span className="admin-stat-value">{totalUsuarios}</span>
        </div>
      </div>

      <div className="admin-stat-card">
        <div className="admin-stat-icon-wrap icon-purple">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div className="admin-stat-info">
          <span className="admin-stat-label">Administradores</span>
          <span className="admin-stat-value">{totalAdmins}</span>
        </div>
      </div>

      <div className="admin-stat-card">
        <div className="admin-stat-icon-wrap icon-green">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <div className="admin-stat-info">
          <span className="admin-stat-label">Usuarios Activos</span>
          <span className="admin-stat-value">{totalActivos}</span>
        </div>
      </div>

      <div className="admin-stat-card">
        <div className="admin-stat-icon-wrap icon-gray">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>
        <div className="admin-stat-info">
          <span className="admin-stat-label">Usuarios Inactivos</span>
          <span className="admin-stat-value">{totalInactivos}</span>
        </div>
      </div>
    </div>
  );
}
