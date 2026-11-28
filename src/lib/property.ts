// src/lib/property.ts
// Utilidades compartidas: domicilio atomizado, coordenadas, mapas, ID corto e imágenes.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://arosasrealty-sigma.vercel.app';

export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '525544857098'; // WhatsApp Business de Arosas Realty

export interface AddressParts {
  street?: string | null;          // Calle (sin número)
  street_number?: string | null;   // Número exterior
  interior_number?: string | null; // Número interior
  neighborhood?: string | null;    // Colonia
  city?: string | null;            // Alcaldía / Municipio
  state?: string | null;           // Estado
  postal_code?: string | null;     // C.P.
}

const clean = (v?: string | number | null): string => (v ?? '').toString().trim();

const normalize = (v: string): string =>
  v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

// ---------- Estados ----------
export const MX_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua',
  'Ciudad de México', 'Coahuila', 'Colima', 'Durango', 'Estado de México', 'Guanajuato', 'Guerrero',
  'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro',
  'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
  'Yucatán', 'Zacatecas',
];

const STATE_ALIASES: Record<string, string> = {
  cdmx: 'Ciudad de México',
  df: 'Ciudad de México',
  'distrito federal': 'Ciudad de México',
  'mexico city': 'Ciudad de México',
  'ciudad de mexico': 'Ciudad de México',
  edomex: 'Estado de México',
  'edo de mexico': 'Estado de México',
  'edo mex': 'Estado de México',
  'estado de mexico': 'Estado de México',
  'coahuila de zaragoza': 'Coahuila',
  'michoacan de ocampo': 'Michoacán',
  'veracruz de ignacio de la llave': 'Veracruz',
};

/** Devuelve el nombre oficial del estado ("CDMX" -> "Ciudad de México"); si no lo reconoce, regresa el texto tal cual */
export function normalizeState(v?: string | null): string {
  const raw = clean(v);
  if (!raw) return '';
  const n = normalize(raw);
  if (STATE_ALIASES[n]) return STATE_ALIASES[n];
  const found = MX_STATES.find((s) => normalize(s) === n);
  return found || raw;
}

const isKnownState = (v: string) => MX_STATES.includes(normalizeState(v));
export const isCdmx = (state?: string | null) => normalizeState(state) === 'Ciudad de México';

/**
 * Acomoda Alcaldía/Municipio y Estado. Corrige datos viejos o capturados al revés
 * (ej. city="CDMX", state="Benito Juárez" -> city="Benito Juárez", state="Ciudad de México").
 */
export function resolveLocation(cityRaw?: string | null, stateRaw?: string | null): { city: string; state: string } {
  let city = clean(cityRaw);
  const stateIn = clean(stateRaw);
  if (!isKnownState(stateIn) && isKnownState(city)) {
    return { city: stateIn, state: normalizeState(city) };
  }
  const state = normalizeState(stateIn);
  if (city && isCdmx(state) && normalizeState(city) === state) city = ''; // "CDMX" no es una alcaldía
  return { city, state };
}

// ---------- Calle ----------
const STREET_TYPES: [RegExp, string][] = [
  [/^av\.?\s+/i, 'Avenida '],
  [/^avenida\s+/i, 'Avenida '],
  [/^blvd\.?\s+/i, 'Boulevard '],
  [/^calz\.?\s+/i, 'Calzada '],
  [/^cda\.?\s+/i, 'Cerrada '],
  [/^priv\.?\s+/i, 'Privada '],
  [/^prol\.?\s+/i, 'Prolongación '],
];
const expandStreet = (s: string) => {
  for (const [re, rep] of STREET_TYPES) if (re.test(s)) return s.replace(re, rep);
  return s;
};
const bareStreet = (s: string) =>
  s.replace(/^(av\.?|avenida|blvd\.?|boulevard|calz\.?|calzada|calle|cda\.?|cerrada|priv\.?|privada|prol\.?|prolongaci[oó]n)\s+/i, '');

