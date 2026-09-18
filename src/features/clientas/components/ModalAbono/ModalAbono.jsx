import React from 'react';
import { Check } from 'lucide-react';

/**
 * Modal para registrar / editar un pago (abono).
 *
 * Props:
 *   showModalAbono         {boolean}
 *   setShowModalAbono      {function}
 *   editingAbonoId         {string|null}
 *   abonoCuentaId          {string}
 *   cuentas                {Array}
 *   cuentasCerradas        {Array}
 *   abonoMonto             {string}
 *   abonoMetodoPago        {string}  'efectivo'|'yape'|'mixto'
 *   abonoEfectivo          {string}
 *   abonoYape              {string}
 *   abonoFecha             {string}
 *   abonoDescripcion       {string}
 *   guardandoAbono         {boolean}
 *   simboloMoneda          {string}
 *   formatCurrency         {function}
 *   handleSubmitAbono      {function}
 *   handleMontoAbonoChange {function(val)}
 *   handleMixtoEfectivoChange {function(val)}
 *   handleMixtoYapeChange  {function(val)}
 *   setAbonoMetodoPago     {function}
 *   setAbonoFecha          {function}
 *   setAbonoDescripcion    {function}
 *   setAbonoEfectivo       {function}
 *   setAbonoYape           {function}
 */
export default function ModalAbono({
  showModalAbono,
  setShowModalAbono,
  editingAbonoId,
  abonoCuentaId,
  cuentas,
  cuentasCerradas,
  abonoMonto,
  abonoMetodoPago,
  abonoEfectivo,
  abonoYape,
  abonoFecha,
  abonoDescripcion,
  guardandoAbono,
  simboloMoneda,
  formatCurrency,
  handleSubmitAbono,
  handleMontoAbonoChange,
  handleMixtoEfectivoChange,
  handleMixtoYapeChange,
  setAbonoMetodoPago,
  setAbonoFecha,
  setAbonoDescripcion,
  setAbonoEfectivo,
  setAbonoYape,
}) {
  if (!showModalAbono) return null;

  const cuentaAbono =
    cuentas.find((c) => c.id === abonoCuentaId) ||
    cuentasCerradas.find((c) => c.id === abonoCuentaId);
  const numeroCuentaAbono =
    cuentaAbono?.numeroCuenta ||
    (cuentas.findIndex((c) => c.id === abonoCuentaId) + 1) ||
    1;

  return (
    <div className="modal-overlay" onClick={() => setShowModalAbono(false)}>
      <div className="modal-content modal-android-abono" onClick={(e) => e.stopPropagation()}>
        <div className="android-cargo-header">
          <div className="android-header-info">
            <div className="android-tipo-circle circle-abono">
              ↓
            </div>
            <div>
              <h2>{editingAbonoId ? 'Editar Pago' : 'Registrar Pago'} · Cuenta #{numeroCuentaAbono}</h2>
              <p className="android-sub-info">
                {cuentaAbono?.saldo !== undefined
                  ? `Saldo actual: ${formatCurrency(cuentaAbono.saldo)}`
                  : 'Reduce la deuda'}
              </p>
            </div>
          </div>
          <button className="btn-close-clean" onClick={() => setShowModalAbono(false)}>
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmitAbono} className="android-abono-form">
          {/* Monto */}
          <div className="form-group">
            <label htmlFor="abono-monto-input">Monto del Pago ({simboloMoneda}) *</label>
            <div className="android-monto-input-wrap large-monto">
              <span className="android-monto-prefix">{simboloMoneda || 'S/'}</span>
              <input
                id="abono-monto-input"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={abonoMonto}
                onChange={(e) => handleMontoAbonoChange(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Selector de Método de Pago */}
          <div className="form-group">
            <label>Método de Pago</label>
            <div className="metodo-pago-pills">
              <button
                type="button"
                className={`pago-pill ${abonoMetodoPago === 'efectivo' ? 'active' : ''}`}
                onClick={() => setAbonoMetodoPago('efectivo')}
              >
                💵 Efectivo
              </button>
              <button
                type="button"
                className={`pago-pill ${abonoMetodoPago === 'yape' ? 'active' : ''}`}
                onClick={() => setAbonoMetodoPago('yape')}
              >
                📱 Yape / Plin
              </button>
              <button
                type="button"
                className={`pago-pill ${abonoMetodoPago === 'mixto' ? 'active' : ''}`}
                onClick={() => {
                  setAbonoMetodoPago('mixto');
                  const total = parseFloat(abonoMonto) || 0;
                  setAbonoEfectivo((total / 2).toFixed(2));
                  setAbonoYape((total / 2).toFixed(2));
                }}
              >
                🔄 Mixto
              </button>
            </div>
          </div>

          {/* Campos duales si es Mixto */}
          {abonoMetodoPago === 'mixto' && (
            <div className="mixto-inputs-grid">
              <div className="form-group">
                <label>Efectivo ({simboloMoneda})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={abonoEfectivo}
                  onChange={(e) => handleMixtoEfectivoChange(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Yape ({simboloMoneda})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={abonoYape}
                  onChange={(e) => handleMixtoYapeChange(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Fecha */}
          <div className="form-group">
            <label htmlFor="abono-fecha-input">Fecha del Pago</label>
            <input
              id="abono-fecha-input"
              type="date"
              value={abonoFecha}
              onChange={(e) => setAbonoFecha(e.target.value)}
              required
            />
          </div>

          {/* Nota opcional */}
          <div className="form-group">
            <label htmlFor="abono-nota-input">Nota / Comentario (opcional)</label>
            <input
              id="abono-nota-input"
              type="text"
              placeholder="Ej: Pago quincena, adelanto en tienda..."
              value={abonoDescripcion}
              onChange={(e) => setAbonoDescripcion(e.target.value)}
            />
          </div>

          <div className="android-modal-actions-footer">
            <button type="submit" className="btn-android-guardar" disabled={guardandoAbono}>
              {guardandoAbono ? (
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
