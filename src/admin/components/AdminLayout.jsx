import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import './AdminLayout.css';

const ADMIN_NAV_ITEMS = [
  {
    to: '/admin',
    label: 'Dashboard',
    end: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9"/>
        <rect x="14" y="3" width="7" height="5"/>
        <rect x="14" y="12" width="7" height="9"/>
        <rect x="3" y="16" width="7" height="5"/>
      </svg>
    ),
  },
  {
    to: '/admin/negocios',
    label: 'Negocios',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18"/>
        <path d="M5 21V7l8-4v18"/>
        <path d="M19 21V11l-6-4"/>
        <path d="M9 9h1"/>
        <path d="M9 13h1"/>
        <path d="M9 17h1"/>
      </svg>
    ),
  },
  {
    to: '/admin/usuarios',
    label: 'Usuarios',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const { session, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('@admin_sidebar_collapsed') === 'true';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const userEmail = session?.user?.email || 'Superadmin';
  const initial = userEmail.charAt(0).toUpperCase();

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('@admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  return (
    <div className={`admin-layout ${isDark ? 'dark' : ''} ${sidebarCollapsed ? 'admin-layout--collapsed' : ''}`}>
      {/* Overlay para cerrar sidebar en móvil */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'admin-sidebar-open' : ''} ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`}>
        <div className="admin-sidebar-inner">
          {/* Header del sidebar */}
          <div className="admin-sidebar-header">
            <div className="admin-sidebar-logo">
              <div className="admin-logo-icon" title="ApuntaDeuda Superadmin">
                <img
                  src="/logo.png"
                  alt="ApuntaDeuda"
                  className="admin-logo-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/logo.png';
                  }}
                />
              </div>
              <div className="admin-logo-text">
                <div className="admin-brand-row">
                  <span className="admin-app-name">ApuntaDeuda</span>
                  <span className="admin-badge-super">SUPERADMIN</span>
                </div>
                <span className="admin-app-sub">Gestión de Plataforma</span>
              </div>
            </div>
            <button
              className="admin-sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Navegación */}
          <nav className="admin-sidebar-nav">
            <p className="admin-sidebar-nav-label">Administración Global</p>
            {ADMIN_NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `admin-sidebar-link${isActive ? ' active' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="admin-sidebar-link-icon">{item.icon}</span>
                <span className="admin-sidebar-link-label">{item.label}</span>
                <span className="admin-sidebar-link-arrow">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </span>
              </NavLink>
            ))}

            <div className="admin-nav-separator" />
            <p className="admin-sidebar-nav-label">Accesos Directos</p>
            <Link
              to="/"
              className="admin-sidebar-link admin-app-link"
              onClick={() => setSidebarOpen(false)}
              title={sidebarCollapsed ? "Ir al Área de Negocio" : undefined}
            >
              <span className="admin-sidebar-link-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              </span>
              <span className="admin-sidebar-link-label">Ir al Área de Negocio</span>
            </Link>
          </nav>

          {/* Footer del sidebar */}
          <div className="admin-sidebar-footer">
            {/* Botón de ocultar/expandir menú en PC (situado entre accesos directos y tema) */}
            <button
              className="admin-sidebar-collapse-btn"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
              aria-label="Contraer o expandir menú"
            >
              <span className="admin-sidebar-collapse-icon">
                {sidebarCollapsed ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="13 17 18 12 13 7"/>
                    <polyline points="6 17 11 12 6 7"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="11 17 6 12 11 7"/>
                    <polyline points="18 17 13 12 18 7"/>
                  </svg>
                )}
              </span>
              <span className="admin-sidebar-collapse-label">
                {sidebarCollapsed ? 'Expandir' : 'Contraer menú'}
              </span>
            </button>

            <button 
              className="admin-theme-toggle-btn" 
              onClick={toggleTheme} 
              title={sidebarCollapsed ? (isDark ? "Tema Claro" : "Tema Oscuro") : "Cambiar tema de color"}
            >
              <span className="admin-theme-toggle-icon">
                {isDark ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </span>
              <span className="admin-theme-toggle-label">
                {isDark ? 'Tema Claro' : 'Tema Oscuro'}
              </span>
            </button>

            <div className="admin-sidebar-user" title={sidebarCollapsed ? `Superadmin: ${userEmail}` : undefined}>
              <div className="admin-user-avatar">{initial}</div>
              <div className="admin-user-info">
                <p className="admin-user-name" title={userEmail}>
                  {userEmail}
                </p>
                <p className="admin-user-role">Superadministrador</p>
              </div>
              <button
                className="admin-logout-btn"
                onClick={() => setShowLogoutModal(true)}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="admin-mobile-header">
        <button
          className="admin-hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div className="admin-mobile-brand">
          <div className="admin-mobile-logo-icon">
            <img
              src="/logo.png"
              alt="ApuntaDeuda"
              className="admin-mobile-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.png';
              }}
            />
          </div>
          <span>ApuntaDeuda Superadmin</span>
        </div>

        <button
          className="admin-mobile-theme-btn"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {isDark ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>
      </header>

      {/* Contenedor de contenido principal */}
      <main className="admin-content">
        <Outlet />
      </main>

      {/* Modal de confirmación para Cerrar Sesión Superadmin */}
      {showLogoutModal && (
        <div 
          className="logout-modal-overlay"
          onClick={() => setShowLogoutModal(false)}
        >
          <div 
            className="logout-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-logout-title"
          >
            <div className="logout-modal-icon-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            
            <h3 id="admin-logout-title" className="logout-modal-title">
              ¿Cerrar Sesión?
            </h3>
            
            <p className="logout-modal-desc">
              ¿Estás seguro de que deseas salir del panel de Superadministrador?
            </p>

            <div className="logout-modal-actions">
              <button 
                type="button"
                className="logout-modal-btn btn-cancel"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="logout-modal-btn btn-confirm"
                onClick={handleConfirmLogout}
              >
                Sí, Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
