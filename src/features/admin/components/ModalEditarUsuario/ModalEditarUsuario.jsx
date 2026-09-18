import React from 'react';

/**
 * Modal para editar el nombre, negocio asignado, rol y estado de un usuario.
 *
 * Props:
 *   modalEditarAbierto  {boolean}
 *   usuarioSeleccionado {object}
 *   cerrarModales       {function}
 *   guardando           {boolean}
 *   handleEditarUsuario {function}
 *   errorModal          {string}
 *   editNombre          {string}
 *   setEditNombre       {function}
 *   editNegocioId       {string}
 *   setEditNegocioId    {function}
 *   editRol             {string}
 *   setEditRol          {function}
 *   editActivo          {boolean}
 *   setEditActivo       {function}
 *   negocios            {array}
 */
export default function ModalEditarUsuario({
  modalEditarAbierto,
  usuarioSeleccionado,
  cerrarModales,
  guardando,
  handleEditarUsuario,
  errorModal,
  editNombre,
  setEditNombre,
  editNegocioId,
  setEditNegocioId,
  editRol,
  setEditRol,
  editActivo,
  setEditActivo,
  negocios
}) {
  if (!modalEditarAbierto || !usuarioSeleccionado) return null;

  return (
    <div className="admin-modal-overlay" onClick={cerrarModales}>
      <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>Editar Usuario</h2>
            <p className="admin-modal-sub">
              Modifica la información y el rol en el negocio.
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

        <form onSubmit={handleEditarUsuario} className="admin-modal-form">
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
            <label htmlFor="edit-user-nombre">
              Nombre Completo <span className="req">*</span>
            </label>
            <input
              id="edit-user-nombre"
              type="text"
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              required
              className="admin-form-input"
            />
          </div>

          {/* Negocio */}
          <div className="admin-form-group">
            <label htmlFor="edit-user-negocio">
              Negocio Asignado <span className="req">*</span>
            </label>
            <select
              id="edit-user-negocio"
              value={editNegocioId}
              onChange={(e) => setEditNegocioId(e.target.value)}
              required
              className="admin-form-input admin-select-input"
            >
              {negocios.map((neg) => (
                <option key={neg.id} value={neg.id}>
                  {neg.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Rol */}
          <div className="admin-form-group">
            <label htmlFor="edit-user-rol">
              Rol en el Negocio <span className="req">*</span>
            </label>
            <select
              id="edit-user-rol"
              value={editRol}
              onChange={(e) => setEditRol(e.target.value)}
              className="admin-form-input admin-select-input"
            >
              <option value="admin">Administrador (Control total del negocio)</option>
              <option value="encargado">Encargado de Tienda (Ventas, Abonos, Gastos y Reportes)</option>
              <option value="cajero">Cajero (Fiados y Abonos diarios)</option>
              <option value="asistente">Asistente de Ventas (Solo búsqueda y fiados)</option>
              <option value="temporal">Encargado Temporal (Con fecha límite)</option>
              <option value="usuario">Usuario (Operador habitual)</option>
            </select>
          </div>

          {/* Estado Activo */}
          <div className="admin-form-group">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={editActivo}
                onChange={(e) => setEditActivo(e.target.checked)}
                className="admin-checkbox-input"
              />
              <div>
                <span className="admin-check-title">Usuario Activo</span>
                <span className="admin-check-desc">
                  Si se desmarca, el usuario no podrá acceder a la plataforma.
                </span>
              </div>
            </label>
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
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