const stripPrefix = (v: string, re: RegExp) => v.replace(re, '').trim();

/**
 * Domicilio completo para MOSTRAR, COPIAR y enviar por WhatsApp:
 * "Av. Popocatépetl, No. 415, Col. Santa Cruz Atoyac, Alcaldía Benito Juárez, C.P. 03310, Ciudad de México"
 */
export function buildFullAddress(p: AddressParts): string {
  const ext = clean(p.street_number);
  let street = clean(p.street);
  // Datos viejos: la calle ya trae el número ("Av. Popocatépetl 415") y además se capturó el exterior
  if (ext) {
    const escaped = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    street = street.replace(new RegExp(`[\\s,]*(?:no\\.?|n[uú]m\\.?|#)?\\s*${escaped}$`, 'i'), '').trim();
  }
  const int = clean(p.interior_number);
  const colonia = stripPrefix(clean(p.neighborhood), /^col(onia)?\.?\s+/i);
  const { city: cityRaw, state } = resolveLocation(p.city, p.state);
  const city = stripPrefix(cityRaw, /^(alcald[ií]a|municipio|del\.?|delegaci[oó]n)\s+/i);
  const cp = clean(p.postal_code);

  const parts: string[] = [];
  const streetN = normalize(street);
  if (street) parts.push(street);
  if (ext) parts.push(`No. ${ext}`);
  if (int) parts.push(`Int. ${int}`);
  // Si la colonia o la alcaldía ya vienen escritas dentro de la calle, no se repiten
  if (colonia && !streetN.includes(normalize(colonia))) parts.push(`Col. ${colonia}`);
  if (city && normalize(city) !== normalize(colonia) && !streetN.includes(normalize(city))) {
    parts.push(`${state ? (isCdmx(state) ? 'Alcaldía ' : 'Municipio ') : ''}${city}`);
  }
  if (cp) parts.push(`C.P. ${cp}`);
  if (state) parts.push(state);
  return parts.join(', ');
}

/** Línea que consumen los mapas / geocodificador: "Avenida Popocatépetl 415, Santa Cruz Atoyac, Benito Juárez, 03310, Ciudad de México, México" */
export function buildMapQuery(p: AddressParts, opts: { bare?: boolean; colonia?: boolean; cp?: boolean; number?: boolean } = {}): string {
  const { bare = false, colonia = true, cp = true, number = true } = opts;
  const street = clean(p.street);
  const base = bare ? bareStreet(street) : expandStreet(street);
  const line = [base, number ? clean(p.street_number) : ''].filter(Boolean).join(' ');
  const loc = resolveLocation(p.city, p.state);
  const parts: string[] = [];
  const push = (v: string) => { if (v) parts.push(v); };
  push(line);
  if (colonia) push(stripPrefix(clean(p.neighborhood), /^col(onia)?\.?\s+/i));
  push(stripPrefix(loc.city, /^(alcald[ií]a|municipio)\s+/i));
  if (cp) push(clean(p.postal_code));
  push(loc.state);
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

// ---------- Geocodificación ----------
export type GeoPrecision = 'exact' | 'street' | 'area';
export interface GeoResult { lat: number; lng: number; precision: GeoPrecision; }

/**
 * Nominatim (OpenStreetMap). Prueba de lo más específico a lo más general y
 * DESCARTA resultados de otro estado (evita calles homónimas de Querétaro, etc.).
 */
export async function geocodeAddress(p: AddressParts): Promise<GeoResult | null> {
  const loc = resolveLocation(p.city, p.state);
  const expectedState = normalize(loc.state);
  const cp = clean(p.postal_code);

  const base =
    'https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=mx&accept-language=es';
  const free = (q: string) => `q=${encodeURIComponent(q)}`;

  const attempts: string[] = [];
  const addFree = (q: string) => {
    const qs = free(q);
    if (q && !attempts.includes(qs)) attempts.push(qs);
  };

  if (clean(p.street)) {
    addFree(buildMapQuery(p));                       // Avenida Popocatépetl 415, Col, Alcaldía, CP, Estado, México
    addFree(buildMapQuery(p, { bare: true }));       // Popocatépetl 415, Col, Alcaldía, CP, Estado, México
    addFree(buildMapQuery(p, { colonia: false, cp: false })); // sin colonia ni C.P.

    const structured = new URLSearchParams();
    structured.set('street', [expandStreet(clean(p.street)), clean(p.street_number)].filter(Boolean).join(' '));
    if (cp) structured.set('postalcode', cp);
    if (loc.state) structured.set('state', loc.state);
    structured.set('country', 'México');
    attempts.push(structured.toString());

    addFree(buildMapQuery(p, { number: false, cp: false })); // la calle, sin número
  }
  if (cp) addFree([cp, loc.state, 'México'].filter(Boolean).join(', ')); // aproximado por C.P.

  for (let i = 0; i < attempts.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1100)); // política de uso de Nominatim: 1 consulta/seg
    const res = await fetch(`${base}&${attempts[i]}`);
    const data = await res.json();
    if (!Array.isArray(data)) continue;

    const valid = data.filter((r: any) => !expectedState || normalize(r?.address?.state || '') === expectedState);
    if (valid.length === 0) continue;

    const hit = valid.find((r: any) => cp && r?.address?.postcode === cp) || valid[0];
    const precision: GeoPrecision = hit.address?.house_number ? 'exact' : hit.address?.road ? 'street' : 'area';
    return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), precision };
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

