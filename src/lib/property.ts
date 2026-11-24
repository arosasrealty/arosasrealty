// src/lib/property.ts
// Utilidades compartidas: domicilio atomizado, coordenadas, mapas, ID corto e imágenes.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://arosasrealty-sigma.vercel.app';

export interface AddressParts {
  street?: string | null;          // Calle (sin número)
  street_number?: string | null;   // Número exterior
  interior_number?: string | null; // Número interior
  neighborhood?: string | null;    // Colonia
  city?: string | null;            // Alcaldía / Municipio / Ciudad
  state?: string | null;           // Estado
  postal_code?: string | null;     // C.P.
}

const clean = (v?: string | number | null): string => (v ?? '').toString().trim();

const normalize = (v: string): string =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,]/g, '').trim();

/** "Av. México Coyoacán 123" (con número exterior, si existe) */
export function buildStreetLine(p: AddressParts, withInterior = true): string {
  const street = clean(p.street);
  const ext = clean(p.street_number);
  const int = clean(p.interior_number);
  let line = street;
  if (ext) line = `${line} ${ext}`.trim();
  if (withInterior && int) line = `${line}, Int. ${int}`.trim();
  return line;
}

/** Domicilio completo para MOSTRAR y COPIAR: "Av. X 123, Int. 4, Xoco, Benito Juárez, CDMX, C.P. 03330" */
export function buildFullAddress(p: AddressParts): string {
  const parts: string[] = [];
  const push = (v: string) => {
    if (!v) return;
    if (parts.some((x) => normalize(x) === normalize(v))) return; // evita "CDMX, CDMX"
    parts.push(v);
  };
  push(buildStreetLine(p));
  push(clean(p.neighborhood));
  push(clean(p.city));
  push(clean(p.state));
  const cp = clean(p.postal_code);
  if (cp) parts.push(`C.P. ${cp}`);
  return parts.join(', ');
}

/** Cadena que consumen los mapas / geocodificador (sin "Int." ni "C.P.") */
export function buildMapQuery(p: AddressParts): string {
  const parts: string[] = [];
  const push = (v: string) => {
    if (!v) return;
    if (parts.some((x) => normalize(x) === normalize(v))) return;
    parts.push(v);
  };
  push(buildStreetLine(p, false));
  push(clean(p.neighborhood));
  push(clean(p.city));
  push(clean(p.state));
  push(clean(p.postal_code));
  push('México');
  return parts.join(', ');
}

/** Coordenadas válidas o null. Nunca inventa coordenadas. */
export function getCoords(p: { lat?: unknown; lng?: unknown }): { lat: number; lng: number } | null {
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (p.lat == null || p.lng == null || p.lat === '' || p.lng === '') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/** URL del iframe de Google Maps: usa coordenadas si existen; si no, el domicilio atomizado */
export function getGoogleEmbedSrc(p: AddressParts & { lat?: unknown; lng?: unknown }): string {
  const c = getCoords(p);
  if (c) return `https://maps.google.com/maps?q=${c.lat},${c.lng}&z=16&output=embed`;
  return `https://maps.google.com/maps?q=${encodeURIComponent(buildMapQuery(p) || 'Ciudad de México')}&z=16&output=embed`;
}

/** Geocodificación con Nominatim: consulta estructurada → texto libre → solo C.P. */
export async function geocodeAddress(p: AddressParts): Promise<{ lat: number; lng: number } | null> {
  const base = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=mx&accept-language=es';
  const run = async (qs: string) => {
    const res = await fetch(`${base}&${qs}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
    return null;
  };

  const street = [clean(p.street_number), clean(p.street).replace(/^(Av\.|Avenida)\s*/i, 'Avenida ')]
    .filter(Boolean)
    .join(' ');
  const structured = new URLSearchParams();
  if (street) structured.set('street', street);
  if (clean(p.city)) structured.set('city', clean(p.city));
  if (clean(p.state)) structured.set('state', clean(p.state));
  if (clean(p.postal_code)) structured.set('postalcode', clean(p.postal_code));
  structured.set('country', 'México');

  const attempts: string[] = [];
  if (street) attempts.push(structured.toString());
  const free = buildMapQuery(p);
  if (free) attempts.push(`q=${encodeURIComponent(free)}`);
  if (clean(p.postal_code)) {
    attempts.push(`q=${encodeURIComponent(`${clean(p.postal_code)}, ${clean(p.city)}, México`)}`);
  }

  for (const qs of attempts) {
    const found = await run(qs);
    if (found) return found;
  }
  return null;
}

// ---------- ID corto ----------
export const SHORT_CODE_REGEX = /^ARL-\d+$/i;
export const isShortCode = (v: string) => SHORT_CODE_REGEX.test(v);
export const propertyPath = (p: { id: string; short_code?: string | null }) =>
  `/properties/${p.short_code || p.id}`;
export const propertyUrl = (p: { id: string; short_code?: string | null }) =>
  `${SITE_URL}${propertyPath(p)}`;

// ---------- Imágenes ----------
export function pickMainImage(images?: any[] | null): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const main = images.find((i) => i?.is_main) || images[0];
  if (typeof main === 'string') return main;
  return main?.image_url || main?.url || main?.secure_url || main?.src || null;
}

// ---------- Espacios adicionales (Dimensiones y Distribución) ----------
// Para agregar más opciones basta con añadirlas a esta lista.
export const EXTRA_SPACES = [
  'Bodega',
  'Terraza',
  'Balcón',
  'Área de lavado',
  'Cuarto de servicio',
  'Jardín',
  'Roof garden',
  'Estudio',
  'Vestidor',
  'Cuarto de TV',
] as const;
