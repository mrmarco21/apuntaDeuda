import React from 'react';
import { useAuth } from '../../../../context/AuthContext';
import ImageUploader from '../../../../components/common/ImageUploader/ImageUploader';

/**
 * Tab de Preferencias del Negocio con información de Suscripción y Plan Activo.
 */
export default function TabNegocio({
  nombreNegocio,
  setNombreNegocio,
  logoUrl,
  setLogoUrl,
  moneda,
  setMoneda,
  simboloMoneda,
  setSimboloMoneda,
  mensajeCobro,
  setMensajeCobro,
  handleGuardarNegocio,
  savingNegocio
}) {
  const { negocioActual } = useAuth();

  const planNombre = negocioActual?.plan === 'vitalicio'
    ? '♾️ Plan Vitalicio / Licencia Completa'
    : negocioActual?.plan === 'prueba'
    ? '🆓 Periodo de Prueba Gratuito (Demo)'
    : negocioActual?.plan === 'anual'
    ? '⭐ Plan Anual'
    : '📅 Plan Mensual';

  const fechaVencStr = negocioActual?.plan === 'vitalicio'
    ? 'Acceso Ilimitado'
    : negocioActual?.fecha_vencimiento
    ? new Date(negocioActual.fecha_vencimiento).toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : 'Sin fecha límite asignada';

  return (
    <div className="config-card">
      <div className="card-header">
        <h2>Preferencias del Negocio y Plan</h2>
        <p className="card-subtitle">Personaliza tu logotipo, moneda, nombre comercial y consulta el estado de tu servicio.</p>
      </div>

      {/* Tarjeta Informativa de Suscripción */}
      <div className="sub-info-banner">
        <div className="sub-info-left">
          <span className="sub-info-badge">Plan de Servicio ApuntaDeuda</span>
          <h3 className="sub-info-title">{planNombre}</h3>
          <p className="sub-info-date">Vigencia: <strong>{fechaVencStr}</strong></p>
        </div>
        <div className="sub-info-status">
          <span className="sub-status-pill online">🟢 Servicio Habilitado</span>
        </div>
      </div>

      <form onSubmit={handleGuardarNegocio} className="config-form">
        <div className="form-group-grid">
          <div className="form-field full-width">
            <ImageUploader
              value={logoUrl}
              onChange={(newUrl) => setLogoUrl(newUrl)}
              label="Logotipo del Negocio"
              description="Sube la imagen de tu negocio. Se mostrará en el menú lateral, encabezados y en toda la plataforma."
              fallbackSrc="/logo.png"
            />
          </div>

          <div className="form-field">
            <label htmlFor="negocio">Nombre Comercial</label>
            <input
              id="negocio"
              type="text"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              placeholder="Ej. Tienda Modas Bella"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="moneda">Moneda Principal</label>
            <select
              id="moneda"
              value={moneda}
              onChange={(e) => {
                const val = e.target.value;
                setMoneda(val);
                if (val === 'PEN') setSimboloMoneda('S/');
                else if (val === 'USD' || val === 'MXN' || val === 'COP' || val === 'CLP' || val === 'ARS') setSimboloMoneda('$');
                else if (val === 'EUR') setSimboloMoneda('€');
                else if (val === 'BOB') setSimboloMoneda('Bs.');
                else if (val === 'GTQ') setSimboloMoneda('Q');
                else if (val === 'CRC') setSimboloMoneda('₡');
                else if (val === 'HNL') setSimboloMoneda('L');
              }}
            >
              <option value="PEN">Soles Peruanos (PEN - S/)</option>
              <option value="USD">Dólar Estadounidense (USD - $)</option>
              <option value="EUR">Euros (EUR - €)</option>
              <option value="MXN">Pesos Mexicanos (MXN - $)</option>
              <option value="COP">Pesos Colombianos (COP - $)</option>
              <option value="CLP">Pesos Chilenos (CLP - $)</option>
              <option value="ARS">Pesos Argentinos (ARS - $)</option>
              <option value="BOB">Bolivianos (BOB - Bs.)</option>
              <option value="GTQ">Quetzales (GTQ - Q)</option>
              <option value="CRC">Colones Costarricenses (CRC - ₡)</option>
              <option value="HNL">Lempiras Hondureños (HNL - L)</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="simboloMoneda">Símbolo de Moneda</label>
            <input
              id="simboloMoneda"
              type="text"
              value={simboloMoneda}
              onChange={(e) => setSimboloMoneda(e.target.value)}
              placeholder="Ej: S/, $, €, Bs."
              required
              maxLength="6"
            />
            <small className="help-text">
              Símbolo visible en tarjetas, balances y reportes de toda la app.
            </small>
          </div>

          <div className="form-field full-width">
            <label htmlFor="mensajeCobro">Plantilla de Recordatorio de Cobro (WhatsApp)</label>
            <textarea
              id="mensajeCobro"
              rows="3"
              value={mensajeCobro}
              onChange={(e) => setMensajeCobro(e.target.value)}
              placeholder="Escribe el mensaje plantilla..."
            />
            <small className="help-text">
              Variables disponibles: <code>{'{clienta}'}</code>, <code>{'{saldo}'}</code>
            </small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={savingNegocio}>
            {savingNegocio ? 'Guardando...' : 'Guardar Preferencias'}
          </button>
        </div>
      </form>
    </div>
  );
}
