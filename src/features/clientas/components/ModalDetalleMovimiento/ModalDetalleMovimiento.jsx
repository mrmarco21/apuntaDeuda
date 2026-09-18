import React from 'react';
import { AlertCircle, Pencil, Tag, Calendar, Trash2, Lock, UserCheck } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { ROLE_LABELS } from '../../../../hooks/usePermissions';

/**
 * Modal de detalle de un movimiento (venta o pago).
 * Muestra información completa: tipo, monto, usuario que lo registró, usuario que lo eliminó (si fue anulado), prendas o info de pago, y acciones editar/eliminar.
 *
 * Props:
 *   modalDetalleMov        {object|null}  movimiento seleccionado
 *   setModalDetalleMov     {function}
 *   anulandoMovimiento     {boolean}
 *   formatCurrency         {function}
 *   formatDate             {function}
 *   parsearPrendas         {function(comentario, fecha): Array}
 *   obtenerNombreCategoria {function(catKey): string}
 *   extraerNotaAbonoParaEdicion {function(texto): string}
 *   handleAnularMovimiento {function(mov)}
 *   abrirModalCargo        {function(cuentaId, esNueva, movEditar)}
 *   abrirModalAbono        {function(cuentaId, movEditar)}
 *   equipoUsuarios         {Array}        lista de usuarios del negocio
 */
