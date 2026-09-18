import React from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import CuentaCard from '../CuentaCard/CuentaCard';

/**
 * Sección de acordeón para el historial de cuentas cerradas (saldadas).
 *
 * Props:
 *   cuentasCerradas            {array}
 *   showHistorialCerradas      {boolean}
 *   setShowHistorialCerradas  {function}
 *   cuentasExpandidas          {object}
 *   toggleCuentaExpandida      {function}
 *   movimientosExpandidos      {object}
 *   toggleMostrarTodosMovs     {function}
 *   abrirModalEditarNotaCuenta {function}
 *   formatDate                 {function}
 *   formatCurrency             {function}
 *   extraerDescripcionLimpia   {function}
 *   setModalDetalleMov         {function}
 *   simboloMoneda              {string}
 */
export default function HistorialCuentasCerradas({
  cuentasCerradas = [],
  showHistorialCerradas,
  setShowHistorialCerradas,
  cuentasExpandidas,
  toggleCuentaExpandida,
  movimientosExpandidos,
  toggleMostrarTodosMovs,
  abrirModalEditarNotaCuenta,
  formatDate,
  formatCurrency,
  extraerDescripcionLimpia,
  setModalDetalleMov,
  simboloMoneda
}) {
  if (!cuentasCerradas || cuentasCerradas.length === 0) return null;

  return (
    <div className="historial-cuentas-cerradas-section" id="historial-cuentas-section">
      <button
        type="button"
        className="btn-toggle-historial-cerradas"
        onClick={() => setShowHistorialCerradas(!showHistorialCerradas)}
      >
        <div className="historial-toggle-left">
          <Clock size={20} strokeWidth={2} />
          <div>
            <span className="historial-toggle-title">Historial de cuentas</span>
            <span className="historial-toggle-sub">
              {cuentasCerradas.length} {cuentasCerradas.length === 1 ? 'cuenta saldada' : 'cuentas saldadas'}
            </span>
          </div>
        </div>
        <ChevronDown
          size={20}
          strokeWidth={2}
          className={`chevron-icon ${showHistorialCerradas ? 'rotated' : ''}`}
        />
      </button>

      {showHistorialCerradas && (
        <div className="cuentas-cerradas-lista">
          {cuentasCerradas.map((c, i) => {
            const numeroCuenta = c.numeroCuenta || i + 1;
            return (
              <CuentaCard
                key={c.id}
                cuenta={c}
                numeroCuenta={numeroCuenta}
                abrirModalEditarNotaCuenta={abrirModalEditarNotaCuenta}
                formatDate={formatDate}
                formatCurrency={formatCurrency}
                cuentasExpandidas={cuentasExpandidas}
                toggleCuentaExpandida={toggleCuentaExpandida}
                movimientosExpandidos={movimientosExpandidos}
                toggleMostrarTodosMovs={toggleMostrarTodosMovs}
                extraerDescripcionLimpia={extraerDescripcionLimpia}
                setModalDetalleMov={setModalDetalleMov}
                esCerrada={true}
                simboloMoneda={simboloMoneda}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
