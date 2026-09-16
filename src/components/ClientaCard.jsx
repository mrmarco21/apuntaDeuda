import React from 'react';
import { useConfig } from '../context/ConfigContext';
import './ClientaCard.css';

export default function ClientaCard({ clienta, onClick }) {
  const { formatCurrency } = useConfig();
  const { nombre, saldoActual, tieneCuentaActiva, numeroCuentasActivas, sinCuenta } = clienta;
  const tieneDeuda = saldoActual > 0;

  let estadoClass = 'badge-sin-cuenta';
  let estadoTexto = 'Sin cuenta';
  if (tieneDeuda) {
    estadoClass = 'badge-deuda';
    estadoTexto = 'Con deuda';
  } else if (tieneCuentaActiva) {
    estadoClass = 'badge-al-dia';
    estadoTexto = 'Al día';
  }

  const iniciales = nombre
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <button className="clienta-card" onClick={onClick}>
      <div className={`clienta-avatar ${estadoClass}`}>{iniciales}</div>
      <div className="clienta-info">
        <span className="clienta-nombre">{nombre}</span>
        <div className="clienta-estado-row">
          <span className={`estado-badge ${estadoClass}`}>{estadoTexto}</span>
          {numeroCuentasActivas > 1 && (
            <span className="estado-badge badge-cuentas">{numeroCuentasActivas} cuentas</span>
          )}
        </div>
      </div>
      {tieneDeuda && <span className="clienta-saldo">{formatCurrency(saldoActual)}</span>}
    </button>
  );
}