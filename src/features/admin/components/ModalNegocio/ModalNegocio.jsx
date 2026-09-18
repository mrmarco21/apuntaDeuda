import React from 'react';
import {
  RiCloseLine,
  RiBuilding4Line,
  RiVipCrownLine,
  RiWhatsappLine,
  RiCalendarEventLine,
  RiShieldCheckLine,
  RiErrorWarningLine,
} from 'react-icons/ri';
import ImageUploader from '../../../../components/common/ImageUploader/ImageUploader';

/**
 * Modal para registrar o editar un negocio en la plataforma con soporte SaaS de suscripciones y WhatsApp.
 */
export default function ModalNegocio({
  modalAbierto,
  cerrarModal,
  modoEdicion,
  handleSubmit,
  errorModal,
  formNombre,
  setFormNombre,
  formLogoUrl,
  setFormLogoUrl,
  formActivo,
  setFormActivo,
  formWhatsapp,
  setFormWhatsapp,
  formPlan,
  setFormPlan,
  formFechaVencimiento,
  setFormFechaVencimiento,
  guardando,
}) {
  if (!modalAbierto) return null;

  return (
    <div className="admin-modal-overlay" onClick={cerrarModal}>
      <div className="admin-modal-box modal-negocio-wide" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-header">
          <div>
            <h2>{modoEdicion ? 'Editar Negocio y Suscripción' : 'Nuevo Negocio SaaS'}</h2>
            <p className="admin-modal-sub">
              {modoEdicion
                ? 'Modifica los datos del negocio, contacto y vigencia del plan SaaS'
                : 'Registra un nuevo negocio y configura su plan de suscripción'}
            </p>
          </div>
          <button
            className="admin-modal-close"
            onClick={cerrarModal}
            disabled={guardando}
            aria-label="Cerrar modal"
          >
            <RiCloseLine size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-modal-form">
          {errorModal && (
            <div className="admin-modal-error">
              <RiErrorWarningLine size={18} />
              <span>{errorModal}</span>
            </div>
          )}

          {/* Grid de 2 columnas en PC */}
          <div className="modal-form-grid-2col">
            {/* Columna 1: Información del Negocio */}
            <div className="modal-form-section">
              <h3 className="modal-section-title">
                <RiBuilding4Line size={18} /> <span>Información del Negocio</span>
              </h3>

              {/* Nombre */}
              <div className="admin-form-group">
                <label htmlFor="negocio-nombre">
                  Nombre del Negocio <span className="req">*</span>
                </label>
                <input
                  id="negocio-nombre"
                  type="text"
                  placeholder="Ej: Tienda Modas Bella"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  autoFocus
                  className="admin-form-input"
                />
              </div>

              {/* WhatsApp de Contacto */}
              <div className="admin-form-group">
                <label htmlFor="negocio-whatsapp">
                  WhatsApp Comercial <span className="opt">(para contacto directo)</span>
                </label>
                <div className="input-with-icon-wrap">
                  <RiWhatsappLine size={18} className="input-icon-left text-success-icon" />
                  <input
                    id="negocio-whatsapp"
                    type="text"
                    placeholder="Ej: 51987654321"
                    value={formWhatsapp || ''}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    className="admin-form-input input-padded-left"
                  />
                </div>
                <span className="admin-form-hint">
                  Incluye código de país (ej: 51987654321) para enlaces wa.me.
                </span>
              </div>

              {/* Logo / ImageUploader */}
              <div className="admin-form-group">
                <ImageUploader
                  value={formLogoUrl}
                  onChange={(newUrl) => setFormLogoUrl(newUrl)}
                  label="Logotipo del Negocio"
                  description="Sube o ingresa la URL de la imagen del negocio."
                  fallbackSrc="/logo.png"
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Columna 2: Plan SaaS y Suscripción */}
            <div className="modal-form-section">
              <h3 className="modal-section-title">
                <RiVipCrownLine size={18} /> <span>Suscripción SaaS y Estado</span>
              </h3>

              {/* Plan de Suscripción */}
              <div className="admin-form-group">
                <label htmlFor="negocio-plan">Plan de Suscripción</label>
                <select
                  id="negocio-plan"
                  value={formPlan || 'mensual'}
                  onChange={(e) => setFormPlan(e.target.value)}
                  className="admin-form-input"
                >
                  <option value="prueba">Prueba Gratuita (Demo)</option>
                  <option value="mensual">Plan Mensual</option>
                  <option value="anual">Plan Anual</option>
                  <option value="vitalicio">Plan Vitalicio / Licencia Completa</option>
                </select>
              </div>

              {/* Fecha de Vencimiento */}
              <div className="admin-form-group">
                <label htmlFor="negocio-vencimiento">Fecha de Vencimiento</label>
                <div className="input-with-icon-wrap">
                  <RiCalendarEventLine size={18} className="input-icon-left" />
                  <input
                    id="negocio-vencimiento"
                    type="date"
                    value={formFechaVencimiento ? formFechaVencimiento.split('T')[0] : ''}
                    onChange={(e) => setFormFechaVencimiento(e.target.value)}
                    className="admin-form-input input-padded-left"
                  />
                </div>
                <span className="admin-form-hint">
                  Déjala vacía si el negocio tiene acceso ilimitado o vitalicio.
                </span>
              </div>

              {/* Estado Activo / Inactivo */}
              <div className="admin-form-group margin-top-auto">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formActivo}
                    onChange={(e) => setFormActivo(e.target.checked)}
                    className="admin-checkbox-input"
                  />
                  <div>
                    <span className="admin-check-title flex-icon-sub">
                      <RiShieldCheckLine size={16} className={formActivo ? 'text-success-icon' : ''} />
                      Servicio Habilitado
                    </span>
                    <span className="admin-check-desc">
                      Si está activo, los usuarios del negocio podrán ingresar y operar en el sistema.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer de Acciones */}
          <div className="admin-modal-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              onClick={cerrarModal}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="admin-btn-primary"
              disabled={guardando}
            >
              {guardando ? (
                <>
                  <span className="admin-mini-spinner" />
                  Guardando...
                </>
              ) : modoEdicion ? (
                'Actualizar Negocio'
              ) : (
                'Crear Negocio'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

