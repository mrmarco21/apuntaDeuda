export function getSimboloMoneda() {
  try {
    const saved = localStorage.getItem('@config_negocio');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.simboloMoneda) return parsed.simboloMoneda;
      if (parsed.moneda === 'USD' || parsed.moneda === 'MXN' || parsed.moneda === 'COP') return '$';
      if (parsed.moneda === 'EUR') return '€';
    }
  } catch (e) {}
  return 'S/';
}

export function formatCurrency(monto, customSymbol) {
  const symbol = customSymbol || getSimboloMoneda();
  const num = Number(monto || 0);
  const formatted = num.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

export const SLUG_CATEGORIAS_MAP = {
  'ropa-otros': { nombre: 'Ropa/Otros', icono: '👕' },
  'ropa': { nombre: 'Ropa', icono: '👕' },
  'calzado': { nombre: 'Calzado', icono: '👟' },
  'zapato': { nombre: 'Calzado', icono: '👟' },
  'zapatos': { nombre: 'Calzado', icono: '👟' },
  'perfume': { nombre: 'Perfumes', icono: '✨' },
  'perfumes': { nombre: 'Perfumes', icono: '✨' },
  'carteras': { nombre: 'Carteras', icono: '👜' },
  'cartera': { nombre: 'Carteras', icono: '👜' },
  'joyeria': { nombre: 'Joyería', icono: '💍' },
  'joyas': { nombre: 'Joyería', icono: '💍' },
  'cosmeticos': { nombre: 'Cosméticos', icono: '💄' },
  'cosmetico': { nombre: 'Cosméticos', icono: '💄' },
  'maquillaje': { nombre: 'Cosméticos', icono: '💄' },
  'utiles': { nombre: 'Útiles', icono: '📚' },
  'util': { nombre: 'Útiles', icono: '📚' },
  'libreria': { nombre: 'Librería', icono: '📚' },
};

/**
 * Obtiene el nombre formateado con icono de una categoría
 * @param {string} catKey ID o nombre o slug de categoría
 * @param {Array} todasCategorias Lista de categorías de Supabase
 */
export function obtenerNombreCategoria(catKey, todasCategorias = []) {
  if (!catKey) return '👕 Ropa/Otros';

  // 1. Buscar en lista dinámica de Supabase (por id, slug o nombre)
  if (Array.isArray(todasCategorias) && todasCategorias.length > 0) {
    const keyStr = String(catKey).toLowerCase().trim();
    const cat = todasCategorias.find(
      (c) =>
        c.id === catKey ||
        (c.slug && c.slug.toLowerCase() === keyStr) ||
        (c.nombre && c.nombre.toLowerCase() === keyStr) ||
        (c.id && c.id.toLowerCase() === keyStr)
    );
    if (cat) return cat.nombre;
  }

  // 2. Mapeo para claves slug históricas
  const keyLower = String(catKey).toLowerCase().trim();
  if (SLUG_CATEGORIAS_MAP[keyLower]) {
    return SLUG_CATEGORIAS_MAP[keyLower].nombre;
  }

  // 3. Si es un UUID no encontrado en la lista, no mostrar el UUID crudo
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(catKey);
  if (isUUID) {
    return 'General';
  }

  return catKey;
}

export function getFechaHoyLocal() {
  const d = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const yyyy = parts.find((p) => p.type === 'year')?.value || d.getFullYear();
    const mm = parts.find((p) => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
    const dd = parts.find((p) => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}

export function obtenerFechaInput(fechaStr) {
  if (!fechaStr) return getFechaHoyLocal();
  try {
    const str = String(fechaStr).trim();
    // Si ya es un formato simple YYYY-MM-DD
    const matchSimple = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchSimple) return matchSimple[0];

    // Si viene como medianoche pura T00:00:00 o 00:00:00
    if (str.includes('T00:00:00') || str.includes(' 00:00:00')) {
      const matchZero = str.split(/[T\s]/)[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchZero) return matchZero[0];
    }

    // Si es un timestamp completo (ej: 2026-09-15T00:37:10.000Z), convertir a fecha local de Perú
    const d = new Date(str);
    if (isNaN(d.getTime())) return getFechaHoyLocal();

    const formatter = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(d);
    const yyyy = parts.find((p) => p.type === 'year')?.value;
    const mm = parts.find((p) => p.type === 'month')?.value;
    const dd = parts.find((p) => p.type === 'day')?.value;
    if (yyyy && mm && dd) return `${yyyy}-${mm}-${dd}`;

    return getFechaHoyLocal();
  } catch {
    return getFechaHoyLocal();
  }
}

export function parsearFechaLocalAISO(fecha) {
  const now = new Date();

  if (!fecha) {
    return now.toISOString();
  }

  if (typeof fecha === 'string') {
    const str = fecha.trim();
    const match = str.split(/[T\s]/)[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[3], 10);
      const hoyLocal = getFechaHoyLocal();

      // Si la fecha elegida es la fecha de HOY en hora local de Perú:
      // Conservar la hora, minutos y segundos locales reales del momento actual
      if (str.split(/[T\s]/)[0] === hoyLocal) {
        const dateObj = new Date(year, month, day, now.getHours(), now.getMinutes(), now.getSeconds());
        return dateObj.toISOString();
      }

      // Si se especificó una hora explícita en el string con T (y no es 00:00:00)
      if (str.includes('T') && !str.includes('T00:00:00') && !str.includes(' 00:00:00')) {
        const d = new Date(str);
        if (!isNaN(d.getTime())) return d.toISOString();
      }

      // Para fechas pasadas o futuras manuales (sin hora específica), usar las 12:00 mediodía local
      const dateObj = new Date(year, month, day, 12, 0, 0);
      return dateObj.toISOString();
    }
  }

  if (fecha instanceof Date) {
    return fecha.toISOString();
  }

  return new Date().toISOString();
}

export function formatearFechaCorta(fechaStr) {
  if (!fechaStr) return '';
  try {
    const str = String(fechaStr).trim();
    // Caso 1: Cadena simple YYYY-MM-DD
    const matchSimple = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchSimple) {
      return `${matchSimple[3]}/${matchSimple[2]}/${matchSimple[1]}`;
    }
    // Caso 2: Cadena con medianoche pura
    if (str.includes('T00:00:00') || str.includes(' 00:00:00')) {
      const matchZero = str.split(/[T\s]/)[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchZero) {
        return `${matchZero[3]}/${matchZero[2]}/${matchZero[1]}`;
      }
    }
    // Caso 3: Timestamp con hora (ej: 2026-09-15T00:37:10.000Z o backup Android)
    // Convertir con la zona horaria oficial de Perú (America/Lima)
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Lima'
    }).format(d);
  } catch {
    return String(fechaStr);
  }
}

