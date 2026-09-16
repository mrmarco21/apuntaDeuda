import React from 'react';

const CATEGORIAS = [
  'Compras',
  'Transporte',
  'Servicios',
  'Renta',
  'Salarios',
  'Marketing',
  'Mantenimiento',
  'Otros'
];

/**
 * Modal para registrar o editar un gasto.
 * Props:
 *   showModal        {boolean}
 *   gastoEditando    {object|null}
 *   formData         {object}  { concepto, monto, categoria, descripcion, fecha }
 *   setFormData      {function}
 *   handleSubmit     {function}
 *   cerrarModal      {function}
 *   simboloMoneda    {string}
 */
export default function ModalGasto({
  showModal,
  gastoEditando,
  formData,
  setFormData,
  handleSubmit,
  cerrarModal,
  simboloMoneda,
}) {
  if (!showModal) return null;

  return (
    <div className="modal-overlay" onClick={cerrarModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{gastoEditando ? 'Editar Gasto' : 'Nuevo Gasto'}</h2>
          <button className="btn-close" onClick={cerrarModal}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="concepto">Concepto *</label>
            <input
              id="concepto"
              type="text"
              value={formData.concepto}
              onChange={(e) => setFormData({...formData, concepto: e.target.value})}
              placeholder="Ej: Compra de mercancía"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="monto">Monto *</label>
              <div className="input-currency">
                <span className="currency-symbol">{simboloMoneda}</span>
                <input
                  id="monto"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.monto}
                  onChange={(e) => setFormData({...formData, monto: e.target.value})}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="fecha">Fecha</label>
              <input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="categoria">Categoría</label>
            <select
              id="categoria"
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción (opcional)</label>
            <textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
              placeholder="Detalles adicionales del gasto..."
              rows="3"
            />
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={cerrarModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              {gastoEditando ? 'Guardar Cambios' : 'Registrar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
