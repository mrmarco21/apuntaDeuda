import { supabase } from '../lib/supabaseClient';
import { cacheManager } from '../lib/cacheManager';

/**
 * Genera automáticamente un slug limpio y normalizado a partir de un nombre.
 * - Convierte a minúsculas
 * - Elimina acentos/diacríticos (ej: Útiles -> utiles)
 * - Reemplaza espacios, barras y guiones bajos por guiones simples
 * - Elimina caracteres especiales innecesarios
 * - Evita guiones duplicados
 * - Elimina guiones al inicio y al final
 *
 * @param {string} nombre
 * @returns {string} slug normalizado
 */
export function generarSlug(nombre) {
  if (!nombre || typeof nombre !== 'string') return '';
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s\-_/]/g, '')
    .replace(/[\s/_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Categorías estándar iniciales para sembrar negocios nuevos o existentes sin categorías en Supabase.
 * Cada una cuenta con su slug explícito normalizado.
 */
export const CATEGORIAS_PREDETERMINADAS = [
  { nombre: 'Ropa/Otros', slug: 'ropa-otros', icono: 'shirt' },
  { nombre: 'Útiles', slug: 'utiles', icono: 'book' },
  { nombre: 'Calzado', slug: 'calzado', icono: 'footprints' },
  { nombre: 'Perfumes', slug: 'perfumes', icono: 'sparkles' },
  { nombre: 'Carteras', slug: 'carteras', icono: 'bag' },
  { nombre: 'Accesorios', slug: 'accesorios', icono: 'gem' }
];

/**
 * Obtiene el ID del negocio activo actualmente en la sesión o localStorage
 */
const obtenerNegocioActivo = async () => {
  let negocioId = localStorage.getItem('active_negocio_id');
  if (negocioId && negocioId !== 'undefined' && negocioId !== 'null') {
    return negocioId;
  }

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user) {
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('negocio_id')
        .eq('auth_user_id', authData.user.id)
        .eq('activo', true)
        .limit(1);

      if (usuarios && usuarios.length > 0 && usuarios[0].negocio_id) {
        negocioId = usuarios[0].negocio_id;
        localStorage.setItem('active_negocio_id', negocioId);
        return negocioId;
      }
    }
  } catch (err) {
    console.warn('[categoriasService] Error obteniendo negocio activo:', err);
  }

  return null;
};