export function parsearPrendas(comentario, fechaFallback = null, todasCategorias = []) {
  if (!comentario || typeof comentario !== 'string') return [];

  const partes = comentario.split(' | ');
  const res = partes.map((parte) => {
    const parteTrim = parte.trim();
    if (!parteTrim) return null;

    // 1. Formato completo con categoría: "Blusa (S/48.00) [28/06/2026] {ropa-otros}" o "(S/ 48.00)" o "(48.00)"
    const matchCompleto = parteTrim.match(
      /^(.+?)\s*\((?:S\/\s*|\$|€)?(\d+(?:\.\d+)?)\)\s*(?:x\s*(\d+))?\s*\[(\d{2}\/\d{2}\/\d{4})\]\s*\{([^}]+)\}$/i
    );
    if (matchCompleto) {
      const [, desc, precio, cant, fechaStr, catId] = matchCompleto;
      const [dia, mes, anio] = fechaStr.split('/');
      return {
        descripcion: desc.trim(),
        monto: parseFloat(precio),
        cantidad: cant ? parseInt(cant, 10) : 1,
        fecha: `${anio}-${mes}-${dia}`,
        fechaDisplay: fechaStr,
        categoria: catId.trim(),
        categoriaNombre: obtenerNombreCategoria(catId.trim(), todasCategorias),
      };
    }

    // 2. Formato con fecha sin categoría: "Blusa (S/48.00) [28/06/2026]"
    const matchConFecha = parteTrim.match(
      /^(.+?)\s*\((?:S\/\s*|\$|€)?(\d+(?:\.\d+)?)\)\s*(?:x\s*(\d+))?\s*\[(\d{2}\/\d{2}\/\d{4})\]$/i
    );
    if (matchConFecha) {
      const [, desc, precio, cant, fechaStr] = matchConFecha;
      const [dia, mes, anio] = fechaStr.split('/');
      return {
        descripcion: desc.trim(),
        monto: parseFloat(precio),
        cantidad: cant ? parseInt(cant, 10) : 1,
        fecha: `${anio}-${mes}-${dia}`,
        fechaDisplay: fechaStr,
        categoria: 'ropa-otros',
        categoriaNombre: obtenerNombreCategoria('ropa-otros', todasCategorias),
      };
    }

    // 3. Formato simple: "Blusa (S/48.00)" o "Blusa (S/48.00) x 2"
    const matchSimple = parteTrim.match(
      /^(.+?)\s*\((?:S\/\s*|\$|€)?(\d+(?:\.\d+)?)\)\s*(?:x\s*(\d+))?$/i
    );
    if (matchSimple) {
      const [, desc, precio, cant] = matchSimple;
      return {
        descripcion: desc.trim(),
        monto: parseFloat(precio),
        cantidad: cant ? parseInt(cant, 10) : 1,
        fecha: fechaFallback || getFechaHoyLocal(),
        fechaDisplay: fechaFallback ? formatearFechaCorta(fechaFallback) : '',
        categoria: 'ropa-otros',
        categoriaNombre: obtenerNombreCategoria('ropa-otros', todasCategorias),
      };
    }

    // 4. Texto libre con posible residuo de llaves o corchetes
    const descLimpia = parteTrim
      .replace(/\{[^}]+\}/g, '')
      .replace(/\[\d{2}\/\d{2}\/\d{4}\]/g, '')
      .trim();

    return {
      descripcion: descLimpia || parteTrim,
      monto: null,
      cantidad: 1,
      fecha: fechaFallback || getFechaHoyLocal(),
      fechaDisplay: fechaFallback ? formatearFechaCorta(fechaFallback) : '',
      categoria: 'ropa-otros',
      categoriaNombre: obtenerNombreCategoria('ropa-otros', todasCategorias),
    };
  }).filter(Boolean);

  return res.filter((p) => p.descripcion);
}

