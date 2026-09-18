import React from 'react';

/**
 * Tab de Gestión de Perfil de Usuario.
 *
 * Props:
 *   initial           {string}
 *   nombre            {string}
 *   setNombre         {function}
 *   telefono          {string}
 *   setTelefono       {function}
 *   whatsapp          {string}
 *   setWhatsapp       {function}
 *   usuario           {object}
 *   session           {object}
 *   handleGuardarPerfil {function}
 *   savingPerfil      {boolean}
 */
export default function TabPerfil({
  initial,
  nombre,
  setNombre,
  telefono,
  setTelefono,
  whatsapp,
  setWhatsapp,
  usuario,
  session,
  handleGuardarPerfil,
  savingPerfil
}) {
  return (
    <div className="config-card">
      <div className="card-header">
        <div className="profile-banner">
          <div className="profile-large-avatar">{initial}</div>
          <div className="profile-banner-info">
            <h2>{nombre || 'Usuario'}</h2>
            <p className="profile-banner-role">
              Rol: <strong>{usuario?.rol || 'Administrador Principal'}</strong>
            </p>
            <p className="profile-banner-email">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleGuardarPerfil} className="config-form">
        <div className="form-group-grid">
          <div className="form-field">
            <label htmlFor="nombre">Nombre Completo</label>
            <input
              id="nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Marco Aurelio"
              required
            />
            <small>Nombre que se mostrará en los recibos y la interfaz.</small>
          </div>

          <div className="form-field">
            <label htmlFor="whatsapp">WhatsApp</label>
            <input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="999 999 999"
            />
            <small>Número de WhatsApp utilizado por el negocio (opcional).</small>
          </div>

          <div className="form-field full-width">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={session?.user?.email || ''}
              disabled
              className="input-disabled"
            />
            <small>El email está asociado a tu cuenta de Supabase Auth y no se puede cambiar aquí.</small>
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={savingPerfil}>
            {savingPerfil ? (
              <>
                <div className="btn-spinner" /> Guardando...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Guardar Cambios de Perfil
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
