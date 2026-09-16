import React, { useState, useRef } from 'react';
import { cloudinaryService } from '../services/cloudinaryService';
import './ImageUploader.css';

export default function ImageUploader({
  value = '',
  onChange,
  label = 'Logotipo',
  description = 'Sube una imagen cuadrada o rectangular (PNG, JPG, WebP o SVG, máx 5MB).',
  fallbackSrc = '/logo.png',
  disabled = false,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [modoUrl, setModoUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(value || '');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const isConfigured = cloudinaryService.isConfigured();

  const handleFile = async (file) => {
    if (!file) return;
    setError('');
    setUploading(true);

    try {
      const result = await cloudinaryService.uploadImage(file, {
        folder: 'apuntadeuda_logos',
      });
      if (result?.secure_url) {
        onChange(result.secure_url);
        setUrlInput(result.secure_url);
      }
    } catch (err) {
      console.error('Error al subir imagen:', err);
      setError(err.message || 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled || uploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    setUrlInput('');
    setError('');
  };

  const handleSaveUrl = (e) => {
    e.preventDefault();
    onChange(urlInput.trim());
    setError('');
  };

  return (
    <div className="image-uploader">
      {label && <label className="image-uploader-label">{label}</label>}
      {description && <p className="image-uploader-desc">{description}</p>}

      {!isConfigured && !modoUrl && (
        <div className="image-uploader-warning">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <span>Cloudinary no está configurado en el archivo <code>.env</code>.</span>
            <p>Puedes ingresar la URL de la imagen directamente o configurar tus claves de Cloudinary.</p>
          </div>
        </div>
      )}

      <div className="image-uploader-main">
        {/* Vista previa de la imagen actual */}
        <div className="image-preview-wrapper">
          <img
            src={value || fallbackSrc}
            alt="Vista previa del logo"
            className={`image-preview-img ${!value ? 'is-fallback' : ''}`}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackSrc;
            }}
          />
          {value && (
            <button
              type="button"
              className="image-preview-remove-btn"
              onClick={handleRemove}
              title="Restablecer al logo predeterminado"
              disabled={disabled || uploading}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Zona de acción */}
        <div className="image-uploader-actions">
          {!modoUrl ? (
            <div
              className={`image-dropzone ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''} ${
                uploading ? 'uploading' : ''
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                disabled={disabled || uploading}
              />

              {uploading ? (
                <div className="dropzone-status">
                  <div className="upload-spinner" />
                  <span>Cargando imagen...</span>
                </div>
              ) : (
                <div className="dropzone-status">
                  <div className="dropzone-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <div className="dropzone-text">
                    <strong>Haz clic o arrastra una imagen aquí</strong>
                    <span>PNG, JPG, WebP, SVG hasta 5MB</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="image-url-input-wrap">
              <input
                type="url"
                className="image-url-input"
                placeholder="https://ejemplo.com/mi-logo.png"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={disabled || uploading}
              />
              <button
                type="button"
                className="btn-apply-url"
                onClick={handleSaveUrl}
                disabled={disabled || uploading || !urlInput.trim()}
              >
                Aplicar
              </button>
            </div>
          )}

          <div className="image-uploader-switch">
            <button
              type="button"
              className="btn-link-toggle"
              onClick={() => {
                setModoUrl(!modoUrl);
                setUrlInput(value || '');
                setError('');
              }}
              disabled={disabled || uploading}
            >
              {modoUrl ? '← Subir archivo de imagen' : 'O pegar enlace directo (URL)'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="image-uploader-error">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