/**
 * Limpia cualquier texto de movimiento para no mostrar {UUIDs} ni corchetes crudos
 */
export function limpiarDescripcionTexto(comentario, tipo = 'VENTA') {
  if (!comentario) {
    const esAbono = tipo === 'ABONO' || tipo === 'abono' || tipo === 'pago';
    return esAbono ? 'Pago' : 'Sin descripción';
  }

  const esAbono = tipo === 'ABONO' || tipo === 'abono' || tipo === 'pago';
  if (esAbono) {
    const limpio = comentario
      .replace(/\{[^}]+\}/g, '')
      .replace(/\s*\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\]\s*$/g, '')
      .replace(/\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\]/g, '')
      .trim();
    return limpio || 'Pago';
  }

  // Para ventas, limpiar {UUID} y fechas en corchetes si vienen en texto plano
  return comentario
    .replace(/\{[^}]+\}/g, '')
    .replace(/\[\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\]/g, '')
    .trim();
}

/**
 * Devuelve un resumen limpio y corto para tarjetas o lista del Dashboard (solo nombres de productos)
 */
export function resumirMovimientoTexto(mov, todasCategorias = [], incluirCategorias = false) {
  if (!mov) return '';
  const esCargo =
    mov.tipo === 'CARGO' ||
    mov.tipo === 'cargo' ||
    mov.tipo === 'venta';

  const texto = mov.comentario || mov.descripcion || '';

  if (!esCargo) {
    return limpiarDescripcionTexto(texto, 'ABONO');
  }

  // Si tiene detalles explícitos en array
  if (Array.isArray(mov.detalles) && mov.detalles.length > 0) {
    const nombres = mov.detalles.map((d) => {
      const nom = d.descripcion || d.concepto || d.producto || 'Item';
      const cantStr = d.cantidad && d.cantidad > 1 ? `${d.cantidad}x ` : '';
      if (incluirCategorias && (d.categoria_id || d.categoria)) {
        const cat = obtenerNombreCategoria(d.categoria_id || d.categoria, todasCategorias);
        return `${cantStr}${nom} (${cat})`;
      }
      return `${cantStr}${nom}`;
    });
    return nombres.join(', ');
  }

  // Si viene con formato estructurado en comentario
  const items = parsearPrendas(texto, mov.fecha, todasCategorias);
  const itemsConPrecio = items.filter((i) => i.monto !== null);

  if (itemsConPrecio.length > 0) {
    const nombres = itemsConPrecio.map((i) => {
      const cantStr = i.cantidad && i.cantidad > 1 ? `${i.cantidad}x ` : '';
      if (incluirCategorias && i.categoriaNombre) {
        return `${cantStr}${i.descripcion} (${i.categoriaNombre})`;
      }
      return `${cantStr}${i.descripcion}`;
    });
    return nombres.join(', ');
  }

  if (items.length > 0 && items[0].descripcion) {
    return items.map((i) => i.descripcion).join(', ');
  }

  return limpiarDescripcionTexto(texto, 'VENTA');
}

/**
 * Devuelve la descripción para las listas de cuentas activas en ClientaDetalle (ej: "sandalias ipanema +1")
 */
