import React from 'react';

/**
 * Tab de Seguridad y Cambio de Contraseña.
 *
 * Props:
 *   newPassword           {string}
 *   setNewPassword        {function}
 *   confirmPassword       {string}
 *   setConfirmPassword    {function}
 *   handleCambiarPassword {function}
 *   savingPassword        {boolean}
 */
export default function TabSeguridad({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  handleCambiarPassword,
  savingPassword
}) {
  return (
    <div className="config-card">
      <div className="card-header">
        <h2>Seguridad y Acceso</h2>
        <p className="card-subtitle">Actualiza tu contraseña para mantener tu cuenta protegida.</p>
      </div>

      <form onSubmit={handleCambiarPassword} className="config-form">
        <div className="form-group-grid">
          <div className="form-field">
            <label htmlFor="newPassword">Nueva Contraseña</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={savingPassword}>
            {savingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
          </button>
        </div>
      </form>
    </div>
  );
}
