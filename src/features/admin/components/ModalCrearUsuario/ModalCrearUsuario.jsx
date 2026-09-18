import React from 'react';

/**
 * Modal para registrar una nueva cuenta de usuario en Supabase Auth y public.usuarios.
 *
 * Props:
 *   modalCrearAbierto  {boolean}
 *   cerrarModales      {function}
 *   guardando          {boolean}
 *   handleCrearUsuario {function}
 *   errorModal         {string}
 *   formNombre         {string}
 *   setFormNombre      {function}
 *   formEmail          {string}
 *   setFormEmail       {function}
 *   formPassword       {string}
 *   setFormPassword    {function}
 *   mostrarPassword    {boolean}
 *   setMostrarPassword {function}
 *   formNegocioId      {string}
 *   setFormNegocioId   {function}
 *   formRol            {string}
 *   setFormRol         {function}
 *   negocios           {array}
 */
export default function ModalCrearUsuario({
  modalCrearAbierto,
  cerrarModales,
  guardando,
  handleCrearUsuario,
  errorModal,
  formNombre,
  setFormNombre,
  formEmail,
  setFormEmail,
  formPassword,
  setFormPassword,
  mostrarPassword,
  setMostrarPassword,
  formNegocioId,
  setFormNegocioId,
  formRol,
  setFormRol,
  negocios
}) {
  if (!modalCrearAbierto) return null;

  return (
    <div className="admin-modal-overlay" onClick={cerrarModales}>
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>Crear Nuevo Usuario</h2>
            <p className="admin-modal-sub">
              Registra la cuenta Auth y vincúlala con su negocio y rol correspondiente.
            </p>
          </div>
          <button
            className="admin-modal-close"
            onClick={cerrarModales}
            disabled={guardando}
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleCrearUsuario} className="admin-modal-form">
          {errorModal && (
            <div className="admin-modal-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{errorModal}</span>
            </div>
          )}

          {/* Nombre */}
          <div className="admin-form-group">
            <label htmlFor="user-nombre">
              Nombre Completo <span className="req">*</span>
            </label>
            <input
              id="user-nombre"
              type="text"
              placeholder="Ej: Laura Gómez"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              required
              autoFocus
              className="admin-form-input"
            />
          </div>

          {/* Correo */}
          <div className="admin-form-group">
            <label htmlFor="user-email">
              Correo Electrónico (Auth) <span className="req">*</span>
            </label>
            <input
              id="user-email"
              type="email"
              placeholder="usuario@negocio.com"
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              required
              className="admin-form-input"
            />
          </div>

          {/* Contraseña */}
          <div className="admin-form-group">
            <label htmlFor="user-password">
              Contraseña Inicial <span className="req">*</span>
            </label>
            <div className="admin-input-pass-wrap">
              <input
                id="user-password"
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                minLength={6}
                className="admin-form-input"
              />
              <button
                type="button"
                className="btn-toggle-eye"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                tabIndex={-1}
              >
                {mostrarPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            <span className="admin-form-hint">
              Esta contraseña servirá para el primer acceso del usuario a su negocio.
            </span>
          </div>

          {/* Negocio */}
          <div className="admin-form-group">
            <label htmlFor="user-negocio">
              Negocio Asignado <span className="req">*</span>
            </label>
            <select
              id="user-negocio"
              value={formNegocioId}
              onChange={(e) => setFormNegocioId(e.target.value)}
              required
              className="admin-form-input admin-select-input"
            >
              {negocios.map((neg) => (
                <option key={neg.id} value={neg.id} disabled={neg.activo === false}>
                  {neg.nombre} {neg.activo === false ? '(Inactivo - No permite usuarios)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Rol */}
          <div className="admin-form-group">
            <label htmlFor="user-rol">
              Rol en el Negocio <span className="req">*</span>
            </label>
            <select
              id="user-rol"
              value={formRol}
              onChange={(e) => setFormRol(e.target.value)}
              className="admin-form-input admin-select-input"
            >
              <option value="admin">Administrador (Control total del negocio)</option>
              <option value="encargado">Encargado de Tienda (Ventas, Abonos, Gastos y Reportes)</option>
              <option value="cajero">Cajero (Fiados y Abonos diarios)</option>
              <option value="asistente">Asistente de Ventas (Solo búsqueda y fiados)</option>
              <option value="temporal">Encargado Temporal (Con fecha límite)</option>
              <option value="usuario">Usuario (Operador habitual)</option>
            </select>
            <span className="admin-form-hint">
              {formRol === 'admin'
                ? 'Tendrá facultades para gestionar cobros, gastos y configuraciones del negocio.'
                : 'Podrá consultar y registrar movimientos del negocio asignado.'}
            </span>
          </div>

          {/* Nota de seguridad */}
          <div className="admin-form-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            <p>
              La creación de la cuenta se realiza de manera segura mediante la Edge Function de Supabase,
              asegurando el aislamiento RLS sin exponer claves maestras.
            </p>
          </div>

          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={cerrarModales}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn-primary"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <span className="admin-mini-spinner" />
                  Creando Cuenta...
                </>
              ) : (
                'Crear Usuario'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