/** Lee la cantidad de cada espacio adicional (jsonb space_counts). Solo regresa los > 0. */
export function parseSpaceCounts(p: { space_counts?: unknown; extra_spaces?: unknown }): Record<string, number> {
  const out: Record<string, number> = {};
  const raw = p.space_counts;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      const n = Math.floor(Number(v));
      if (Number.isFinite(n) && n > 0) out[k] = n;
    }
  }
  // Compatibilidad: si solo existía la lista anterior (sí/no), cada espacio cuenta como 1
  if (Object.keys(out).length === 0 && Array.isArray(p.extra_spaces)) {
    for (const k of p.extra_spaces as string[]) out[k] = 1;
  }
  return out;
}

/** [nombre, cantidad] en el orden de EXTRA_SPACES */
export function getSpaceEntries(p: { space_counts?: unknown; extra_spaces?: unknown }): [string, number][] {
  const counts = parseSpaceCounts(p);
  const ordered = EXTRA_SPACES.filter((s) => counts[s]).map((s) => [s, counts[s]] as [string, number]);
  const others = Object.keys(counts).filter((k) => !(EXTRA_SPACES as readonly string[]).includes(k)).map((k) => [k, counts[k]] as [string, number]);
  return [...ordered, ...others];
}

/**
 * Mensaje de WhatsApp. Si el título ya menciona la calle o la colonia
 * (ej. "Departamento en renta en Av. Popocatépetl"), no se vuelve a escribir el domicilio:
 * la liga a la ficha ya lo trae.
 */
export function buildWhatsAppMessage(p: AddressParts & { id: string; title: string; short_code?: string | null }): string {
  const address = buildFullAddress(p);
  const titleN = normalize(clean(p.title));
  const streetKey = normalize(bareStreet(clean(p.street)));
  const coloniaKey = normalize(stripPrefix(clean(p.neighborhood), /^col(onia)?\.?\s+/i));
  const titleHasLocation =
    (streetKey.length > 3 && titleN.includes(streetKey)) ||
    (coloniaKey.length > 3 && titleN.includes(coloniaKey));

  const code = p.short_code || p.id;
  const where = address && !titleHasLocation ? ` ubicada en ${address}` : '';
  return (
    `Hola, me interesa la propiedad "${clean(p.title)}"${where} ` +
    `con ID ${code}: ${propertyUrl(p as { id: string; short_code?: string | null })}\n` +
    `¿Podría darme más información?`
  );
}
