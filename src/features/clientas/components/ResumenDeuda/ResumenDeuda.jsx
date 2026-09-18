import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Tarjetas de resumen global (Deuda Total + Total Abonado).
 *
 * Props:
 *   resumen          {object} { totalDeuda, totalAbonos }
 *   formatCurrency   {function}
 */
export default function ResumenDeuda({ resumen, formatCurrency }) {
  if (!resumen) return null;

  return (
    <div className="resumen-global-grid">
      <div className="resumen-global-card card-deuda">
        <div className="resumen-card-header">
          <div className="resumen-icon icon-deuda">
            <TrendingUp size={18} strokeWidth={2.5} />
          </div>
          <div>
            <span className="resumen-card-label">Deuda Total</span>
          </div>
        </div>
        <div className="resumen-card-monto monto-deuda">
          {formatCurrency(resumen.totalDeuda)}
        </div>
      </div>

      <div className="resumen-global-card card-abono">
        <div className="resumen-card-header">
          <div className="resumen-icon icon-abono">
            <TrendingDown size={18} strokeWidth={2.5} />
          </div>
          <div>
            <span className="resumen-card-label">Total Abonado</span>
          </div>
        </div>
        <div className="resumen-card-monto monto-abono">
          {formatCurrency(resumen.totalAbonos)}
        </div>
      </div>
    </div>
  );
}
