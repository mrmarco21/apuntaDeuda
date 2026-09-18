import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import {
  RiHome5Line,
  RiGroupLine,
  RiArrowUpDownLine,
  RiMoneyDollarCircleLine,
  RiBarChartLine,
  RiSettings3Line,
  RiAppsLine,
  RiArrowRightSLine,
  RiArrowRightDoubleLine,
  RiArrowLeftDoubleLine,
  RiSunLine,
  RiMoonLine,
  RiMenuLine,
  RiCloseLine,
  RiLogoutBoxRLine,
} from 'react-icons/ri';
import './Layout.css';

import { usePermissions, ROLE_LABELS } from '../../../hooks/usePermissions';

const NAV_ITEMS = [
  {
    to: '/',
    label: 'Inicio',
    module: 'dashboard',
    end: true,
    icon: <RiHome5Line />,
  },
  {
    to: '/clientas',
    label: 'Clientas',
    module: 'clientas',
    icon: <RiGroupLine />,
  },
  {
    to: '/movimientos',
    label: 'Movimientos',
    module: 'movimientos',
    icon: <RiArrowUpDownLine />,
  },
  {
    to: '/gastos',
    label: 'Gastos',
    module: 'gastos',
    icon: <RiMoneyDollarCircleLine />,
  },
  {
    to: '/reportes',
    label: 'Reportes',
    module: 'reportes',
    icon: <RiBarChartLine />,
  },
  {
    to: '/configuracion',
    label: 'Configuración',
    module: 'configuracion',
    icon: <RiSettings3Line />,
  },
];

