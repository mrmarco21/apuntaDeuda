import React from 'react';
import CategoriaIcon, { SelectorIconoCategoria } from '../../../../components/common/CategoriaIcon';

/**
 * Modal para editar una categoría existente con iconos profesionales.
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
            <div className="cat-modal-badge-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CategoriaIcon icono={catParaEditar.icono || 'shirt'} size={24} />
            </div>
            <div>
              <h3>Editar Categoría</h3>
              <p className="card-subtitle">Modifica el nombre o icono profesional</p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setShowModalEditarCat(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleGuardarEditarCat}>
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
            <label htmlFor="edit-cat-nombre">Nombre de la Categoría *</label>
            <input
              id="edit-cat-nombre"
              type="text"
              value={catParaEditar.nombre}
              onChange={(e) => setCatParaEditar({ ...catParaEditar, nombre: e.target.value })}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Seleccionar Ícono Profesional</label>
            <SelectorIconoCategoria
              valorSeleccionado={catParaEditar.icono || 'shirt'}
              onSeleccionar={(id) => setCatParaEditar({ ...catParaEditar, icono: id })}
            />
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
