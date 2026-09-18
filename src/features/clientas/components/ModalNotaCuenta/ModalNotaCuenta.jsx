import React from 'react';
import { Pencil } from 'lucide-react';

/**
 * Modal para editar / agregar nota de una cuenta existente.
 *
 * Props:
 *   cuentaEditandoNota      {object|null}
 *   setCuentaEditandoNota   {function}
 *   clienta                 {object}
 *   inputEditarNota         {string}
 *   setInputEditarNota      {function}
 *   handleGuardarEditarNotaCuenta {function}
 *   guardandoEditarNota     {boolean}
 */
export default function ModalNotaCuenta({
  cuentaEditandoNota,
  setCuentaEditandoNota,
  clienta,
  inputEditarNota,
  setInputEditarNota,
  handleGuardarEditarNotaCuenta,
  guardandoEditarNota
}) {
  if (!cuentaEditandoNota) return null;

  return (
    <div className="modal-overlay" onClick={() => setCuentaEditandoNota(null)}>
      <div className="modal-content modal-nueva-cuenta" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="nueva-cuenta-header-title">
            <div className="nueva-cuenta-icon-badge">
              <Pencil size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Nota de Cuenta #{cuentaEditandoNota.numeroCuenta}</h2>
              <p className="modal-subtitle">Para {clienta?.nombre}</p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setCuentaEditandoNota(null)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleGuardarEditarNotaCuenta}>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="edit-nota-cuenta-input" style={{ fontWeight: 700, fontSize: '0.88rem' }}>
              NOTA DE LA CUENTA <span className="label-opcional" style={{ fontWeight: 400, color: '#64748b' }}>(Opcional)</span>
            </label>
            <input
              id="edit-nota-cuenta-input"
              type="text"
              placeholder="Ej. Cuenta de su mamá, Cuenta personal..."
              value={inputEditarNota}
              onChange={(e) => setInputEditarNota(e.target.value)}
              autoFocus
              style={{ marginTop: '0.35rem' }}
            />
            <small className="form-help-text" style={{ display: 'block', marginTop: '0.35rem', color: '#64748b', fontSize: '0.78rem' }}>
              Deja en blanco si deseas quitar la nota de esta cuenta.
            </small>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setCuentaEditandoNota(null)}
              disabled={guardandoEditarNota}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={guardandoEditarNota}
            >
              {guardandoEditarNota ? 'Guardando...' : 'Guardar Nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
