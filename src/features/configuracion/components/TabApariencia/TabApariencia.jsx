import React from 'react';

/**
 * Tab de Apariencia y Tema Visual (Light / Dark).
 *
 * Props:
 *   isDark     {boolean}
 *   setTheme   {function}
 */
export default function TabApariencia({ isDark, setTheme }) {
  return (
    <div className="config-card">
      <div className="card-header">
        <h2>Apariencia y Tema Visual</h2>
        <p className="card-subtitle">
          Personaliza la apariencia para trabajar con comodidad de día o de noche.
        </p>
      </div>

      <div className="theme-selection-grid">
        {/* Tema Claro */}
        <div
          className={`theme-card ${!isDark ? 'theme-active' : ''}`}
          onClick={() => setTheme('light')}
        >
          <div className="theme-preview theme-preview-light">
            <div className="preview-topbar">
              <div className="preview-dot"></div>
              <div className="preview-dot"></div>
              <div className="preview-dot"></div>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar"></div>
              <div className="preview-content">
                <div className="preview-box"></div>
                <div className="preview-line"></div>
              </div>
            </div>
          </div>
          <div className="theme-card-footer">
            <div className="theme-info">
              <div className="theme-icon sun-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              </div>
              <div>
                <h3>Tema Claro</h3>
                <p>Fondo blanco limpio con máximo contraste para el día</p>
              </div>
            </div>
            {!isDark && <span className="theme-check-badge">Activo</span>}
          </div>
        </div>

        {/* Tema Oscuro */}
        <div
          className={`theme-card ${isDark ? 'theme-active' : ''}`}
          onClick={() => setTheme('dark')}
        >
          <div className="theme-preview theme-preview-dark">
            <div className="preview-topbar">
              <div className="preview-dot"></div>
              <div className="preview-dot"></div>
              <div className="preview-dot"></div>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar dark-sb"></div>
              <div className="preview-content">
                <div className="preview-box dark-box"></div>
                <div className="preview-line dark-line"></div>
              </div>
            </div>
          </div>
          <div className="theme-card-footer">
            <div className="theme-info">
              <div className="theme-icon moon-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </div>
              <div>
                <h3>Tema Oscuro</h3>
                <p>Tonos oscuros elegantes que reducen la fatiga visual</p>
              </div>
            </div>
            {isDark && <span className="theme-check-badge">Activo</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
