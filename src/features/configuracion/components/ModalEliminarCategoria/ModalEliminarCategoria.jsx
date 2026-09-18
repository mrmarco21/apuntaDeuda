import React from 'react';

/**
 * Modal para eliminar (o desactivar si está en uso) una categoría.
 *
 * Props:
 *   showModalEliminarCat       {boolean}
 *   setShowModalEliminarCat    {function}
 *   catParaEliminar            {object}
 *   alertaUsoCat               {string|null}
 *   eliminandoCat              {boolean}
 *   handleConfirmarEliminarCat {function}
 *   handleToggleEstadoCat      {function}
 */
export default function ModalEliminarCategoria({
  showModalEliminarCat,
  setShowModalEliminarCat,
  catParaEliminar,
  alertaUsoCat,
  eliminandoCat,
  handleConfirmarEliminarCat,
  handleToggleEstadoCat
}) {
  if (!showModalEliminarCat || !catParaEliminar) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowModalEliminarCat(false)}>
      <div className="modal-content modal-cat-delete-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="cat-modal-title-wrap">
            <span className="cat-modal-badge-icon" style={{ background: '#fee2e2', color: '#ef4444' }}>
              ⚠️
            </span>
            <div>
              <h3>Eliminar Categoría</h3>
              <p className="card-subtitle">{catParaEliminar.nombre}</p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setShowModalEliminarCat(false)}>
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1rem 0' }}>
          {alertaUsoCat ? (
            <div className="cat-in-use-alert">
              <div className="alert-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="alert-text">
                <h4>No se puede eliminar permanentemente</h4>
                <p>{alertaUsoCat}</p>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: 'var(--color-text, #334155)', fontSize: '0.95rem' }}>
              ¿Estás seguro de que deseas eliminar permanentemente la categoría{' '}
              <strong>"{catParaEliminar.nombre}"</strong>?
              <br />
              <small style={{ color: 'var(--color-textSecondary, #64748b)', marginTop: '0.35rem', display: 'block' }}>
                Esta acción no se puede deshacer.
              </small>
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowModalEliminarCat(false)}
            disabled={eliminandoCat}
          >
            Cerrar
          </button>

          {alertaUsoCat ? (
            <button
              type="button"
              className="btn-primary"
              onClick={async () => {
                await handleToggleEstadoCat(catParaEliminar);
                setShowModalEliminarCat(false);
              }}
            >
              {catParaEliminar.activo ? 'Desactivar Categoría' : 'Mantener Desactivada'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-danger"
              onClick={handleConfirmarEliminarCat}
              disabled={eliminandoCat}
            >
              {eliminandoCat ? 'Eliminando...' : 'Sí, Eliminar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
