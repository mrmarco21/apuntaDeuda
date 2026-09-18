import React from 'react';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner/LoadingSpinner';

/**
 * Tabla responsiva para mostrar el listado de usuarios filtrados.
 *
 * Props:
 *   loading             {boolean}
 *   usuariosFiltrados   {array}
 *   filtroTexto         {string}
 *   filtroNegocio       {string}
 *   filtroRol           {string}
 *   filtroEstado        {string}
 *   abrirModalCrear     {function}
 *   handleToggleEstado  {function}
 *   cambiandoEstadoId   {string|number|null}
 *   abrirModalPassword  {function}
 *   abrirModalEditar    {function}
 *   formatearFecha      {function}
 */
export default function UserTable({
  loading,
  usuariosFiltrados,
  filtroTexto,
  filtroNegocio,
  filtroRol,
  filtroEstado,
  abrirModalCrear,
  handleToggleEstado,
  cambiandoEstadoId,
  abrirModalPassword,
  abrirModalEditar,
  formatearFecha
}) {
  if (loading) {
    return (
      <div className="admin-loading-wrap">
        <LoadingSpinner screen="admin" text="Cargando usuarios de la plataforma..." />
      </div>
    );
  }

  if (usuariosFiltrados.length === 0) {
    return (
      <div className="admin-empty-state">
        <div className="admin-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
        </div>
        <h3>No se encontraron usuarios</h3>
        <p>
          {filtroTexto || filtroNegocio !== 'todos' || filtroRol !== 'todos' || filtroEstado !== 'todos'
            ? 'No hay registros que coincidan con los filtros aplicados.'
            : 'Aún no se han registrado usuarios en los negocios.'}
        </p>
        {!filtroTexto && (
          <button className="admin-btn-primary" onClick={abrirModalCrear}>
            Registrar Primer Usuario
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="admin-table-card">
      <div className="admin-table-responsive">
        <table className="admin-usuarios-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Correo</th>
              <th>Negocio</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha de Creación</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u) => {
              const esAdmin = u.rol === 'admin';
              const esActivo = u.activo !== false;
              const inicial = (u.nombre || u.email || 'U').charAt(0).toUpperCase();
              const nombreNegocio = u.negocios?.nombre || 'Negocio asignado';

              return (
                <tr key={u.id} className={!esActivo ? 'row-inactivo' : ''}>
                  {/* Usuario */}
                  <td>
                    <div className="user-cell">
                      <div className={`user-avatar ${esAdmin ? 'avatar-admin' : 'avatar-user'}`}>
                        {inicial}
                      </div>
                      <div className="user-cell-info">
                        <span className="user-name">{u.nombre || 'Sin nombre'}</span>
                        {esAdmin && (
                          <span className="user-badge-principal">
                            Admin Principal
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Correo */}
                  <td>
                    <span className="user-email-text">
                      {u.email ? (
                        u.email
                      ) : (
                        <span className="user-email-empty">—</span>
                      )}
                    </span>
                  </td>

                  {/* Negocio */}
                  <td>
                    <div className="negocio-cell">
                      <span className="negocio-name-text">
                        {nombreNegocio}
                      </span>
                      <span className="negocio-id-sub" title={u.negocio_id}>
                        {u.negocio_id}
                      </span>
                    </div>
                  </td>

                  {/* Rol */}
                  <td>
                    <span className={`role-pill ${esAdmin ? 'role-admin' : 'role-user'}`}>
                      {u.rol === 'admin' ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                          <span>Administrador</span>
                        </>
                      ) : (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                            <circle cx="12" cy="7" r="4"/>
                          </svg>
                          <span>
                            {u.rol === 'encargado' ? 'Encargado' :
                             u.rol === 'cajero' ? 'Cajero' :
                             u.rol === 'asistente' ? 'Asistente' :
                             u.rol === 'temporal' ? 'Temporal' :
                             'Usuario'}
                          </span>
                        </>
                      )}
                    </span>
                  </td>

                  {/* Estado */}
                  <td>
                    <span className={`admin-status-pill ${esActivo ? 'pill-activo' : 'pill-inactivo'}`}>
                      <span className="pill-dot" />
                      {esActivo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>

                  {/* Fecha de Creación */}
                  <td>
                    <span className="date-text">{formatearFecha(u.created_at)}</span>
                  </td>

                  {/* Acciones */}
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions">
                      {/* Toggle Activar / Desactivar */}
                      <button
                        className={`table-btn-action ${esActivo ? 'btn-toggle-off' : 'btn-toggle-on'}`}
                        onClick={() => handleToggleEstado(u)}
                        disabled={cambiandoEstadoId === u.id}
                        title={esActivo ? 'Desactivar usuario' : 'Activar usuario'}
                      >
                        {cambiandoEstadoId === u.id ? (
                          <span className="admin-mini-spinner" />
                        ) : esActivo ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        )}
                      </button>

                      {/* Cambiar Contraseña */}
                      <button
                        className="table-btn-action btn-password"
                        onClick={() => abrirModalPassword(u)}
                        title="Cambiar contraseña de acceso"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </button>

                      {/* Editar */}
                      <button
                        className="table-btn-action btn-edit"
                        onClick={() => abrirModalEditar(u)}
                        title="Editar usuario"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
