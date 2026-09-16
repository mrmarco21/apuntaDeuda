/**
 * Servicio para la subida de imágenes a Cloudinary usando Unsigned Upload Preset.
 * Esto permite subir imágenes directamente desde el cliente sin exponer API Secrets.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || '';

export const cloudinaryService = {
  /**
   * Verifica si Cloudinary está configurado mediante variables de entorno.
   */
  isConfigured() {
    return Boolean(CLOUD_NAME && UPLOAD_PRESET);
  },

  /**
   * Obtiene la configuración actual de Cloudinary.
   */
  getConfig() {
    return {
      cloudName: CLOUD_NAME,
      uploadPreset: UPLOAD_PRESET,
    };
  },

  /**
   * Sube una imagen a Cloudinary.
   * @param {File|Blob} file - El archivo a subir
   * @param {Object} options - Opciones opcionales { folder, onProgress, cloudName, uploadPreset }
   * @returns {Promise<{ url: string, secure_url: string, public_id: string, width: number, height: number }>}
   */
  async uploadImage(file, options = {}) {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo para subir.');
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif', 'image/avif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Formato no soportado. Sube una imagen en formato PNG, JPG, WebP, SVG o GIF.');
    }

    // Validar tamaño máximo (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('La imagen supera el límite de 5 MB. Por favor elige una imagen más ligera.');
    }

    const cloudName = options.cloudName || CLOUD_NAME;
    const uploadPreset = options.uploadPreset || UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(
        'Faltan las variables de Cloudinary en el archivo .env (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).'
      );
    }

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    if (options.folder) {
      formData.append('folder', options.folder);
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMsg = data?.error?.message || `Error en Cloudinary (${response.status})`;
        console.error('Error al subir a Cloudinary:', data);
        throw new Error(errorMsg);
      }

      return {
        url: data.url,
        secure_url: data.secure_url,
        public_id: data.public_id,
        width: data.width,
        height: data.height,
        format: data.format,
      };
    } catch (err) {
      console.error('Excepción al conectar con Cloudinary:', err);
      throw new Error(err.message || 'Error de conexión con el servicio de imágenes.');
    }
  },
};
