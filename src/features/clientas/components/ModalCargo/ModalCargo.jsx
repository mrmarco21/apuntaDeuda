import React from 'react';
import { Plus, Check, Trash2, Calendar } from 'lucide-react';
import CategoriaIcon from '../../../../components/common/CategoriaIcon';

/**
 * Modal para registrar / editar una venta (cargo).
 * Incluye la lista de prendas/productos y el botón guardar.
 *
 * Props:
 *   showModalCargo         {boolean}
 *   setShowModalCargo      {function}
 *   editingCargoId         {string|null}
 *   cargoEsNuevaCuenta     {boolean}
 *   prendas                {Array}
 *   categorias             {Array}
 *   guardandoCargo         {boolean}
 *   simboloMoneda          {string}
 *   calcularTotalCargo     {function(): number}
 *   formatCurrency         {function}
 *   handleSubmitCargo      {function}
 *   agregarPrenda          {function}
 *   eliminarPrenda         {function(idx)}
 *   actualizarPrenda       {function(idx, campo, valor)}
 *   handleAbrirModalNuevaCat {function(idx)}
 */
export default function ModalCargo({
  showModalCargo,
  setShowModalCargo,
  editingCargoId,
  cargoEsNuevaCuenta,
  prendas,
  categorias,
  guardandoCargo,
  simboloMoneda,
  calcularTotalCargo,
  formatCurrency,
  handleSubmitCargo,
  agregarPrenda,
  eliminarPrenda,
  actualizarPrenda,
  handleAbrirModalNuevaCat,
}) {
  if (!showModalCargo) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowModalCargo(false)}>
      <div className="modal-content modal-android-cargo" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera Tipo Android */}
        <div className="android-cargo-header">
          <div className="android-header-info">
            <div className="android-tipo-circle circle-cargo">
              ↑
            </div>
            <div>
              <h2>{editingCargoId ? 'Editar Venta' : cargoEsNuevaCuenta ? 'Abrir Cuenta (Nueva Venta)' : 'Registrar Venta'}</h2>
              <p className="android-sub-info">Aumenta la deuda</p>
            </div>
          </div>
          <button className="btn-close-clean" onClick={() => setShowModalCargo(false)}>
            &times;
          </button>
        </div>

        {/* Barra de Total en vivo */}
        <div className="android-total-bar">
          <span>Total</span>
          <span className="android-total-monto">{formatCurrency(calcularTotalCargo())}</span>
        </div>

        <form onSubmit={handleSubmitCargo}>
          {/* Tarjetas de prendas / productos */}
          <div className="android-prendas-container">
            {prendas.map((prenda, idx) => {
              const catSeleccionada =
                categorias.find(
                  (c) =>
                    c.slug === prenda.categoria ||
                    c.id === prenda.categoria ||
                    c.nombre?.toLowerCase() === String(prenda.categoria).toLowerCase()
                ) || (categorias.length > 0 ? categorias[0] : null);

              return (
                <div key={idx} className="android-prenda-card">
                  {/* Fila 1: Badge número, Selector Categoría y Tacho Eliminar */}
                  <div className="prenda-card-row1">
                    <div className="prenda-badge-circle">
                      {idx + 1}
                    </div>

                    <div className="prenda-cat-dropdown-wrap">
                      <div className="prenda-cat-selector-row">
                        <div
                          className="prenda-cat-icon-badge"
                          title={catSeleccionada ? catSeleccionada.nombre : 'Categoría'}
                        >
                          <CategoriaIcon icono={catSeleccionada?.icono || 'shirt'} size={18} />
                        </div>

                        <select
                          value={prenda.categoria || ''}
                          onChange={(e) => actualizarPrenda(idx, 'categoria', e.target.value)}
                          className="android-select-cat"
                        >
                          {categorias.length === 0 && (
                            <option value="">-- Sin categoría registrada --</option>
                          )}
                          {categorias.map((cat) => (
                            <option key={cat.id} value={cat.slug || cat.id}>
                              {cat.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        className="btn-add-cat-inline"
                        onClick={() => handleAbrirModalNuevaCat(idx)}
                        title="Agregar nueva categoría al negocio sin salir de esta venta"
                      >
                        + Nueva categoría
                      </button>
                    </div>

                    {prendas.length > 1 && (
                      <button
                        type="button"
                        className="btn-trash-prenda"
                        onClick={() => eliminarPrenda(idx)}
                        title="Eliminar producto"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </button>
                    )}
                  </div>

                {/* Fila 2: Input Monto S/ y Botón Fecha */}
                <div className="prenda-card-row2">
                  <div className="android-monto-input-wrap">
                    <span className="android-monto-prefix">{simboloMoneda || 'S/'}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={prenda.monto}
                      onChange={(e) => actualizarPrenda(idx, 'monto', e.target.value)}
                      required
                      autoFocus={idx === 0}
                    />
                  </div>

                  <div className="android-fecha-input-wrap">
                    <Calendar size={16} strokeWidth={2} />
                    <input
                      type="date"
                      value={prenda.fecha}
                      onChange={(e) => actualizarPrenda(idx, 'fecha', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Fila 3: Descripción de la prenda */}
                <div className="prenda-card-row3">
                  <input
                    type="text"
                    placeholder="Descripción / Prenda (ej: Blusa, Pantalón...)"
                    value={prenda.descripcion}
                    onChange={(e) => actualizarPrenda(idx, 'descripcion', e.target.value)}
                    className="android-input-desc"
                  />
                </div>
              </div>
            );
          })}
          </div>

          {/* Botón Agregar otra prenda */}
          <button type="button" className="btn-android-add-prenda" onClick={agregarPrenda}>
            <Plus size={18} strokeWidth={2.5} />
            <span>Agregar otro producto</span>
          </button>

          {/* Botón Guardar Grande */}
          <div className="android-modal-actions-footer">
            <button type="submit" className="btn-android-guardar" disabled={guardandoCargo}>
              {guardandoCargo ? (
                'Guardando...'
              ) : (
                <>
                  <Check size={20} strokeWidth={2.5} />
                  <span>Guardar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