export default function ModalDetalleMovimiento({
  modalDetalleMov,
  setModalDetalleMov,
  anulandoMovimiento,
  formatCurrency,
  formatDate,
  parsearPrendas,
  obtenerNombreCategoria,
  extraerNotaAbonoParaEdicion,
  handleAnularMovimiento,
  abrirModalCargo,
  abrirModalAbono,
  equipoUsuarios = [],
}) {
  const { usuario: usuarioActual } = useAuth();

  if (!modalDetalleMov) return null;

  const esCargo =
    modalDetalleMov.tipo === 'CARGO' ||
    modalDetalleMov.tipo === 'cargo' ||
    modalDetalleMov.tipo === 'venta';

  const prendas = parsearPrendas(
    modalDetalleMov.comentario || modalDetalleMov.descripcion,
    modalDetalleMov.fecha
  );

  // Resolver usuario que creó el movimiento
  const resolverInfoUsuario = (userId) => {
    if (!userId) return null;

    const targetId = String(userId).toLowerCase().trim();

    // 1. Buscar en la lista de miembros del equipo del negocio
    const emp = (equipoUsuarios || []).find((u) => {
      const authId = u.auth_user_id ? String(u.auth_user_id).toLowerCase().trim() : '';
      const uId = u.id ? String(u.id).toLowerCase().trim() : '';
      return authId === targetId || uId === targetId;
    });

    if (emp) {
      return {
        nombre: emp.nombre || emp.email || 'Personal',
        rol: emp.rol || 'usuario',
      };
    }

    // 2. Buscar si coincide con el usuario logueado en la sesión actual
    if (usuarioActual) {
      const currentAuthId = usuarioActual.auth_user_id
        ? String(usuarioActual.auth_user_id).toLowerCase().trim()
        : '';
      const currentId = usuarioActual.id ? String(usuarioActual.id).toLowerCase().trim() : '';
      if (currentAuthId === targetId || currentId === targetId) {
        return {
          nombre: usuarioActual.nombre || 'Administrador',
          rol: usuarioActual.rol || 'admin',
        };
      }
    }

    return null;
  };

  const creatorUserId =
    modalDetalleMov.user_id ||
    modalDetalleMov.usuario_id ||
    modalDetalleMov.created_by ||
    modalDetalleMov.auth_user_id ||
    modalDetalleMov.creado_por;

  let usuarioCreador = resolverInfoUsuario(creatorUserId);

  // Fallback inteligente para movimientos existentes: si no trae user_id registrado,
  // se asocia al administrador/dueño del negocio o usuario actual
  if (!usuarioCreador) {
    const adminNegocio = (equipoUsuarios || []).find((u) =>
      ['admin', 'dueño', 'administrador', 'superadmin'].includes(String(u.rol || '').toLowerCase())
    );
    if (adminNegocio) {
      usuarioCreador = {
        nombre: adminNegocio.nombre || 'Administrador',
        rol: adminNegocio.rol || 'admin',
      };
    } else if (usuarioActual?.nombre) {
      usuarioCreador = {
        nombre: usuarioActual.nombre,
        rol: usuarioActual.rol || 'admin',
      };
    }
  }

  const deleterUserId = modalDetalleMov.anulado_por;
  let usuarioElimino = modalDetalleMov.anulado ? resolverInfoUsuario(deleterUserId) : null;
  if (modalDetalleMov.anulado && !usuarioElimino) {
    if (usuarioActual?.nombre) {
      usuarioElimino = {
        nombre: usuarioActual.nombre,
        rol: usuarioActual.rol || 'admin',
      };
    }
  }

  return (
    <div className="modal-overlay" onClick={() => setModalDetalleMov(null)}>
      <div className="modal-content modal-android-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="android-detalle-topbar">
          <h2>Detalle del movimiento</h2>
          <button className="btn-close-clean" onClick={() => setModalDetalleMov(null)}>
            &times;
          </button>
        </div>

        <div className="android-detalle-content">
          {/* Icono circular y Tipo */}
          <div className="android-detalle-hero">
            <div
              className={`android-hero-circle ${
                modalDetalleMov.anulado
                  ? 'circle-anulado'
                  : esCargo
                    ? 'circle-cargo'
                    : 'circle-abono'
              }`}
            >
              {modalDetalleMov.anulado ? '✕' : esCargo ? '↑' : '↓'}
            </div>
            <div className="android-hero-title-wrap">
              <h3 className="android-hero-title">
                {esCargo ? 'Venta' : 'Pago'}
              </h3>
              {modalDetalleMov.anulado && (
                <span className="android-hero-badge-anulado">ANULADO</span>
              )}
            </div>
            <span className="android-hero-date">{formatDate(modalDetalleMov.fecha)}</span>
          </div>

          {/* Banner de Movimiento Anulado con información de quién eliminó */}
          {modalDetalleMov.anulado && (
            <div className="android-detalle-anulado-banner">
              <div className="anulado-banner-title">
                <AlertCircle size={18} strokeWidth={2.2} />
                <span>Movimiento Eliminado</span>
              </div>
              <p>Este movimiento fue anulado y ya no afecta el saldo de la cuenta.</p>
              
              <div className="anulado-meta-box">
                <div className="anulado-meta-row">
                  <span>Eliminado por:</span>
                  {usuarioElimino ? (
                    <div className="audit-user-row">
                      <strong className="anulado-user-name">{usuarioElimino.nombre}</strong>
                      <span className={`emp-role-pill ${usuarioElimino.rol}`}>
                        {ROLE_LABELS[usuarioElimino.rol] || usuarioElimino.rol}
                      </span>
                    </div>
                  ) : (
                    <strong className="anulado-user-name">Administrador / Personal</strong>
                  )}
                </div>

                {modalDetalleMov.fecha_anulacion && (
                  <small>Fecha de anulación: {formatDate(modalDetalleMov.fecha_anulacion)}</small>
                )}
              </div>
            </div>
          )}

          {/* Monto total */}
          <div className={`android-monto-total-card ${modalDetalleMov.anulado ? 'card-monto-anulado' : ''}`}>
            <span className="monto-total-label">
              {modalDetalleMov.anulado ? 'Monto Anulado' : 'Monto total'}
            </span>
            <span
              className={`monto-total-val ${
                modalDetalleMov.anulado
                  ? 'val-anulado monto-tachado'
                  : esCargo
                    ? 'val-rojo'
                    : 'val-verde'
              }`}
            >
              {formatCurrency(modalDetalleMov.monto)}
            </span>
          </div>

          {/* Auditoría / Quién registró el movimiento */}
          <div className="android-audit-card">
            <div className="audit-card-icon-wrap">
              <UserCheck size={16} />
            </div>
            <div className="audit-card-info">
              <span className="audit-card-label">Registrado por:</span>
              {usuarioCreador ? (
                <div className="audit-user-row">
                  <strong className="audit-user-name">{usuarioCreador.nombre}</strong>
                  <span className={`emp-role-pill ${usuarioCreador.rol}`}>
                    {ROLE_LABELS[usuarioCreador.rol] || usuarioCreador.rol}
                  </span>
                </div>
              ) : (
                <span className="audit-user-unknown">Personal del negocio</span>
              )}
            </div>
          </div>

          {/* Detalle de prendas o Métodos de Pago */}
          {esCargo ? (
            <div className="android-prendas-detalle-section">
              <h4 className="prendas-section-title">Detalle de la venta</h4>
              <div className="prendas-items-list">
                {prendas.length > 0 ? (
                  prendas.map((p, pIdx) => (
                    <div key={pIdx} className="android-prenda-row-item">
                      <div className="prenda-row-left">
                        <div className={`prenda-num-bubble ${modalDetalleMov.anulado ? 'bubble-anulado' : ''}`}>
                          {pIdx + 1}
                        </div>
                        <div className="prenda-texts">
                          <span className={`prenda-name ${modalDetalleMov.anulado ? 'monto-tachado' : ''}`}>
                            {p.descripcion}
                          </span>
                          <div className="prenda-meta-chips">
                            <span className="prenda-cat-chip">
                              <Tag size={12} strokeWidth={2} />
                              {obtenerNombreCategoria(p.categoria)}
                            </span>
                            <span className="prenda-date-chip">
                              <Calendar size={12} strokeWidth={2} />
                              {p.fechaDisplay || formatDate(p.fecha)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="prenda-row-right">
                        <span className={`prenda-amount-val ${modalDetalleMov.anulado ? 'monto-tachado text-muted' : ''}`}>
                          {formatCurrency(p.monto)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="android-prenda-row-item">
                    <div className="prenda-row-left">
                      <div className={`prenda-num-bubble ${modalDetalleMov.anulado ? 'bubble-anulado' : ''}`}>1</div>
                      <div className="prenda-texts">
                        <span className={`prenda-name ${modalDetalleMov.anulado ? 'monto-tachado' : ''}`}>
                          {modalDetalleMov.comentario || modalDetalleMov.descripcion || 'Sin descripción'}
                        </span>
                      </div>
                    </div>
                    <div className="prenda-row-right">
                      <span className={`prenda-amount-val ${modalDetalleMov.anulado ? 'monto-tachado text-muted' : ''}`}>
                        {formatCurrency(modalDetalleMov.monto)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="android-abono-info-section">
              <h4 className="prendas-section-title">Información del Pago</h4>
              <div className="abono-info-box">
                <div className="abono-info-row">
                  <span>Método de pago:</span>
                  <strong className="profile-chip chip-tel">{modalDetalleMov.metodo_pago || 'Efectivo'}</strong>
                </div>
                {(() => {
                  const nota = extraerNotaAbonoParaEdicion(
                    modalDetalleMov.comentario || modalDetalleMov.descripcion
                  );
                  if (!nota) return null;
                  return (
                    <div className="abono-info-row">
                      <span>Nota:</span>
                      <p className={modalDetalleMov.anulado ? 'monto-tachado' : ''}>{nota}</p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Botones inferiores */}
        {modalDetalleMov.anulado ? (
          <div className="android-detalle-actions-anulado">
            <button
              type="button"
              className="btn-android-cerrar-anulado"
              onClick={() => setModalDetalleMov(null)}
            >
              Cerrar
            </button>
          </div>
        ) : (
          <div>
            <div className="android-detalle-actions">
              <button
                type="button"
                className="btn-android-action-eliminar"
                onClick={() => handleAnularMovimiento(modalDetalleMov)}
                disabled={anulandoMovimiento}
              >
                <Trash2 size={17} strokeWidth={2} />
                <span>{anulandoMovimiento ? 'Eliminando...' : 'Eliminar'}</span>
              </button>

              {modalDetalleMov.esUltimo === false ? (
                <button
                  type="button"
                  className="btn-android-action-editar"
                  disabled
                  title="Solo se permite editar el último movimiento de la cuenta"
                  style={{ opacity: 0.5, cursor: 'not-allowed', backgroundColor: '#94a3b8' }}
                >
                  <Lock size={16} strokeWidth={2} />
                  <span>Editar</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-android-action-editar"
                  onClick={() => {
                    const mov = modalDetalleMov;
                    setModalDetalleMov(null);
                    if (
                      mov.tipo === 'CARGO' ||
                      mov.tipo === 'cargo' ||
                      mov.tipo === 'venta'
                    ) {
                      abrirModalCargo(mov.cuenta_id, false, mov);
                    } else {
                      abrirModalAbono(mov.cuenta_id, mov);
                    }
                  }}
                >
                  <Pencil size={17} strokeWidth={2} />
                  <span>Editar</span>
                </button>
              )}
            </div>

            {modalDetalleMov.esUltimo === false && (
              <div
                style={{
                  marginTop: '0.65rem',
                  textAlign: 'center',
                  fontSize: '0.78rem',
                  color: 'var(--color-textSecondary, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
              >
                <Lock size={12} />
                <span>Solo se permite editar el último movimiento de la cuenta</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
