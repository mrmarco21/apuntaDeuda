import React from 'react';
import { Download, Copy, Image as ImageIcon } from 'lucide-react';
import { RiWhatsappLine } from 'react-icons/ri';

/**
 * Modal para compartir el estado de cuenta en formato de imagen/foto (voucher).
 *
 * Props:
 *   showModalCompartir        {boolean}
 *   setShowModalCompartir     {function}
 *   todasLasCuentas           {array}
 *   cuentaCompartirId         {string}
 *   setCuentaCompartirId      {function}
 *   obtenerDatosVoucher       {function}
 *   negocioActual             {object}
 *   config                    {object}
 *   clienta                   {object}
 *   simboloMoneda             {string}
 *   formatCurrency            {function}
 *   formatDate                {function}
 *   getFechaHoyLocal          {function}
 *   voucherRef                {object} (ref)
 *   handleCompartirFoto       {function}
 *   handleDescargarFoto       {function}
 *   handleCopiarFoto          {function}
 *   generandoFoto             {boolean}
 *   cuentas                   {array}
 *   cuentasCerradas           {array}
 */
export default function ModalCompartirCuenta({
  showModalCompartir,
  setShowModalCompartir,
  todasLasCuentas = [],
  cuentaCompartirId,
  setCuentaCompartirId,
  obtenerDatosVoucher,
  negocioActual,
  config,
  clienta,
  simboloMoneda,
  formatCurrency,
  formatDate,
  getFechaHoyLocal,
  voucherRef,
  handleCompartirFoto,
  handleDescargarFoto,
  handleCopiarFoto,
  generandoFoto,
  cuentas = [],
  cuentasCerradas = []
}) {
  if (!showModalCompartir) return null;

  const cuentaTarget =
    todasLasCuentas.find((c) => String(c.id) === String(cuentaCompartirId)) ||
    todasLasCuentas[0] ||
    null;

  const {
    numeroCuenta,
    nota,
    esSaldada,
    creditosList,
    abonosList,
    totalCreditos,
    totalPagos,
    saldoActual
  } = obtenerDatosVoucher(cuentaTarget);

  const logoMostrado = negocioActual?.logo_url || '/logo.png';
  const nombreNegocioMostrado = negocioActual?.nombre || config?.nombreNegocio || 'Control de Cobranzas';

  return (
    <div className="modal-overlay" onClick={() => setShowModalCompartir(false)}>
      <div className="modal-content modal-compartir-foto-wrap" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="nueva-cuenta-header-title">
            <div className="nueva-cuenta-icon-badge" style={{ background: '#e0f2fe', color: '#0288d1' }}>
              <ImageIcon size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem' }}>Estado de Cuenta</h2>
              <p className="modal-subtitle">Para {clienta?.nombre || 'la clienta'}</p>
            </div>
          </div>
          <button className="btn-close" onClick={() => setShowModalCompartir(false)}>
            &times;
          </button>
        </div>

        <div className="share-foto-modal-body">
          {/* SELECTOR DE CUENTA SI HAY MÁS DE UNA */}
          {todasLasCuentas.length > 1 && (
            <div className="share-cuenta-selector-card">
              <label htmlFor="select-cuenta-share">Elige la cuenta a generar:</label>
              <select
                id="select-cuenta-share"
                className="share-select-input"
                value={cuentaCompartirId || ''}
                onChange={(e) => setCuentaCompartirId(e.target.value)}
              >
                {cuentas.length > 0 && (
                  <optgroup label="Cuentas Activas">
                    {cuentas.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        Cuenta #{c.numeroCuenta || i + 1}{c.nota ? ` (${c.nota})` : ''} - Saldo: {formatCurrency(c.saldo)}
                      </option>
                    ))}
                  </optgroup>
                )}
                {cuentasCerradas.length > 0 && (
                  <optgroup label="Historial de Cuentas (Saldadas)">
                    {cuentasCerradas.map((c, i) => (
                      <option key={c.id} value={c.id}>
                        Cuenta #{c.numeroCuenta || i + 1}{c.nota ? ` (${c.nota})` : ''} - Saldada ({simboloMoneda || 'S/'} 0.00)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          {/* CONTENEDOR DE PREVISUALIZACIÓN Y CAPTURA DEL VOUCHER */}
          <div className="voucher-preview-header">
            <span className="voucher-preview-label">
              <ImageIcon size={14} strokeWidth={2.2} />
              Previsualización del Comprobante (Foto)
            </span>
          </div>

          <div className="voucher-scroll-wrapper">
            <div ref={voucherRef} id="voucher-foto-card-print" className="voucher-foto-card">
              {/* ENCABEZADO CON LOGO Y MARCA */}
              <div className="voucher-brand-header">
                <img
                  src={logoMostrado}
                  alt="Logo Negocio"
                  className="voucher-logo-image"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    e.target.src = '/logo.png';
                  }}
                />
                <div className="voucher-negocio-name">{nombreNegocioMostrado}</div>
                <div className="voucher-system-sub">
                  <span className="voucher-system-brand">ApuntaDeuda</span> · SISTEMA DE GESTIÓN Y CONTROL DE COBRANZAS
                </div>
              </div>

              <div className="voucher-hr" />

              {/* METADATOS DEL DOCUMENTO */}
              <div className="voucher-meta-row">
                <div>
                  <span className="voucher-meta-title">ESTADO DE CUENTA</span>
                  <span className="voucher-meta-cuenta">
                    Cuenta #{numeroCuenta}{nota ? ` · ${nota}` : ''}
                  </span>
                </div>
                <div className="voucher-meta-right">
                  <div>
                    <span>Emisión:</span> <strong>{formatDate(getFechaHoyLocal())}</strong>
                  </div>
                  <div>
                    <span>Estado:</span>{' '}
                    <span className={esSaldada ? 'voucher-badge-saldada' : 'voucher-badge-pendiente'}>
                      {esSaldada ? 'SALDADA' : 'PENDIENTE'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DATOS DEL CLIENTE */}
              <div className="voucher-client-card">
                <div className="voucher-client-field">
                  <span className="voucher-client-label">CLIENTE:</span>
                  <span className="voucher-client-val">{clienta?.nombre?.toUpperCase()}</span>
                </div>
                {clienta?.telefono && (
                  <div className="voucher-client-field">
                    <span className="voucher-client-label">TELÉFONO:</span>
                    <span className="voucher-client-val">{clienta.telefono}</span>
                  </div>
                )}
              </div>

              {/* TABLA: CRÉDITOS Y COMPRAS */}
              <div className="voucher-block">
                <div className="voucher-block-header">CRÉDITOS Y COMPRAS REGISTRADAS</div>
                <table className="voucher-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Fecha</th>
                      <th>Descripción / Producto</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Cant.</th>
                      <th style={{ width: '22%', textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creditosList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="voucher-table-empty">
                          Sin compras registradas en esta cuenta
                        </td>
                      </tr>
                    ) : (
                      creditosList.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.fecha}</td>
                          <td>{item.descripcion}</td>
                          <td style={{ textAlign: 'center' }}>{item.cantidad || 1}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.monto}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="voucher-total-label">
                        Total compras (Deuda inicial):
                      </td>
                      <td className="voucher-total-val">{formatCurrency(totalCreditos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* TABLA: PAGOS Y ABONOS */}
              <div className="voucher-block">
                <div className="voucher-block-header">PAGOS Y ABONOS REALIZADOS</div>
                <table className="voucher-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Fecha</th>
                      <th>Método / Referencia</th>
                      <th style={{ width: '25%', textAlign: 'right' }}>Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {abonosList.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="voucher-table-empty">
                          Sin abonos registrados en esta cuenta
                        </td>
                      </tr>
                    ) : (
                      abonosList.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.fecha}</td>
                          <td>{item.metodo}</td>
                          <td style={{ textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                            {item.monto}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2" className="voucher-total-label">
                        Total abonado:
                      </td>
                      <td className="voucher-total-val" style={{ color: '#15803d' }}>
                        {formatCurrency(totalPagos)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* RESUMEN FINANCIERO */}
              <div className="voucher-summary-grid">
                <div className="voucher-summary-box">
                  <span className="voucher-box-label">DEUDA INICIAL</span>
                  <span className="voucher-box-val">{formatCurrency(totalCreditos)}</span>
                </div>
                <div className="voucher-summary-box">
                  <span className="voucher-box-label">TOTAL ABONADO</span>
                  <span className="voucher-box-val" style={{ color: '#15803d' }}>
                    {formatCurrency(totalPagos)}
                  </span>
                </div>
                <div className={`voucher-summary-box voucher-box-saldo ${esSaldada ? 'box-saldada' : 'box-deuda'}`}>
                  <span className="voucher-box-label">SALDO PENDIENTE</span>
                  <span className="voucher-box-val-main" style={{ color: esSaldada ? '#15803d' : '#dc2626' }}>
                    {formatCurrency(esSaldada ? 0 : saldoActual)}
                  </span>
                </div>
              </div>

              {/* PIE DE VOUCHER */}
              <div className="voucher-brand-footer">
                <div>Comprobante emitido electrónicamente por <strong>ApuntaDeuda</strong></div>
                <div>{nombreNegocioMostrado} · {formatDate(getFechaHoyLocal())}</div>
              </div>
            </div>
          </div>

          {/* ACCIONES DE FOTO */}
          <div className="share-foto-actions">
            <button
              type="button"
              className="btn-action-foto-share"
              onClick={() => handleCompartirFoto(cuentaTarget)}
              disabled={generandoFoto}
              title="Compartir la foto por WhatsApp u otras aplicaciones"
            >
              <RiWhatsappLine size={19} />
              <span>{generandoFoto ? 'Procesando...' : 'Compartir Foto'}</span>
            </button>

            <button
              type="button"
              className="btn-action-foto-download"
              onClick={() => handleDescargarFoto(cuentaTarget)}
              disabled={generandoFoto}
              title="Descargar foto en formato PNG alta resolución"
            >
              <Download size={18} />
              <span>Descargar PNG</span>
            </button>

            <button
              type="button"
              className="btn-action-foto-copy"
              onClick={() => handleCopiarFoto()}
              disabled={generandoFoto}
              title="Copiar imagen al portapapeles para pegarla con Ctrl+V"
            >
              <Copy size={17} />
              <span>Copiar Foto (Ctrl+V)</span>
            </button>
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: '0.85rem', borderTop: '1px solid var(--color-borderLight, #f1f5f9)', paddingTop: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowModalCompartir(false)}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