export default function Layout() {
  const { usuario, negocioActual, logout, esSuperadmin } = useAuth();
  const { hasModuleAccess, rolNombreDisplay } = usePermissions();
  const { isDark, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('@sidebar_collapsed') === 'true';
  });
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Elementos permitidos para el rol actual
  const itemsPermitidos = NAV_ITEMS.filter((item) => hasModuleAccess(item.module));
  const bottomNavPermitidos = itemsPermitidos.slice(0, 3);

  // Detectar si estamos en una sub-pantalla (como detalle de clienta) para ocultar la barra inferior
  const isSubScreen = location.pathname.startsWith('/clientas/') && location.pathname !== '/clientas';

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('@sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    await logout();
    navigate('/login');
  };

  const initial = usuario?.nombre
    ? usuario.nombre.charAt(0).toUpperCase()
    : usuario?.email
    ? usuario.email.charAt(0).toUpperCase()
    : '?';

  const logoSrc = negocioActual?.logo_url || '/logo.png';
  const nombreMostrado = negocioActual?.nombre || 'ApuntaDeuda';

  return (
    <div className={`layout ${isDark ? 'dark' : ''} ${sidebarCollapsed ? 'layout--collapsed' : ''} ${isSubScreen ? 'layout--no-bottom-nav' : ''}`}>
      {/* Overlay para cerrar sidebar en móvil */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''} ${sidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
        <div className="sidebar-inner">
          {/* Header del sidebar */}
          <div className="sidebar-header">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon" title={nombreMostrado}>
                <img
                  src={logoSrc}
                  alt={nombreMostrado}
                  className="sidebar-logo-img"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/logo.png';
                  }}
                />
              </div>
              <div className="sidebar-logo-text">
                <span className="sidebar-app-name" title={nombreMostrado}>
                  {nombreMostrado}
                </span>
                <span className="sidebar-app-sub">
                  {negocioActual?.nombre ? 'ApuntaDeuda' : 'Gestión de Deudas'}
                </span>
              </div>
            </div>

            {/* Botón cerrar para móvil */}
            <button
              className="sidebar-close-btn"
              onClick={() => setSidebarOpen(false)}
              aria-label="Cerrar menú"
            >
              <RiCloseLine size={20} />
            </button>
          </div>

          {/* Navegación */}
          <nav className="sidebar-nav">
            <p className="sidebar-nav-label">Menú Principal</p>
            {itemsPermitidos.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
                <span className="sidebar-link-arrow">
                  <RiArrowRightSLine size={14} />
                </span>
              </NavLink>
            ))}

            {esSuperadmin && (
              <div className="sidebar-superadmin-wrap" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed var(--color-borderLight)' }}>
                <NavLink
                  to="/admin/negocios"
                  onClick={() => setSidebarOpen(false)}
                  className="sidebar-link sidebar-link--superadmin"
                  title={sidebarCollapsed ? "Panel Superadmin" : undefined}
                  style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    color: '#6366F1',
                    fontWeight: 700,
                  }}
                >
                  <span className="sidebar-link-icon">
                    <RiAppsLine />
                  </span>
                  <span className="sidebar-link-label">Panel Superadmin</span>
                </NavLink>
              </div>
            )}
          </nav>

          {/* Footer del sidebar */}
          <div className="sidebar-footer">
            {/* Botón de ocultar/expandir menú en PC (situado entre navegación y tema) */}
            <button
              className="sidebar-collapse-btn"
              onClick={toggleSidebarCollapse}
              title={sidebarCollapsed ? "Expandir menú lateral" : "Contraer menú lateral"}
              aria-label="Contraer o expandir menú"
            >
              <span className="sidebar-collapse-icon">
                {sidebarCollapsed ? (
                  <RiArrowRightDoubleLine size={18} />
                ) : (
                  <RiArrowLeftDoubleLine size={18} />
                )}
              </span>
              <span className="sidebar-collapse-label">
                {sidebarCollapsed ? 'Expandir' : 'Contraer menú'}
              </span>
            </button>

            <button 
              className="theme-toggle-btn" 
              onClick={toggleTheme} 
              title={sidebarCollapsed ? (isDark ? "Tema Claro" : "Tema Oscuro") : "Cambiar tema de color"}
            >
              <span className="theme-toggle-icon">
                {isDark ? (
                  <RiSunLine size={18} />
                ) : (
                  <RiMoonLine size={18} />
                )}
              </span>
              <span className="theme-toggle-label">
                {isDark ? 'Tema Claro' : 'Tema Oscuro'}
              </span>
            </button>

            <div
              className="sidebar-user"
              onClick={() => {
                setSidebarOpen(false);
                navigate('/configuracion');
              }}
              style={{ cursor: 'pointer' }}
              title={sidebarCollapsed ? `Ajustes: ${usuario?.nombre || usuario?.email || 'Usuario'}` : "Ir a Configuración"}
            >
              <div className="sidebar-user-avatar">{initial}</div>
              <div className="sidebar-user-info">
                <p className="sidebar-user-name">
                  {usuario?.nombre || usuario?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="sidebar-user-role">
                  {rolNombreDisplay}
                </p>
              </div>
              <button
                className="sidebar-logout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutModal(true);
                }}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <RiLogoutBoxRLine size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Header móvil */}
      <header className="mobile-header">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Abrir menú"
        >
          <RiMenuLine size={22} />
        </button>

        <div className="mobile-header-brand">
          <div className="mobile-logo-icon">
            <img
              src={logoSrc}
              alt={nombreMostrado}
              className="mobile-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.png';
              }}
            />
          </div>
          <span className="mobile-brand-title">{nombreMostrado}</span>
        </div>

        <button
          className="mobile-theme-btn"
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {isDark ? (
            <RiSunLine size={20} />
          ) : (
            <RiMoonLine size={20} />
          )}
        </button>
      </header>

      {/* Contenido principal */}
      <main className="content">
        <Outlet />
      </main>

      {/* Bottom Nav - solo móvil (se oculta en sub-pantallas como detalle de clienta) */}
      {!isSubScreen && (
        <nav className="bottom-nav">
          {bottomNavPermitidos.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `bottom-nav-link${isActive ? ' active' : ''}`
              }
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}

      {/* Modal de confirmación para Cerrar Sesión */}
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
            aria-labelledby="logout-title"
          >
            <div className="logout-modal-icon-wrap">
              <RiLogoutBoxRLine size={28} />
            </div>
            
            <h3 id="logout-title" className="logout-modal-title">
              ¿Cerrar Sesión?
            </h3>
            
            <p className="logout-modal-desc">
              ¿Estás seguro de que deseas salir de tu cuenta? Tendrás que volver a ingresar tus credenciales para acceder.
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
