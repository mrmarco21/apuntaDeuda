import React from 'react';

/**
 * Modal para crear una nueva categoría de negocio.
 *
 * Props:
 *   showModalCrearCat    {boolean}
 *   setShowModalCrearCat {function}
 *   formCrearCat         {object} { nombre, icono }
 *   setFormCrearCat      {function}
 *   handleGuardarCrearCat {function}
 *   guardandoCat         {boolean}
 *   nombreNegocio        {string}
 */
export default function ModalCrearCategoria({
  showModalCrearCat,
  setShowModalCrearCat,
  formCrearCat,
  setFormCrearCat,
  handleGuardarCrearCat,
  guardandoCat,
  nombreNegocio
}) {
  if (!showModalCrearCat) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowModalCrearCat(false)}>
      <div className="modal-content modal-cat-admin-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="cat-modal-title-wrap">
            <span className="cat-modal-badge-icon">{formCrearCat.icono || '🏷️'}</span>
            <div>
              <h3>Nueva Categoría de Negocio</h3>
              <p className="card-subtitle">Estará disponible para nuevos cargos en {nombreNegocio}</p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setShowModalCrearCat(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleGuardarCrearCat}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="crear-cat-nombre">Nombre de la Categoría *</label>
            <input
              id="crear-cat-nombre"
              type="text"
              placeholder="Ej: Ropa deportiva, Calzado dama, Perfumería..."
              value={formCrearCat.nombre}
              onChange={(e) => setFormCrearCat({ ...formCrearCat, nombre: e.target.value })}
              autoFocus
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Seleccionar Ícono / Emoji</label>
            <div className="quick-cat-emojis">
              {['👕', '👗', '👟', '✨', '👜', '💍', '💄', '👶', '📚', '🎒', '🕶️', '⌚', '🎁', '🧸', '🧴', '🛍️', '📦', '🏷️'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`btn-emoji-select ${formCrearCat.icono === emoji ? 'active' : ''}`}
                  onClick={() => setFormCrearCat({ ...formCrearCat, icono: emoji })}
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
              onClick={() => setShowModalCrearCat(false)}
              disabled={guardandoCat}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={guardandoCat || !formCrearCat.nombre.trim()}
            >
              {guardandoCat ? 'Guardando...' : 'Crear Categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