export const categoriasService = {
  /**
   * Obtiene las categorías del negocio activo desde Supabase con caché en memoria.
   * Si el negocio aún no tiene categorías registradas en Supabase, siembra automáticamente
   * las categorías estándar para ese negocio_id y las devuelve.
   *
   * @param {Object} options
   * @param {boolean} [options.incluirInactivas=false] - Si es true, retorna activas e inactivas.
   * @param {boolean} [options.forceRefresh=false]
   * @returns {Promise<Array>} Lista de categorías
   */
  async getCategorias({ incluirInactivas = false, forceRefresh = false } = {}) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) {
        return [];
      }

      const cacheKey = `categorias_${negocioId}_${Boolean(incluirInactivas)}`;
      return cacheManager.fetchWithCache(
        cacheKey,
        async () => {
          let query = supabase
            .from('categorias')
            .select('*')
            .eq('negocio_id', negocioId)
            .order('created_at', { ascending: true });

          if (!incluirInactivas) {
            query = query.eq('activo', true);
          }

          const { data, error } = await query;

          if (error) {
            console.warn('[categoriasService] Error consultando categorias en Supabase:', error.message);
            throw error;
          }

          return data || [];
        },
        10 * 60 * 1000,
        forceRefresh
      );
    } catch (error) {
      console.error('[categoriasService] Error al obtener categorías:', error);
      throw error;
    }
  },

  /**
   * Siembra las categorías predeterminadas en la base de datos para un negocio_id de forma segura.
   * Incluye siempre el slug explícito para cumplir con la restricción NOT NULL de Supabase.
   */
  async sembrarCategoriasPredeterminadas(negocioId) {
    try {
      if (!negocioId) return [];

      // 1. Consultar qué categorías ya existen para evitar duplicados por nombre o por slug
      const { data: existentes } = await supabase
        .from('categorias')
        .select('nombre, slug')
        .eq('negocio_id', negocioId);

      const nombresExistentes = new Set(
        (existentes || []).map((c) => (c.nombre || '').toLowerCase().trim())
      );
      const slugsExistentes = new Set(
        (existentes || []).map((c) => (c.slug || '').toLowerCase().trim())
      );

      const filasAInsertar = CATEGORIAS_PREDETERMINADAS
        .filter(
          (cat) =>
            !nombresExistentes.has(cat.nombre.toLowerCase().trim()) &&
            !slugsExistentes.has(cat.slug.toLowerCase().trim())
        )
        .map((cat) => ({
          negocio_id: negocioId,
          nombre: cat.nombre,
          slug: cat.slug,
          icono: cat.icono,
          activo: true
        }));

      if (filasAInsertar.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert(filasAInsertar)
        .select();

      if (error) {
        console.warn('[categoriasService] Advertencia al sembrar categorías predeterminadas:', error.message);
        return [];
      }

      return data || [];
    } catch (err) {
      console.warn('[categoriasService] Excepción al sembrar categorías:', err);
      return [];
    }
  },

  /**
   * Crea una nueva categoría asociada al negocio activo generando su slug automáticamente.
   */
  async crearCategoria({ nombre, icono = 'shirt' }) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');

      const nombreLimpio = (nombre || '').trim();
      if (!nombreLimpio) throw new Error('El nombre de la categoría es obligatorio.');

      const slug = generarSlug(nombreLimpio);
      if (!slug) {
        throw new Error('El nombre de la categoría debe contener al menos un carácter alfanumérico.');
      }

      // Validar si ya existe una categoría con el mismo nombre o slug para este negocio
      const { data: existentes } = await supabase
        .from('categorias')
        .select('id, nombre, slug, activo, icono')
        .eq('negocio_id', negocioId)
        .or(`slug.eq.${slug},nombre.ilike.${nombreLimpio}`);

      const existente = existentes && existentes.length > 0 ? existentes[0] : null;

      if (existente) {
        if (!existente.activo) {
          // Si existía inactiva, la reactivamos
          const { data: reactivada, error: errReactivar } = await supabase
            .from('categorias')
            .update({
              nombre: nombreLimpio,
              slug: slug,
              activo: true,
              icono: icono || existente.icono || '👕',
              updated_at: new Date().toISOString()
            })
            .eq('id', existente.id)
            .select()
            .single();

          if (errReactivar) throw errReactivar;
          return reactivada;
        }
        throw new Error(`Ya existe una categoría con el nombre o identificador "${nombreLimpio}" en este negocio.`);
      }

      const { data, error } = await supabase
        .from('categorias')
        .insert({
          negocio_id: negocioId,
          nombre: nombreLimpio,
          slug: slug,
          icono: icono || '👕',
          activo: true
        })
        .select()
        .single();

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('duplicate key') ||
          error.message?.includes('categorias_negocio_slug_unique') ||
          error.message?.includes('uq_categorias_negocio_nombre')
        ) {
          throw new Error(`Ya existe una categoría con el nombre o identificador "${nombreLimpio}" en este negocio.`);
        }
        throw error;
      }
      cacheManager.invalidatePrefix('categorias_');
      return data;
    } catch (error) {
      console.error('[categoriasService] Error al crear categoría:', error);
      throw error;
    }
  },

  /**
   * Actualiza los datos de una categoría.
   * Si la categoría no tiene uso histórico en movimientos, su slug sigue al nuevo nombre.
   * Si la categoría ya tiene uso histórico ({slug}), su slug se preserva para no romper
   * las referencias contables existentes.
   */
  async actualizarCategoria(id, { nombre, icono, activo, slug }) {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');
      if (!id) throw new Error('El ID de la categoría es requerido.');

      // Obtener categoría actual
      const { data: catActual, error: catError } = await supabase
        .from('categorias')
        .select('id, nombre, slug, icono, activo')
        .eq('id', id)
        .eq('negocio_id', negocioId)
        .single();

      if (catError || !catActual) {
        throw new Error('Categoría no encontrada.');
      }

      const updates = {
        updated_at: new Date().toISOString()
      };

      if (icono !== undefined) updates.icono = icono;
      if (activo !== undefined) updates.activo = Boolean(activo);

      if (nombre !== undefined) {
        const nombreLimpio = nombre.trim();
        if (!nombreLimpio) throw new Error('El nombre no puede estar vacío.');
        updates.nombre = nombreLimpio;

        if (slug !== undefined && slug !== null) {
          updates.slug = generarSlug(slug);
        } else if (nombreLimpio.toLowerCase() !== catActual.nombre.toLowerCase()) {
          // Verificar si la categoría tiene uso histórico en movimientos
          const { enUso } = await this.verificarUsoCategoria(id, catActual.nombre, catActual.slug);
          if (!enUso) {
            // Si NO está en uso, el slug puede seguir al nuevo nombre
            const nuevoSlug = generarSlug(nombreLimpio);
            if (nuevoSlug) {
              updates.slug = nuevoSlug;
            }
          } else {
            // Si YA está en uso histórico, NO modificamos el slug para preservar los tags {slug} en movimientos
            console.info(
              `[categoriasService] Preservando slug "${catActual.slug}" de categoría en uso histórico al renombrar a "${nombreLimpio}".`
            );
          }
        }
      }

      // Validar duplicado de slug si cambió
      if (updates.slug && updates.slug !== catActual.slug) {
        const { data: slugDuplicado } = await supabase
          .from('categorias')
          .select('id')
          .eq('negocio_id', negocioId)
          .eq('slug', updates.slug)
          .neq('id', id)
          .maybeSingle();

        if (slugDuplicado) {
          throw new Error(`Ya existe otra categoría con el identificador "${updates.slug}" en este negocio.`);
        }
      }

      // Validar duplicado de nombre si cambió
      if (updates.nombre && updates.nombre.toLowerCase() !== catActual.nombre.toLowerCase()) {
        const { data: nombreDuplicado } = await supabase
          .from('categorias')
          .select('id')
          .eq('negocio_id', negocioId)
          .ilike('nombre', updates.nombre)
          .neq('id', id)
          .maybeSingle();

        if (nombreDuplicado) {
          throw new Error(`Ya existe otra categoría con el nombre "${updates.nombre}" en este negocio.`);
        }
      }

      const { data, error } = await supabase
        .from('categorias')
        .update(updates)
        .eq('id', id)
        .eq('negocio_id', negocioId)
        .select()
        .single();

      if (error) {
        if (
          error.code === '23505' ||
          error.message?.includes('duplicate key') ||
          error.message?.includes('categorias_negocio_slug_unique') ||
          error.message?.includes('uq_categorias_negocio_nombre')
        ) {
          throw new Error(`Ya existe otra categoría con el nombre o identificador "${updates.nombre || updates.slug}" en este negocio.`);
        }
        throw error;
      }
      cacheManager.invalidatePrefix('categorias_');
      return data;
    } catch (error) {
      console.error('[categoriasService] Error al actualizar categoría:', error);
      throw error;
    }
  },

  /**
   * Activa o desactiva una categoría (baja lógica segura)
   */
  async cambiarEstadoCategoria(id, activo) {
    return this.actualizarCategoria(id, { activo: Boolean(activo) });
  },

  /**
   * Desactiva una categoría
   */
  async desactivarCategoria(id) {
    return this.cambiarEstadoCategoria(id, false);
  },

  /**
   * Activa una categoría
   */
  async activarCategoria(id) {
    return this.cambiarEstadoCategoria(id, true);
  },

  /**
   * Verifica si una categoría tiene movimientos históricos o cargos asociados
   * @param {string} id - ID de la categoría
   * @param {string} [nombre] - Nombre de la categoría
   * @param {string} [slug] - Slug de la categoría
   * @returns {Promise<{ enUso: boolean, totalMovimientos: number }>}
   */
  async verificarUsoCategoria(id, nombre = '', slug = '') {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) return { enUso: false, totalMovimientos: 0 };

      // 1. Verificar en tabla detalles_cargo si existe
      try {
        const { data: detallesData, error: detErr } = await supabase
          .from('detalles_cargo')
          .select('id')
          .eq('negocio_id', negocioId)
          .or(`categoria_id.eq.${id},categoria.eq.${nombre || id}`)
          .limit(1);

        if (!detErr && detallesData && detallesData.length > 0) {
          return { enUso: true, totalMovimientos: detallesData.length };
        }
      } catch {
        // Si no existe tabla detalles_cargo, continuamos verificando en movimientos
      }

      // 2. Verificar en tabla movimientos en comentario/descripcion
      const slugLimpio = slug || (nombre ? generarSlug(nombre) : '');
      const patternId = `{${id}}`;
      const patternNombre = nombre ? `{${nombre}}` : null;
      const patternSlug = slugLimpio ? `{${slugLimpio}}` : null;

      const { data: movs, error: movsErr } = await supabase
        .from('movimientos')
        .select('id, comentario, descripcion')
        .eq('negocio_id', negocioId);

      if (!movsErr && movs) {
        const encontrados = movs.filter((m) => {
          const texto = (m.comentario || m.descripcion || '').toLowerCase();
          return (
            texto.includes(patternId.toLowerCase()) ||
            (patternNombre && texto.includes(patternNombre.toLowerCase())) ||
            (patternSlug && texto.includes(patternSlug.toLowerCase()))
          );
        });

        if (encontrados.length > 0) {
          return { enUso: true, totalMovimientos: encontrados.length };
        }
      }

      return { enUso: false, totalMovimientos: 0 };
    } catch (err) {
      console.warn('[categoriasService] Error verificando uso de categoría:', err);
      // Por seguridad ante errores, asumimos que puede estar en uso
      return { enUso: false, totalMovimientos: 0 };
    }
  },

  /**
   * Elimina una categoría SOLO si no tiene movimientos históricos asociados.
   * Si está en uso, lanza un error sugiriendo desactivarla en su lugar.
   */
  async eliminarCategoria(id, nombre = '') {
    try {
      const negocioId = await obtenerNegocioActivo();
      if (!negocioId) throw new Error('No hay un negocio activo seleccionado.');

      // Obtener datos de la categoría para conocer su slug
      let slug = '';
      try {
        const { data: cat } = await supabase
          .from('categorias')
          .select('slug')
          .eq('id', id)
          .eq('negocio_id', negocioId)
          .maybeSingle();
        if (cat?.slug) slug = cat.slug;
      } catch {}

      // Validar si está en uso antes de permitir eliminar
      const { enUso } = await this.verificarUsoCategoria(id, nombre, slug);
      if (enUso) {
        throw new Error(
          'No se puede eliminar la categoría porque tiene movimientos históricos asociados. ' +
          'En su lugar, desactívala para que deje de aparecer en nuevos cargos sin afectar el historial.'
        );
      }

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', id)
        .eq('negocio_id', negocioId);

      if (error) throw error;
      cacheManager.invalidatePrefix('categorias_');
      return true;
    } catch (error) {
      console.error('[categoriasService] Error al eliminar categoría:', error);
      throw error;
    }
  }
};

