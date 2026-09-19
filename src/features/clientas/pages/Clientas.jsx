import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MoreVertical,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  Search,
  X,
  Plus,
  Users,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useConfig } from '../../../context/ConfigContext';
import { useToast } from '../../../context/ToastContext';
import { clientasService } from '../../../services/clientasService';
import { cacheManager } from '../../../lib/cacheManager';
import LoadingSpinner from '../../../components/ui/LoadingSpinner/LoadingSpinner';
import './Clientas.css';

const DEFAULT_FORM = { nombre: '', telefono: '', direccion: '', referencia: '', notas: '' };

const normalizarTexto = (texto) => {
  if (!texto) return '';
  return texto
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export default function Clientas() {
  const navigate = useNavigate();
  const { formatCurrency } = useConfig();
  const toast = useToast();

  const activeNegocioId = localStorage.getItem('active_negocio_id');
  const cacheKey = activeNegocioId ? `clientas_${activeNegocioId}` : 'clientas';
  const cachedData = cacheManager.getRawData(cacheKey);

  const [clientas, setClientas] = useState(() => cachedData || []);
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [ordenar, setOrdenar] = useState('a-z');
  const [limiteVisible, setLimiteVisible] = useState(30);
  const [loading, setLoading] = useState(() => !cachedData || cachedData.length === 0);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [clientaEditando, setClientaEditando] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Menú desplegable de 3 puntos en las tarjetas
  const [activeMenuId, setActiveMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    // Si ya tenemos clientas en caché, revalidar silenciosamente en background sin poner spinner
    const tieneCache = Boolean(cachedData && cachedData.length > 0);
    cargarClientas(tieneCache);
  }, []);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarClientas = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      setError(null);
      const data = await clientasService.getClientas();
      setClientas(data || []);
    } catch (err) {
      console.error('[CLIENTAS] Error al cargar clientas:', err);
      if (!isBackground) {
        setError(err?.message ? `Error al cargar las clientas: ${err.message}` : 'Error al cargar las clientas');
      }
    } finally {
      setLoading(false);
    }
  };

  const abrirModal = (clienta = null) => {
    setClientaEditando(clienta);
    setFormData(
      clienta
        ? {
          nombre: clienta.nombre,
          telefono: clienta.telefono || '',
          direccion: clienta.direccion || '',
          referencia: clienta.referencia || '',
          notas: clienta.notas || ''
        }
        : DEFAULT_FORM
    );
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

  const handleDesactivarClienta = async (clienta) => {
    if (
      !window.confirm(
        `¿Deseas desactivar a "${clienta.nombre}"? La clienta pasará a la lista de Desactivadas.`
      )
    ) {
      return;
    }
    try {
      await clientasService.setActivoClienta(clienta.id, false);
      toast.success(`Clienta "${clienta.nombre}" desactivada`);
      cargarClientas();
    } catch (err) {
      console.error('Error al desactivar clienta:', err);
      toast.error('Error al desactivar la clienta');
    }
  };

  const handleReactivarClienta = async (clienta) => {
    try {
      await clientasService.setActivoClienta(clienta.id, true);
      toast.success(`Clienta "${clienta.nombre}" reactivada con éxito`);
      cargarClientas();
    } catch (err) {
      console.error('Error al reactivar clienta:', err);
      toast.error('Error al reactivar la clienta');
    }
  };

  const handleEliminar = async () => {
    if (!confirmDelete) return;
    try {
      await clientasService.deleteClienta(confirmDelete.id);
      toast.success(`Clienta "${confirmDelete.nombre}" eliminada definitivamente`);
      setConfirmDelete(null);
      cargarClientas();
    } catch (err) {
      console.error('Error al eliminar clienta:', err);
      toast.error('Error al eliminar clienta');
    }
  };

  // Estadísticas
  const clientasActivas = clientas.filter((c) => c.activo !== false);
  const clientasDesactivadas = clientas.filter((c) => c.activo === false);

  const stats = {
    total: clientasActivas.length,
    conDeuda: clientasActivas.filter((c) => parseFloat(c.saldo) > 0).length,
    alDia: clientasActivas.filter((c) => parseFloat(c.saldo) === 0).length,
    desactivadas: clientasDesactivadas.length
  };

  // Filtrado accent-insensitive + ordenado
  const clientasFiltradas = clientas
    .filter((c) => {
      const queryLimpio = normalizarTexto(busqueda);
      const matchSearch =
        normalizarTexto(c.nombre).includes(queryLimpio) ||
        normalizarTexto(c.telefono).includes(queryLimpio) ||
        normalizarTexto(c.referencia).includes(queryLimpio);

      const matchFiltro =
        filtro === 'todas'
          ? c.activo !== false
          : filtro === 'conDeuda'
            ? c.activo !== false && parseFloat(c.saldo) > 0
            : filtro === 'alDia'
              ? c.activo !== false && parseFloat(c.saldo) === 0
              : filtro === 'desactivadas'
                ? c.activo === false
                : true;

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
    return <LoadingSpinner screen="clientas" fullPage />;
  }

  return (
    <div className="clientas-page animate-fadeIn">
      {/* Header */}
      <div className="clientas-topbar">
        <div className="clientas-topbar-left">
          {showSearch ? (
            <div className="search-input-wrap">
              <Search size={16} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Buscar por nombre o referencia (ej. maria, jose)..."
                value={busqueda}
                onChange={(e) => {
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
                {stats.total} activas · {stats.conDeuda} con deuda
              </p>
            </div>
          )}
        </div>
        <div className="clientas-topbar-actions">
          <button
            className="btn-icon"
            onClick={() => {
              setShowSearch(!showSearch);
              if (showSearch) setBusqueda('');
            }}
            title={showSearch ? 'Cerrar búsqueda' : 'Buscar'}
          >
            {showSearch ? <X size={18} /> : <Search size={18} />}
          </button>
          <button className="btn btn-primary btn-nueva-clienta" onClick={() => abrirModal()}>
            <Plus size={14} strokeWidth={2.5} />
            <span>Nueva</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="clientas-stats-row">
        <div className="stat-pill stat-pill-blue">
          <Users size={14} />
          <span>{stats.total} Activas</span>
        </div>
        <div className="stat-pill stat-pill-red">
          <AlertCircle size={14} />
          <span>{stats.conDeuda} Con deuda</span>
        </div>
        <div className="stat-pill stat-pill-green">
          <CheckCircle2 size={14} />
          <span>{stats.alDia} Al día</span>
        </div>
        {stats.desactivadas > 0 && (
          <div className="stat-pill stat-pill-gray">
            <UserX size={14} />
            <span>{stats.desactivadas} Desactivadas</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="clientas-controls">
        <div className="filter-tabs">
          {[
            { key: 'todas', label: 'Todas' },
            { key: 'conDeuda', label: 'Con deuda' },
            { key: 'alDia', label: 'Al día' },
            { key: 'desactivadas', label: `Desactivadas (${stats.desactivadas})` }
          ].map((tab) => (
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
          onChange={(e) => {
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
            : filtro === 'desactivadas'
              ? `${clientasFiltradas.length} clienta${clientasFiltradas.length !== 1 ? 's' : ''} desactivada${clientasFiltradas.length !== 1 ? 's' : ''}`
              : filtro !== 'todas'
                ? `${clientasFiltradas.length} clienta${clientasFiltradas.length !== 1 ? 's' : ''}`
                : `Todas las clientas activas`}
        </span>
        {(filtro !== 'todas' || busqueda) && (
          <button
            className="clear-filter-btn"
            onClick={() => {
              setFiltro('todas');
              setBusqueda('');
            }}
          >
            Limpiar filtro ×
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Lista */}
      {clientasFiltradas.length === 0 ? (
        <div className="empty-state-generic">
          <Users size={40} strokeWidth={1.5} className="empty-icon" />
          <h3>
            {busqueda
              ? 'Sin resultados'
              : filtro === 'desactivadas'
                ? 'Sin clientas desactivadas'
                : 'Sin clientas'}
          </h3>
          <p>
            {busqueda
              ? 'Intenta con otro nombre o sin tilde (ej. maria)'
              : filtro === 'desactivadas'
                ? 'No hay clientas desactivadas en este momento'
                : 'Agrega tu primera clienta'}
          </p>
          {!busqueda && filtro !== 'desactivadas' && (
            <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => abrirModal()}>
              Agregar clienta
            </button>
          )}
        </div>
      ) : (
        <div className="clientas-list">
          {clientasFiltradas.slice(0, limiteVisible).map((clienta) => {
            const tieneDeuda = parseFloat(clienta.saldo) > 0;
            const menuAbierto = activeMenuId === clienta.id;

            return (
              <div key={clienta.id} className={`clienta-item ${clienta.activo === false ? 'clienta-item-desactivada' : ''}`}>
                <div
                  className="clienta-item-body"
                  onClick={() => {
                    cacheManager.set(`clienta_${clienta.id}`, clienta);
                    navigate(`/clientas/${clienta.id}`);
                  }}
                >
                  <div className={`clienta-avatar ${tieneDeuda ? 'avatar-deuda' : 'avatar-ok'}`}>
                    {clienta.nombre.charAt(0).toUpperCase()}
                  </div>

                  <div className="clienta-item-info">
                    <p className="clienta-item-nombre">{clienta.nombre}</p>
                    <div className="clienta-item-meta">
                      {clienta.referencia && clienta.referencia.trim() !== '' && (
                        <span className="clienta-item-ref">Ref: {clienta.referencia}</span>
                      )}
                      {Number(clienta.cuentas_activas || 0) > 0 && (
                        <span className="badge-cuentas-activas">
                          {clienta.cuentas_activas} {clienta.cuentas_activas === 1 ? 'cuenta activa' : 'cuentas activas'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="clienta-item-right">
                    <div className="clienta-item-saldo">
                      <p className={`saldo-amount ${tieneDeuda ? 'saldo-deuda' : 'saldo-ok'}`}>
                        {formatCurrency(clienta.saldo)}
                      </p>
                      <p className="saldo-label">{tieneDeuda ? 'Debe' : 'Al día'}</p>
                    </div>

                    {/* Menú de 3 puntos */}
                    <div
                      className="clienta-menu-wrap"
                      ref={menuAbierto ? menuRef : null}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className={`btn-card-menu ${menuAbierto ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(menuAbierto ? null : clienta.id);
                        }}
                        title="Opciones"
                      >
                        <MoreVertical size={18} />
                      </button>

                      {menuAbierto && (
                        <div className="card-dropdown-menu animate-fadeIn">
                          <button
                            type="button"
                            className="dropdown-item"
                            onClick={() => {
                              setActiveMenuId(null);
                              abrirModal(clienta);
                            }}
                          >
                            <Pencil size={15} />
                            <span>Editar</span>
                          </button>

                          {clienta.activo !== false ? (
                            <button
                              type="button"
                              className="dropdown-item dropdown-item-warning"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleDesactivarClienta(clienta);
                              }}
                            >
                              <UserX size={15} />
                              <span>Desactivar</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="dropdown-item dropdown-item-success"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleReactivarClienta(clienta);
                              }}
                            >
                              <UserCheck size={15} />
                              <span>Reactivar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="dropdown-item dropdown-item-danger"
                            onClick={() => {
                              setActiveMenuId(null);
                              setConfirmDelete(clienta);
                            }}
                          >
                            <Trash2 size={15} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {clientasFiltradas.length > limiteVisible && (
            <div className="cargar-mas-container">
              <button
                type="button"
                className="btn-cargar-mas"
                onClick={() => setLimiteVisible((prev) => prev + 30)}
              >
                <span>
                  Mostrar más clientas ({Math.min(limiteVisible, clientasFiltradas.length)} de{' '}
                  {clientasFiltradas.length})
                </span>
              </button>
            </div>
          )}
        </div>
      )}


      {/* Modal Agregar/Editar */}
      {showModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header-row">
              <h3 className="modal-title">
                {clientaEditando ? 'Editar Clienta' : 'Nueva Clienta'}
              </h3>
              <button className="modal-close-btn" onClick={cerrarModal}>
                <X size={18} />
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
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Dirección de la clienta"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Referencia</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="¿Quién la recomendó?"
                    value={formData.referencia}
                    onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Notas</label>
                  <textarea
                    className="form-input"
                    placeholder="Notas adicionales..."
                    rows={3}
                    value={formData.notas}
                    onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer-btns">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModal}
                  style={{ flex: 1 }}
                >
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
            <h3>Eliminar clienta definitivamente</h3>
            <p>
              ¿Seguro que quieres eliminar a <strong>"{confirmDelete.nombre}"</strong>?<br />
              Esta acción eliminará todos sus datos y no se puede deshacer.
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
                Eliminar definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}