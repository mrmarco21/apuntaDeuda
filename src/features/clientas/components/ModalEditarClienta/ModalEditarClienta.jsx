import React from 'react';

/**
 * Modal para editar los datos básicos de una clienta.
 *
 * Props:
 *   showModalEditClienta   {boolean}
 *   setShowModalEditClienta {function}
 *   formEditClienta        {object}  { nombre, telefono, direccion, referencia, notas }
 *   setFormEditClienta     {function}
 *   savingEditClienta      {boolean}
 *   handleSubmitEditClienta {function(e)}
 */
export default function ModalEditarClienta({
  showModalEditClienta,
  setShowModalEditClienta,
  formEditClienta,
  setFormEditClienta,
  savingEditClienta,
  handleSubmitEditClienta,
}) {
  if (!showModalEditClienta) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowModalEditClienta(false)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Clienta</h2>
          <button className="btn-close" onClick={() => setShowModalEditClienta(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmitEditClienta}>
          <div className="form-group">
            <label htmlFor="edit-nombre">Nombre *</label>
            <input
              id="edit-nombre"
              type="text"
              value={formEditClienta.nombre}
              onChange={(e) => setFormEditClienta({ ...formEditClienta, nombre: e.target.value })}
              placeholder="Nombre de la clienta"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-telefono">Teléfono</label>
            <input
              id="edit-telefono"
              type="tel"
              value={formEditClienta.telefono}
              onChange={(e) => setFormEditClienta({ ...formEditClienta, telefono: e.target.value })}
              placeholder="999 999 999"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-direccion">Dirección</label>
            <input
              id="edit-direccion"
              type="text"
              value={formEditClienta.direccion}
              onChange={(e) => setFormEditClienta({ ...formEditClienta, direccion: e.target.value })}
              placeholder="Dirección de la clienta"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-referencia">Referencia</label>
            <input
              id="edit-referencia"
              type="text"
              value={formEditClienta.referencia}
              onChange={(e) => setFormEditClienta({ ...formEditClienta, referencia: e.target.value })}
              placeholder="¿Quién la recomendó?"
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-notas">Notas</label>
            <textarea
              id="edit-notas"
              value={formEditClienta.notas}
              onChange={(e) => setFormEditClienta({ ...formEditClienta, notas: e.target.value })}
              placeholder="Notas adicionales..."
              rows="3"
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowModalEditClienta(false)}
              disabled={savingEditClienta}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingEditClienta}>
              {savingEditClienta ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
