import React from 'react';

/**
 * Modal para actualizar la contraseña de un usuario en Supabase Auth.
 *
 * Props:
 *   modalPasswordAbierto         {boolean}
 *   usuarioPasswordSeleccionado  {object}
 *   cerrarModales                {function}
 *   guardandoPassword            {boolean}
 *   handleCambiarPassword        {function}
 *   errorModalPassword           {string}
 *   nuevoPassword                {string}
 *   setNuevoPassword             {function}
 *   mostrarNuevoPassword         {boolean}
 *   setMostrarNuevoPassword      {function}
 *   generarPasswordAleatorio     {function}
 *   copiarPassword               {function}
 *   copiadoPassword              {boolean}
 */
export default function ModalPasswordUsuario({
  modalPasswordAbierto,
  usuarioPasswordSeleccionado,
  cerrarModales,
  guardandoPassword,
  handleCambiarPassword,
  errorModalPassword,
  nuevoPassword,
  setNuevoPassword,
  mostrarNuevoPassword,
  setMostrarNuevoPassword,
  generarPasswordAleatorio,
  copiarPassword,
  copiadoPassword
}) {
  if (!modalPasswordAbierto || !usuarioPasswordSeleccionado) return null;

  return (
    <div className="admin-modal-overlay" onClick={cerrarModales}>
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>Cambiar Contraseña</h2>
            <p className="admin-modal-sub">
              Establece una nueva clave de acceso para el usuario en Supabase Auth.
            </p>
          </div>
          <button
            className="admin-modal-close"
            onClick={cerrarModales}
            disabled={guardandoPassword}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleCambiarPassword} className="admin-modal-form">
          {errorModalPassword && (
            <div className="admin-modal-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{errorModalPassword}</span>
            </div>
          )}

          {/* Ficha resumida del usuario */}
          <div className="admin-user-summary-card">
            <div className="admin-user-summary-avatar">
              {(usuarioPasswordSeleccionado.nombre || usuarioPasswordSeleccionado.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="admin-user-summary-info">
              <span className="admin-user-summary-name">{usuarioPasswordSeleccionado.nombre || 'Sin nombre'}</span>
              <span className="admin-user-summary-sub">
                {usuarioPasswordSeleccionado.email || 'Sin correo registrado'} &bull; {usuarioPasswordSeleccionado.negocios?.nombre || 'Negocio asignado'}
              </span>
            </div>
          </div>

          {/* Campo Nueva Contraseña */}
          <div className="admin-form-group">
            <label htmlFor="user-new-password">
              Nueva Contraseña <span className="req">*</span>
            </label>
            <div className="admin-input-pass-wrap">
              <input
                id="user-new-password"
                type={mostrarNuevoPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={nuevoPassword}
                onChange={(e) => setNuevoPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
                className="admin-form-input"
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setMostrarNuevoPassword(!mostrarNuevoPassword)}
                tabIndex={-1}
              >
                {mostrarNuevoPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>

            {/* Herramientas de Contraseña */}
            <div className="admin-pass-tools">
              <button
                type="button"
                className="admin-btn-tool"
                onClick={generarPasswordAleatorio}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                </svg>
                <span>Generar Aleatoria</span>
              </button>

              {nuevoPassword && (
                <button
                  type="button"
                  className={`admin-btn-tool ${copiadoPassword ? 'btn-copied' : ''}`}
                  onClick={copiarPassword}
                >
                  {copiadoPassword ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>¡Copiada!</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Aviso de seguridad */}
          <div className="admin-form-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p>
              El cambio se aplicará de inmediato en Supabase Auth. El usuario podrá iniciar sesión con su nueva clave sin necesidad de confirmación previa por correo.
            </p>
          </div>

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={cerrarModales}
              disabled={guardandoPassword}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn-primary"
              disabled={guardandoPassword}
            >
              {guardandoPassword ? (
                <>
                  <span className="admin-mini-spinner" />
                  Actualizando...
                </>
              ) : (
                'Actualizar Contraseña'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
