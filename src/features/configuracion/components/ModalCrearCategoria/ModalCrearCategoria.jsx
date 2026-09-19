import React from 'react';
import CategoriaIcon, { SelectorIconoCategoria } from '../../../../components/common/CategoriaIcon';

/**
 * Modal para crear una nueva categoría de negocio con iconos profesionales.
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
            <div className="cat-modal-badge-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CategoriaIcon icono={formCrearCat.icono || 'shirt'} size={24} />
            </div>
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
          <div className="form-group" style={{ marginBottom: '1.1rem' }}>
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

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Seleccionar Ícono Profesional</label>
            <SelectorIconoCategoria
              valorSeleccionado={formCrearCat.icono || 'shirt'}
              onSeleccionar={(id) => setFormCrearCat({ ...formCrearCat, icono: id })}
            />
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