export function resumirMovimientoCuentaActiva(mov, todasCategorias = []) {
  if (!mov) return 'Sin descripción';
  const esCargo =
    mov.tipo === 'CARGO' ||
    mov.tipo === 'cargo' ||
    mov.tipo === 'venta';

  const texto = mov.comentario || mov.descripcion || '';

  if (!esCargo) {
    return limpiarDescripcionTexto(texto, 'ABONO');
  }

  if (Array.isArray(mov.detalles) && mov.detalles.length > 0) {
    const primero = mov.detalles[0].descripcion || mov.detalles[0].concepto || mov.detalles[0].producto || 'Producto';
    const cantStr = mov.detalles[0].cantidad && mov.detalles[0].cantidad > 1 ? `${mov.detalles[0].cantidad}x ` : '';
    if (mov.detalles.length === 1) return `${cantStr}${primero}`;
    return `${cantStr}${primero} +${mov.detalles.length - 1}`;
  }

  const items = parsearPrendas(texto, mov.fecha, todasCategorias);
  const itemsConPrecio = items.filter((i) => i.monto !== null);

  if (itemsConPrecio.length > 0) {
    const primero = itemsConPrecio[0].descripcion || 'Producto';
    const cantStr = itemsConPrecio[0].cantidad && itemsConPrecio[0].cantidad > 1 ? `${itemsConPrecio[0].cantidad}x ` : '';
    if (itemsConPrecio.length === 1) return `${cantStr}${primero}`;
    return `${cantStr}${primero} +${itemsConPrecio.length - 1}`;
  }

  if (items.length > 0 && items[0].descripcion) {
    if (items.length === 1) return items[0].descripcion;
    return `${items[0].descripcion} +${items.length - 1}`;
  }

  return limpiarDescripcionTexto(texto, 'VENTA');
}

/**
 * Formatea una fecha/timestamp en tiempo relativo legible (ej: "Hace 5 min", "Hace 2 horas", "Ayer")
 */
export function formatTiempoRelativo(fechaStr, textoVacio = 'Sin movimientos') {
  if (!fechaStr) return textoVacio;
  try {
    const d = new Date(fechaStr);
    if (isNaN(d.getTime())) return textoVacio;

    const ahora = new Date();
    const diffMs = ahora - d;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHor = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHor / 24);

    if (diffSec < 45) return 'Hace un momento';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHor < 24) return `Hace ${diffHor} h${diffHor > 1 ? 's' : ''}`;
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} días`;

    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return textoVacio;
  }
}

/**
 * Genera un enlace directo wa.me con mensaje pre-armado inteligente según el estado del negocio
 */
export function generarLinkWhatsApp({ numero, nombreNegocio = 'tienda', estadoSuscripcion, fechaVencimiento }) {
  if (!numero) return null;
  const numLimpio = String(numero).replace(/\D/g, '');
  if (!numLimpio) return null;

  let mensaje = `Hola *${nombreNegocio}*, te saludamos del equipo de ApuntaDeuda 📱. Queríamos consultar cómo te va con la plataforma y si necesitas ayuda o soporte técnico.`;

  if (estadoSuscripcion === 'por_vencer' || estadoSuscripcion === 'vencido') {
    const fStr = fechaVencimiento
      ? new Date(fechaVencimiento).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'próximamente';

    if (estadoSuscripcion === 'vencido') {
      mensaje = `Hola *${nombreNegocio}*, te saludamos de ApuntaDeuda 📱. Te recordamos que tu suscripción venció el *${fStr}*. ¿Deseas renovar tu acceso para continuar usando la plataforma?`;
    } else {
      mensaje = `Hola *${nombreNegocio}*, te saludamos de ApuntaDeuda 📱. Te recordamos que tu suscripción vence el *${fStr}*. ¿Deseas coordinar la renovación de tu acceso?`;
    }
  }

  const encoded = encodeURIComponent(mensaje);
  return `https://wa.me/${numLimpio}?text=${encoded}`;
}

/**
 * Parsea un User Agent y retorna una descripción limpia del navegador y sistema operativo
 * @param {string} ua String del User Agent
 * @returns {string} Ejemplo: "Chrome (Windows)", "Safari (iOS)", "Firefox (Android)"
 */
export function obtenerInfoNavegador(ua) {
  if (!ua || typeof ua !== 'string') return 'Navegador Web';

  let navegador = 'Navegador Web';
  let os = '';

  // Detección de OS
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'Mac';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  // Detección de Navegador
  if (/edg/i.test(ua)) navegador = 'Edge';
  else if (/opr|opera/i.test(ua)) navegador = 'Opera';
  else if (/chrome|crios/i.test(ua)) navegador = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) navegador = 'Firefox';
  else if (/safari/i.test(ua)) navegador = 'Safari';

  if (os) {
    return `${navegador} (${os})`;
  }
  return navegador;
}

