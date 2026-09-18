import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Fila individual para un movimiento dentro del acordeón de una cuenta.
 *
 * Props:
 *   mov                      {object}
 *   extraerDescripcionLimpia {function}
 *   formatDate               {function}
 *   formatCurrency           {function}
 *   setModalDetalleMov       {function}
 */
export default function MovimientoItem({
  mov,
  esUltimo = true,
  extraerDescripcionLimpia,
  formatDate,
  formatCurrency,
  setModalDetalleMov
}) {
  if (!mov) return null;

  const esCargo = mov.tipo === 'CARGO' || mov.tipo === 'cargo' || mov.tipo === 'venta';
  const descLimpia = extraerDescripcionLimpia(mov.comentario || mov.descripcion, mov.tipo);

  return (
    <div
      key={mov.id || mov.movimiento_id}
      className={`movimiento-mini-row ${esCargo ? 'mini-cargo' : 'mini-abono'} ${mov.anulado ? 'mini-anulado' : ''}`}
      onClick={() => setModalDetalleMov({ ...mov, esUltimo })}
    >
      <div className="mini-row-left">
        <div className={`mini-badge-tipo ${esCargo ? 'badge-cargo' : 'badge-abono'}`}>
          {esCargo ? (
            <TrendingUp size={13} strokeWidth={2.5} />
          ) : (
            <TrendingDown size={13} strokeWidth={2.5} />
          )}
        </div>
        <div className="mini-info">
          <span className={`mini-desc ${mov.anulado ? 'desc-tachada monto-tachado' : ''}`}>{descLimpia}</span>
          <span className="mini-fecha">{formatDate(mov.fecha)}</span>
        </div>
      </div>

      <div className="mini-row-right">
        <span className={`mini-monto ${esCargo ? 'monto-rojo' : 'monto-verde'} ${mov.anulado ? 'monto-tachado' : ''}`}>
          {esCargo ? '+' : '-'}{formatCurrency(mov.monto)}
        </span>
      </div>
    </div>
  );
}
