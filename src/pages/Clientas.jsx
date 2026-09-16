import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../context/ConfigContext';
import { useToast } from '../context/ToastContext';
import { clientasService } from '../services/clientasService';
import './Clientas.css';

const DEFAULT_FORM = { nombre: '', telefono: '', direccion: '', referencia: '', notas: '' };

export default function Clientas() {
  const navigate = useNavigate();
  const { formatCurrency } = useConfig();
  const toast = useToast();
  const [clientas, setClientas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [ordenar, setOrdenar] = useState('a-z');
  const [limiteVisible, setLimiteVisible] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [clientaEditando, setClientaEditando] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // clienta a eliminar
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => { cargarClientas(); }, []);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  const cargarClientas = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientasService.getClientas();
      setClientas(data);
    } catch (err) {
      console.error('[DIAGNOSTICO CLIENTAS.JSX] Error capturado en cargarClientas():', {
        code: err?.code,
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        error: err
      });
      setError(err?.message ? `Error al cargar las clientas: ${err.message}` : 'Error al cargar las clientas');
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (clienta = null) => {
    setClientaEditando(clienta);
    setFormData(clienta ? {
      nombre: clienta.nombre,
      telefono: clienta.telefono || '',
      direccion: clienta.direccion || '',
      referencia: clienta.referencia || '',
      notas: clienta.notas || ''
    } : DEFAULT_FORM);
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setClientaEditando(null);
    setFormData(DEFAULT_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      toast.warning('El nombre de la clienta es obligatorio');
      return;
    }
    try {
      setSaving(true);
      if (clientaEditando) {
        await clientasService.updateClienta(clientaEditando.id, formData);
        toast.success(`Clienta "${formData.nombre}" actualizada`);
      } else {
        await clientasService.createClienta(formData);
        toast.success(`Clienta "${formData.nombre}" registrada con éxito`);
      }
      cerrarModal();
      cargarClientas();
    } catch (err) {
      console.error('Error al guardar clienta:', err);
      toast.error('Error al guardar clienta: ' + (err.message || 'Error inesperado'));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    try {
      await clientasService.deleteClienta(confirmDelete.id);
      toast.success(`Clienta "${confirmDelete.nombre}" eliminada`);
      setConfirmDelete(null);
      cargarClientas();
    } catch (err) {
      console.error('Error al eliminar clienta:', err);
      toast.error('Error al eliminar clienta');
    }
  };

  // Estadísticas
  const stats = {
    total: clientas.length,
    conDeuda: clientas.filter(c => parseFloat(c.saldo) > 0).length,
    alDia: clientas.filter(c => parseFloat(c.saldo) === 0).length,
    totalDeuda: clientas.reduce((sum, c) => sum + parseFloat(c.saldo || 0), 0)
  };

  // Filtrado + ordenado
  const clientasFiltradas = clientas
    .filter(c => {
      const matchSearch = c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.telefono || '').includes(busqueda);
      const matchFiltro =
        filtro === 'todas' ? true :
        filtro === 'conDeuda' ? parseFloat(c.saldo) > 0 :
        parseFloat(c.saldo) === 0;
      return matchSearch && matchFiltro;
    })
    .sort((a, b) => {
      if (ordenar === 'a-z') return a.nombre.localeCompare(b.nombre);
      if (ordenar === 'z-a') return b.nombre.localeCompare(a.nombre);
      if (ordenar === 'mayor-deuda') return parseFloat(b.saldo) - parseFloat(a.saldo);
      if (ordenar === 'menor-deuda') return parseFloat(a.saldo) - parseFloat(b.saldo);
      return 0;
    });

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
        <p>Cargando clientas...</p>
      </div>
    );
  }

  return (
    <div className="clientas-page animate-fadeIn">
      {/* Header */}
      <div className="clientas-topbar">
        <div className="clientas-topbar-left">
          {showSearch ? (
            <div className="search-input-wrap">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar clienta..."
                value={busqueda}
                onChange={e => {
                  setBusqueda(e.target.value);
                  setLimiteVisible(30);
                }}
                className="search-input-inline"
              />
            </div>
          ) : (
            <div>
              <h1>Clientas</h1>
              <p className="clientas-subtitle">
                {stats.total} registradas · {stats.conDeuda} con deuda
              </p>
            </div>
          )}
        </div>
        <div className="clientas-topbar-actions">
          <button
            className="btn-icon"
            onClick={() => { setShowSearch(!showSearch); if (showSearch) setBusqueda(''); }}
            title={showSearch ? 'Cerrar búsqueda' : 'Buscar'}
          >
            {showSearch ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            )}
          </button>
          <button className="btn btn-primary btn-nueva-clienta" onClick={() => abrirModal()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Nueva</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="clientas-stats-row">
        <div className="stat-pill stat-pill-blue">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
          </svg>
          <span>{stats.total} Total</span>
        </div>
        <div className="stat-pill stat-pill-red">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>{stats.conDeuda} Con deuda</span>
        </div>
        <div className="stat-pill stat-pill-green">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>{stats.alDia} Al día</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="clientas-controls">
        <div className="filter-tabs">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'conDeuda', label: 'Con deuda' },
            { key: 'alDia', label: 'Al día' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`filter-tab ${filtro === tab.key ? 'active' : ''}`}
              onClick={() => {
                setFiltro(tab.key);
                setLimiteVisible(30);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select
          className="order-select"
          value={ordenar}
          onChange={e => {
            setOrdenar(e.target.value);
            setLimiteVisible(30);
          }}
        >
          <option value="a-z">A → Z</option>
          <option value="z-a">Z → A</option>
          <option value="mayor-deuda">Mayor deuda</option>
          <option value="menor-deuda">Menor deuda</option>
        </select>
      </div>

      {/* Encabezado lista */}
      <div className="clientas-list-header">
        <span>
          {busqueda
            ? `${clientasFiltradas.length} resultado${clientasFiltradas.length !== 1 ? 's' : ''}`
            : filtro !== 'todas'
            ? `${clientasFiltradas.length} clienta${clientasFiltradas.length !== 1 ? 's' : ''}`
            : `Todas las clientas`
          }
        </span>
        {filtro !== 'todas' && (
          <button className="clear-filter-btn" onClick={() => setFiltro('todas')}>
            Limpiar filtro ×
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Lista */}
      {clientasFiltradas.length === 0 ? (
        <div className="empty-state-generic">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3>{busqueda ? 'Sin resultados' : 'Sin clientas'}</h3>
          <p>{busqueda ? 'Intenta con otro nombre' : 'Agrega tu primera clienta'}</p>
          {!busqueda && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => abrirModal()}>
              Agregar clienta
            </button>
          )}
        </div>
      ) : (
        <div className="clientas-list">
          {clientasFiltradas.slice(0, limiteVisible).map(clienta => (
            <div key={clienta.id} className="clienta-item">
              <div
                className="clienta-item-body"
                onClick={() => navigate(`/clientas/${clienta.id}`)}
              >
                <div className={`clienta-avatar ${parseFloat(clienta.saldo) > 0 ? 'avatar-deuda' : 'avatar-ok'}`}>
                  {clienta.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="clienta-item-info">
                  <p className="clienta-item-nombre">{clienta.nombre}</p>
                  <div className="clienta-item-details">
                    {clienta.telefono && (
                      <span className="clienta-detail-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                        </svg>
                        {clienta.telefono}
                      </span>
                    )}
                    {clienta.referencia && clienta.referencia.trim() !== '' && (
                      <span className="clienta-detail-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                        </svg>
                        Ref: {clienta.referencia}
                      </span>
                    )}
                  </div>
                </div>
                <div className="clienta-item-saldo">
                  <p className={`saldo-amount ${parseFloat(clienta.saldo) > 0 ? 'saldo-deuda' : 'saldo-ok'}`}>
                    {formatCurrency(clienta.saldo)}
                  </p>
                  <p className="saldo-label">{parseFloat(clienta.saldo) > 0 ? 'Debe' : 'Al día'}</p>
                </div>
              </div>
              <div className="clienta-item-actions">
                <button
                  className="action-btn action-edit"
                  onClick={() => abrirModal(clienta)}
                  title="Editar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  className="action-btn action-delete"
                  onClick={() => setConfirmDelete(clienta)}
                  title="Eliminar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {clientasFiltradas.length > limiteVisible && (
            <div className="cargar-mas-container">
              <button
                type="button"
                className="btn-cargar-mas"
                onClick={() => setLimiteVisible(prev => prev + 30)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 13 12 18 17 13" />
                  <polyline points="7 6 12 11 17 6" />
                </svg>
                <span>Mostrar más clientas ({Math.min(limiteVisible, clientasFiltradas.length)} de {clientasFiltradas.length})</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      <button className="fab" onClick={() => abrirModal()} title="Nueva clienta">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="8.5" cy="7" r="4"/>
          <line x1="20" y1="8" x2="20" y2="14"/>
          <line x1="23" y1="11" x2="17" y2="11"/>
        </svg>
      </button>

      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header-row">
              <h3 className="modal-title">
                {clientaEditando ? 'Editar Clienta' : 'Nueva Clienta'}
              </h3>
              <button className="modal-close-btn" onClick={cerrarModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nombre de la clienta"
                    value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    required
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="999 999 999"
                    value={formData.telefono}
                    onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Dirección de la clienta"
                    value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Referencia</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="¿Quién la recomendó?"
                    value={formData.referencia}
                    onChange={e => setFormData({ ...formData, referencia: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notas</label>
                  <textarea
                    className="form-input"
                    placeholder="Notas adicionales..."
                    rows={3}
                    value={formData.notas}
                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer-btns">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal} style={{ flex: 1 }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || !formData.nombre.trim()}
                  style={{ flex: 2 }}
                >
                  {saving ? 'Guardando...' : clientaEditando ? 'Guardar cambios' : 'Crear clienta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
            <h3>Eliminar clienta</h3>
            <p>
              ¿Seguro que quieres eliminar a <strong>"{confirmDelete.nombre}"</strong>?<br />
              Esta acción eliminará todos sus movimientos y no se puede deshacer.
            </p>
            <div className="confirm-dialog-btns">
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ background: 'var(--color-surfaceVariant)', color: 'var(--color-text)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleEliminar}
                style={{ background: 'var(--color-error)', color: '#fff' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}