import React from 'react';
import { Pencil, Plus, Minus, ChevronDown } from 'lucide-react';
import MovimientoItem from '../MovimientoItem/MovimientoItem';

/**
 * Tarjeta de presentación de una cuenta (activa o cerrada) con su saldo y acordeón de movimientos.
 *
 * Props:
 *   cuenta                      {object}
 *   numeroCuenta                {number}
 *   estiloColor                 {object} { bg, border, numero }
 *   abrirModalEditarNotaCuenta  {function}
 *   formatDate                  {function}
 *   formatCurrency              {function}
 *   abrirModalCargo             {function}
 *   abrirModalAbono             {function}
 *   cuentasExpandidas           {object}
 *   toggleCuentaExpandida       {function}
 *   movimientosExpandidos       {object}
 *   toggleMostrarTodosMovs      {function}
 *   extraerDescripcionLimpia    {function}
 *   setModalDetalleMov          {function}
 *   esCerrada                   {boolean}
 *   simboloMoneda               {string}
 */
export default function CuentaCard({
  cuenta,
  numeroCuenta,
  estiloColor = { bg: '#E1F5FE', border: '#0288D1', numero: '#0288D1' },
  abrirModalEditarNotaCuenta,
  formatDate,
  formatCurrency,
  abrirModalCargo,
  abrirModalAbono,
  cuentasExpandidas = {},
  toggleCuentaExpandida,
  movimientosExpandidos = {},
  toggleMostrarTodosMovs,
  extraerDescripcionLimpia,
  setModalDetalleMov,
  esCerrada = false,
  simboloMoneda = 'S/'
}) {
  if (!cuenta) return null;

  const movs = cuenta.movimientos || [];
  const primerNoAnulado = movs.find((m) => !m.anulado) || movs[0];
  const ultimoMovId = primerNoAnulado ? (primerNoAnulado.id || primerNoAnulado.movimiento_id) : null;

  const isExpanded = cuentasExpandidas[cuenta.id];
  const showAll = movimientosExpandidos[cuenta.id];
  const visibleMovs = showAll ? movs : movs.slice(0, 3);

  if (esCerrada) {
    return (
      <div className="cuenta-cerrada-card">
        <div className="cerrada-header">
          <div className="cerrada-title-wrap">
            <div className="cuenta-badge-numero badge-cerrada-num">
              #{numeroCuenta}
            </div>
            <div className="cuenta-title-texts">
              <div className="cuenta-nombre-linea">
                <span className="cerrada-nombre-cuenta">Cuenta #{numeroCuenta}</span>
                {cuenta.nota && (
                  <span className="cuenta-nota-inline" title="Nota de la cuenta">
                    · {cuenta.nota}
                  </span>
                )}
                <button
                  type="button"
                  className="btn-edit-nota-cuenta"
                  onClick={() => abrirModalEditarNotaCuenta(cuenta)}
                  title={cuenta.nota ? "Editar nota de la cuenta" : "Agregar nota a esta cuenta"}
                >
                  <Pencil size={12} strokeWidth={2.2} />
                </button>
              </div>
              <span className="cerrada-fecha">Creada: {formatDate(cuenta.fechaCreacion)}</span>
              {cuenta.nota && (
                <span className="cuenta-nota-mobile">
                  {cuenta.nota}
                </span>
              )}
            </div>
          </div>
          <span className="badge-cerrada">Saldada ({simboloMoneda} 0.00)</span>
        </div>

        {/* Acordeón de movimientos de la cuenta cerrada */}
        {movs.length > 0 && (
          <div className="cuenta-movimientos-wrap cerrada-movs-wrap">
            <button
              className="movimientos-toggle-btn"
              onClick={() => toggleCuentaExpandida(cuenta.id)}
            >
              <span className="movimientos-toggle-titulo">
                Movimientos ({movs.length})
              </span>
              <ChevronDown
                size={18}
                strokeWidth={2}
                className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}
              />
            </button>

            {isExpanded && (
              <div className="cuenta-movimientos-tabla">
                <div className="movimientos-tabla-header">
                  <span>Descripción</span>
                  <span>Monto</span>
                </div>

                {visibleMovs.map((mov) => {
                  const movId = mov.id || mov.movimiento_id;
                  const esUltimo = movId === ultimoMovId;
                  return (
                    <MovimientoItem
                      key={movId}
                      mov={mov}
                      esUltimo={esUltimo}
                      extraerDescripcionLimpia={extraerDescripcionLimpia}
                      formatDate={formatDate}
                      formatCurrency={formatCurrency}
                      setModalDetalleMov={setModalDetalleMov}
                    />
                  );
                })}

                {movs.length > 3 && (
                  <button
                    className="btn-ver-mas-movs"
                    onClick={() => toggleMostrarTodosMovs(cuenta.id)}
                  >
                    {showAll ? 'Ver menos' : `+${movs.length - 3} movimientos más`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="cuenta-card"
      style={{ borderLeftColor: estiloColor.border }}
    >
      {/* CABECERA CUENTA */}
      <div className="cuenta-card-header">
        <div className="cuenta-title-wrap">
          <div
            className="cuenta-badge-numero"
            style={{
              backgroundColor: estiloColor.bg,
              borderColor: estiloColor.border,
              color: estiloColor.numero
            }}
          >
            #{numeroCuenta}
          </div>
          <div className="cuenta-title-texts">
            <div className="cuenta-nombre-linea">
              <h3 className="cuenta-nombre-titulo">Cuenta #{numeroCuenta}</h3>
              {cuenta.nota && (
                <span className="cuenta-nota-inline" title="Nota de la cuenta">
                  · {cuenta.nota}
                </span>
              )}
              <button
                type="button"
                className="btn-edit-nota-cuenta"
                onClick={() => abrirModalEditarNotaCuenta(cuenta)}
                title={cuenta.nota ? "Editar nota de la cuenta" : "Agregar nota a esta cuenta"}
              >
                <Pencil size={12} strokeWidth={2.2} />
              </button>
            </div>
            <span className="cuenta-fecha-creacion">
              Desde {formatDate(cuenta.fechaCreacion)}
            </span>
            {cuenta.nota && (
              <span className="cuenta-nota-mobile">
                {cuenta.nota}
              </span>
            )}
          </div>
        </div>

        <div className="cuenta-saldo-block">
          <span className="cuenta-saldo-label">SALDO ACTUAL</span>
          <span className={`cuenta-saldo-valor ${cuenta.saldo > 0 ? 'saldo-deuda' : 'saldo-cero'}`}>
            {formatCurrency(cuenta.saldo)}
          </span>
        </div>
      </div>

      {/* BOTONES ACCIÓN POR CUENTA */}
      <div className="cuenta-acciones-row">
        <button
          className="btn-cuenta-accion btn-cargo"
          onClick={() => abrirModalCargo(cuenta.id, false)}
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Registrar venta</span>
        </button>

        <button
          className="btn-cuenta-accion btn-abono"
          onClick={() => abrirModalAbono(cuenta.id)}
        >
          <Minus size={18} strokeWidth={2.5} />
          <span>Registrar pago</span>
        </button>
      </div>

      {/* ACORDEÓN MOVIMIENTOS */}
      {movs.length > 0 && (
        <div className="cuenta-movimientos-wrap">
          <button
            className="movimientos-toggle-btn"
            onClick={() => toggleCuentaExpandida(cuenta.id)}
          >
            <span className="movimientos-toggle-titulo">
              Movimientos ({movs.length})
            </span>
            <ChevronDown
              size={18}
              strokeWidth={2}
              className={`chevron-icon ${isExpanded ? 'rotated' : ''}`}
            />
          </button>

          {isExpanded && (
            <div className="cuenta-movimientos-tabla">
              <div className="movimientos-tabla-header">
                <span>Descripción</span>
                <span>Monto</span>
              </div>

              {visibleMovs.map((mov) => {
                const movId = mov.id || mov.movimiento_id;
                const esUltimo = movId === ultimoMovId;
                return (
                  <MovimientoItem
                    key={movId}
                    mov={mov}
                    esUltimo={esUltimo}
                    extraerDescripcionLimpia={extraerDescripcionLimpia}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    setModalDetalleMov={setModalDetalleMov}
                  />
                );
              })}

              {movs.length > 3 && (
                <button
                  className="btn-ver-mas-movs"
                  onClick={() => toggleMostrarTodosMovs(cuenta.id)}
                >
                  {showAll ? 'Ver menos' : `+${movs.length - 3} movimientos más`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
