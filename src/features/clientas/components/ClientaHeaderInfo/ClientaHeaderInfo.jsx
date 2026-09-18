import React from 'react';
import { Pencil, Phone, MapPin, User, Tag, ChevronDown } from 'lucide-react';

/**
 * Componente del perfil y datos de la clienta.
 *
 * Props:
 *   clienta                   {object}
 *   abrirModalEditarClienta   {function}
 *   showDetallesClienta       {boolean}
 *   setShowDetallesClienta   {function}
 */
export default function ClientaHeaderInfo({
  clienta,
  abrirModalEditarClienta,
  showDetallesClienta,
  setShowDetallesClienta
}) {
  if (!clienta) return null;

  return (
    <div className="clienta-profile-card">
      <div className="profile-main">
        <div className="profile-avatar">
          {clienta.nombre ? clienta.nombre.charAt(0).toUpperCase() : 'C'}
        </div>
        <div className="profile-info">
          <div className="profile-name-row">
            <h1>{clienta.nombre}</h1>
            <button
              type="button"
              className="btn-edit-profile"
              onClick={abrirModalEditarClienta}
              title="Editar información de clienta"
            >
              <Pencil size={15} strokeWidth={2} />
            </button>
          </div>

          {/* BOTÓN COLAPSABLE VER DETALLES DE CLIENTA */}
          <button
            type="button"
            className="btn-toggle-detalles-clienta"
            onClick={() => setShowDetallesClienta(!showDetallesClienta)}
          >
            <span>{showDetallesClienta ? 'Ocultar detalles de clienta' : 'Ver detalles de clienta'}</span>
            <ChevronDown
              size={16}
              strokeWidth={2.2}
              className={`chevron-icon ${showDetallesClienta ? 'rotated' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* SECCIÓN DESPLEGABLE DE INFORMACIÓN SECUNDARIA DE LA CLIENTA */}
      {showDetallesClienta && (
        <div className="clienta-detalles-desplegable animate-fadeIn">
          <div className="detalles-grid">
            <div className="detalle-item-card">
              <div className="detalle-item-label">
                <Phone size={13} strokeWidth={2} />
                <span>Teléfono</span>
              </div>
              <div className="detalle-item-val">
                {clienta.telefono ? (
                  <a href={`tel:${clienta.telefono}`} className="detalle-tel-link">
                    {clienta.telefono}
                  </a>
                ) : (
                  <span className="text-muted">No registrado</span>
                )}
              </div>
            </div>

            <div className="detalle-item-card">
              <div className="detalle-item-label">
                <MapPin size={13} strokeWidth={2} />
                <span>Dirección</span>
              </div>
              <div className="detalle-item-val">
                {clienta.direccion || <span className="text-muted">No registrada</span>}
              </div>
            </div>

            <div className="detalle-item-card">
              <div className="detalle-item-label">
                <User size={13} strokeWidth={2} />
                <span>Referencia</span>
              </div>
              <div className="detalle-item-val">
                {clienta.referencia ? (
                  <strong className="detalle-ref-text">{clienta.referencia}</strong>
                ) : (
                  <span className="text-muted">No registrada</span>
                )}
              </div>
            </div>

            <div className="detalle-item-card detalle-item-full">
              <div className="detalle-item-label">
                <Tag size={13} strokeWidth={2} />
                <span>Notas</span>
              </div>
              <div className="detalle-item-val">
                {clienta.notas ? (
                  <p className="detalle-notas-text">{clienta.notas}</p>
                ) : (
                  <span className="text-muted">Sin notas adicionales</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
