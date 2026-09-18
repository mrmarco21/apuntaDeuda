import React from 'react';

/**
 * Modal para editar una categoría existente.
 *
 * Props:
 *   showModalEditarCat    {boolean}
 *   setShowModalEditarCat {function}
 *   catParaEditar         {object}
 *   setCatParaEditar      {function}
 *   handleGuardarEditarCat {function}
 *   guardandoCat          {boolean}
 */
export default function ModalEditarCategoria({
  showModalEditarCat,
  setShowModalEditarCat,
  catParaEditar,
  setCatParaEditar,
  handleGuardarEditarCat,
  guardandoCat
}) {
  if (!showModalEditarCat || !catParaEditar) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowModalEditarCat(false)}>
      <div className="modal-content modal-cat-admin-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="cat-modal-title-wrap">
            <span className="cat-modal-badge-icon">{catParaEditar.icono || '🏷️'}</span>
            <div>
              <h3>Editar Categoría</h3>
              <p className="card-subtitle">Modifica el nombre o icono visible</p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setShowModalEditarCat(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleGuardarEditarCat}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="edit-cat-nombre">Nombre de la Categoría *</label>
            <input
              id="edit-cat-nombre"
              type="text"
              value={catParaEditar.nombre}
              onChange={(e) => setCatParaEditar({ ...catParaEditar, nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Ícono / Emoji</label>
            <div className="quick-cat-emojis">
              {['👕', '👗', '👟', '✨', '👜', '💍', '💄', '👶', '📚', '🎒', '🕶️', '⌚', '🎁', '🧸', '🧴', '🛍️', '📦', '🏷️'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`btn-emoji-select ${catParaEditar.icono === emoji ? 'active' : ''}`}
                  onClick={() => setCatParaEditar({ ...catParaEditar, icono: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowModalEditarCat(false)}
              disabled={guardandoCat}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={guardandoCat || !catParaEditar.nombre.trim()}
            >
              {guardandoCat ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
