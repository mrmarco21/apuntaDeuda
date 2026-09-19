/**
 * Gestor de Caché en Memoria con soporte SWR (Stale-While-Revalidate)
 * y deduplicación de peticiones concurrentes para optimización PWA.
 */

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.inFlightRequests = new Map();
    this.defaultTTL = 3 * 60 * 1000; // 3 minutos por defecto
  }

  /**
   * Guarda un valor en el caché con un tiempo de vida (TTL)
   * @param {string} key - Clave única del recurso
   * @param {*} data - Datos a almacenar
   * @param {number} [ttlMs] - Milisegundos de validez (opcional)
   */
  set(key, data, ttlMs = this.defaultTTL) {
    if (!key) return;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
      savedAt: Date.now()
    });
  }

  /**
   * Obtiene el dato en caché de forma inmediata.
   * Si ha expirado, devuelve igualmente los datos pero marca `isStale: true` (patrón SWR).
   * @param {string} key
   * @returns {{ data: *, isStale: boolean } | null}
   */
  get(key) {
    if (!key || !this.cache.has(key)) return null;

    const entry = this.cache.get(key);
    const isStale = Date.now() > entry.expiresAt;

    return {
      data: entry.data,
      isStale,
      savedAt: entry.savedAt
    };
  }

  /**
   * Devuelve directamente los datos crudos si existen (útil para inicializar useState)
   * @param {string} key
   * @returns {* | null}
   */
  getRawData(key) {
    const entry = this.get(key);
    return entry ? entry.data : null;
  }

  /**
   * Ejecuta una función asíncrona de obtención de datos deduplicando peticiones en vuelo
   * y cacheando el resultado automáticamente.
   * @param {string} key
   * @param {Function} fetcherFn - Función que devuelve una promesa con los datos
   * @param {number} [ttlMs]
   * @param {boolean} [forceRefresh=false]
   */
  async fetchWithCache(key, fetcherFn, ttlMs = this.defaultTTL, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached && !cached.isStale) {
        return cached.data;
      }
    }

    // Si ya hay una petición idéntica ejecutándose, compartir la misma promesa (deduplicación)
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key);
    }

    const requestPromise = (async () => {
      try {
        const freshData = await fetcherFn();
        this.set(key, freshData, ttlMs);
        return freshData;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, requestPromise);
    return requestPromise;
  }

  /**
   * Invalida una o varias claves específicas
   * @param {string|string[]} keys
   */
  invalidate(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    for (const key of keysArray) {
      if (key) {
        this.cache.delete(key);
        this.inFlightRequests.delete(key);
      }
    }
  }

  /**
   * Invalida todas las claves que empiecen con un prefijo (ej: 'cuentas_')
   * @param {string} prefix
   */
  invalidatePrefix(prefix) {
    if (!prefix) return;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.inFlightRequests.delete(key);
      }
    }
  }

  /**
   * Limpia por completo todo el caché (al cerrar sesión o cambiar de negocio)
   */
  clear() {
    this.cache.clear();
    this.inFlightRequests.clear();
  }
}

export const cacheManager = new CacheManager();
