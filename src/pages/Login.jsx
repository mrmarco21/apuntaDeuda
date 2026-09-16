import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  RiSunLine,
  RiMoonLine,
  RiMailLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiArrowRightLine,
  RiLoader4Line,
  RiErrorWarningLine,
  RiLockPasswordLine,
  RiWhatsappLine,
  RiHome4Line,
  RiInformationLine,
  RiQuestionLine,
  RiShieldCheckLine,
} from 'react-icons/ri';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const { login, session, usuario, negocioActual, esSuperadmin, loading: authLoading, loadingSuperadmin, bloqueoInfo, limpiarBloqueo } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Si ya tiene sesión activa y terminó de verificar que esté activo, redirigir automáticamente
  React.useEffect(() => {
    if (!authLoading && !loadingSuperadmin && session && !bloqueoInfo) {
      if (esSuperadmin) {
        navigate('/admin/negocios', { replace: true });
      } else if (usuario && usuario.activo !== false && negocioActual && negocioActual.activo !== false) {
        navigate('/', { replace: true });
      }
    }
  }, [session, esSuperadmin, usuario, negocioActual, authLoading, loadingSuperadmin, bloqueoInfo, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await login(email, password);
    setLoading(false);

    if (res?.bloqueoInfo) {
      // El modal de bloqueo se abrirá automáticamente a través de bloqueoInfo en el AuthContext
      return;
    }

    if (res?.error) {
      let mensajeError = 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus credenciales.';
      const rawMsg = (res.error.message || '').toLowerCase();

      if (rawMsg.includes('invalid login credentials') || rawMsg.includes('invalid_grant')) {
        mensajeError = 'Contraseña o correo electrónico incorrectos. Si cambiaste tu contraseña recientemente, asegúrate de ingresar la nueva clave.';
      } else if (rawMsg.includes('email not confirmed')) {
        mensajeError = 'Tu correo electrónico aún no ha sido confirmado en la plataforma.';
      } else if (rawMsg.includes('too many requests')) {
        mensajeError = 'Demasiados intentos fallidos. Por favor, espera unos minutos antes de volver a intentar.';
      } else if (rawMsg.includes('user not found')) {
        mensajeError = 'No se encontró ninguna cuenta asociada a este correo electrónico.';
      } else if (res.error.message && !rawMsg.includes('edge function') && !rawMsg.includes('non-2xx')) {
        mensajeError = res.error.message;
      }

      setError(mensajeError);
    } else {
      if (res?.esSuperadmin) {
        navigate('/admin/negocios', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  };

  return (
    <div className={`login-page ${isDark ? 'login-page--dark' : 'login-page--light'}`}>
      {/* Botón flotante para alternar Tema Claro / Oscuro */}
      <button
        type="button"
        className="login-theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
        title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      >
        {isDark ? (
          <>
            <RiSunLine size={17} />
            <span className="login-theme-text">Modo Claro</span>
          </>
        ) : (
          <>
            <RiMoonLine size={17} />
            <span className="login-theme-text">Modo Oscuro</span>
          </>
        )}
      </button>

      {/* Fondo sofisticado con rejilla y orbes de luz */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-bg-grid" />
        <div className="login-bg-glow login-bg-glow-1" />
        <div className="login-bg-glow login-bg-glow-2" />
      </div>

      <div className="login-container">
        {/* Brand / Logo */}
        <div className="login-brand">
          <div className="login-logo-wrap">
            <img
              src="/logo.png"
              alt="ApuntaDeuda Logo"
              className="login-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/logo.png';
              }}
            />
          </div>
          <div className="login-brand-text">
            <h1>ApuntaDeuda</h1>
            <p>Sistema de Administración y Cobranza</p>
          </div>
        </div>

        {/* Card de login */}
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-badge">
              <span className="login-badge-dot" />
              Acceso Seguro
            </div>
            <h2>Iniciar Sesión</h2>
            <p>Ingresa tus credenciales para acceder a la plataforma</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {/* Email */}
            <div className="login-field">
              <label htmlFor="email">Correo Electrónico</label>
              <div className="login-input-wrap">
                <RiMailLine className="login-input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="login-input"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrap">
                <RiLockLine className="login-input-icon" size={18} />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="login-input"
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPass ? <RiEyeOffLine size={18} /> : <RiEyeLine size={18} />}
                </button>
              </div>
            </div>

            {/* Olvidaste tu contraseña */}
            <div className="login-forgot-wrap">
              <button
                type="button"
                className="login-forgot-btn"
                id="btn-forgot-password"
                onClick={() => setShowForgotModal(true)}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error" role="alert">
                <RiErrorWarningLine size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RiLoader4Line size={18} className="login-spinner-icon" style={{ animation: 'spin 0.7s linear infinite' }} />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Ingresar</span>
                  <RiArrowRightLine size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <RiShieldCheckLine size={14} />
          <span>Conexión cifrada de extremo a extremo</span>
        </div>
      </div>

      {/* Modal ¿Olvidaste tu contraseña? */}
      {showForgotModal && (
        <div className="login-modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="login-modal-header">
              <div className="login-modal-icon-wrap" style={{ background: 'rgba(69,190,255,0.15)', color: '#0284c7' }}>
                <RiLockPasswordLine size={28} />
              </div>
              <div className="login-modal-badge">
                <span className="login-modal-badge-dot" style={{ background: '#0284c7' }} />
                <span>Recuperar Acceso</span>
              </div>
              <h3 className="login-modal-title">¿Olvidaste tu contraseña?</h3>
            </div>

            <div className="login-modal-body">
              <p className="login-modal-text">
                Para restablecer tu contraseña, necesitas contactar directamente con el soporte técnico de <strong>ApuntaDeuda</strong>.
              </p>
              <div className="login-modal-help-box">
                <RiInformationLine size={16} />
                <span>
                  Nuestro equipo de soporte verificará tu identidad y te asignará una nueva contraseña de acceso en el menor tiempo posible.
                </span>
              </div>
            </div>

            <div className="login-modal-actions">
              <a
                href={`https://wa.me/51967603871?text=${encodeURIComponent(
                  `Hola, olvidé mi contraseña en ApuntaDeuda.\n\n*Correo:* ${email || 'No especificado'}\n\n¿Pueden ayudarme a recuperar el acceso?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="login-btn-whatsapp"
                id="btn-forgot-whatsapp"
              >
                <RiWhatsappLine size={18} />
                <span>Contactar Soporte por WhatsApp</span>
              </a>

              <button
                type="button"
                className="login-btn-modal-close"
                onClick={() => setShowForgotModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Soporte para Cuentas / Negocios Inactivos */}
      {bloqueoInfo && (
        <div className="login-modal-overlay" onClick={limpiarBloqueo}>
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* Header / Icono de Alerta */}
            <div className="login-modal-header">
              <div className="login-modal-icon-wrap">
                <RiErrorWarningLine size={28} />
              </div>
              <div className="login-modal-badge">
                <span className="login-modal-badge-dot" />
                <span>Acceso Restringido</span>
              </div>
              <h3 className="login-modal-title">{bloqueoInfo.titulo || 'Acceso No Autorizado'}</h3>
              {bloqueoInfo.negocioNombre && (
                <div className="login-modal-negocio-tag">
                  <RiHome4Line size={14} />
                  <span>{bloqueoInfo.negocioNombre}</span>
                </div>
              )}
            </div>

            {/* Cuerpo del mensaje */}
            <div className="login-modal-body">
              <p className="login-modal-text">{bloqueoInfo.mensaje}</p>
              <div className="login-modal-help-box">
                <RiQuestionLine size={16} />
                <span>
                  Para reactivar tu cuenta o renovar el plan de tu negocio, ponte en contacto directo con soporte técnico.
                </span>
              </div>
            </div>

            {/* Acciones de Contacto */}
            <div className="login-modal-actions">
              <a
                href={`https://wa.me/51967603871?text=${encodeURIComponent(
                  `Hola, necesito asistencia con mi cuenta en ApuntaDeuda.\n\n*Estado:* ${bloqueoInfo.titulo}\n*Correo:* ${email || 'No especificado'}${bloqueoInfo.negocioNombre ? `\n*Negocio:* ${bloqueoInfo.negocioNombre}` : ''}\n\nPor favor, ¿podrían ayudarme a reactivar el acceso?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="login-btn-whatsapp"
                id="btn-soporte-whatsapp"
              >
                <RiWhatsappLine size={18} />
                <span>Contactar a Soporte por WhatsApp</span>
              </a>

              <button
                type="button"
                className="login-btn-modal-close"
                onClick={limpiarBloqueo}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}