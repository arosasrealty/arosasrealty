// src/lib/exportProperties.ts
// Exporta todas las propiedades registradas (todos sus campos) a un archivo .xlsx
import { buildXlsx, type XlsxCell } from '@/lib/xlsxWriter';
import {
  EXTRA_SPACES,
  buildFullAddress,
  getCoords,
  parseSpaceCounts,
  propertyUrl,
  resolveLocation,
} from '@/lib/property';

type Cell = XlsxCell;

interface ImageRow {
  property_id: string;
  image_url: string;
  is_main?: boolean | null;
}

const head = (value: string): Cell => ({ header: value });

const txt = (v: unknown): Cell => {
  const s = v === null || v === undefined ? '' : String(v);
  return s === '' ? null : s;
};

const num = (v: unknown, format?: string): Cell => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? (format ? { value: n, format: 'money' as const } : n) : null;
};

const list = (v: unknown): Cell => (Array.isArray(v) && v.length ? v.join(', ') : null);

export async function exportPropertiesToExcel(properties: any[], images: ImageRow[] = []): Promise<void> {
  const imagesBy = new Map<string, ImageRow[]>();
  images.forEach((img) => {
    if (!img.property_id) return;
    const arr = imagesBy.get(img.property_id) || [];
    arr.push(img);
    imagesBy.set(img.property_id, arr);
  });

  // [encabezado, ancho, función que obtiene el valor]
  const cols: [string, number, (p: any, imgs: ImageRow[]) => Cell][] = [
    ['ID corto', 11, (p) => txt(p.short_code)],
    ['ID (UUID)', 38, (p) => txt(p.id)],
    ['Título', 40, (p) => txt(p.title)],
    ['Tipo', 10, (p) => txt(p.type)],
    ['Categoría', 14, (p) => txt(p.category)],
    ['Estatus', 13, (p) => txt(p.status)],
    ['Precio', 14, (p) => num(p.price, '#,##0.00')],
    ['Moneda', 9, (p) => txt(p.currency)],
    ['Recámaras', 11, (p) => num(p.bedrooms)],
    ['Baños', 8, (p) => num(p.bathrooms)],
    ['Estacionamientos', 15, (p) => num(p.parking_spaces)],
    ['Niveles', 9, (p) => num(p.levels)],
    ['Construcción (m²)', 16, (p) => num(p.area_sqm)],
    ['Terreno (m²)', 13, (p) => num(p.land_area_sqm)],
    // Una columna por cada espacio adicional (cantidad)
    ...EXTRA_SPACES.map((space): [string, number, (p: any) => Cell] => [
      space,
      Math.max(10, space.length + 2),
      (p) => num(parseSpaceCounts(p)[space]),
    ]),
    ['Calle', 28, (p) => txt(p.street)],
    ['Núm. exterior', 13, (p) => txt(p.street_number)],
    ['Núm. interior', 13, (p) => txt(p.interior_number)],
    ['Colonia', 24, (p) => txt(p.neighborhood)],
    ['Alcaldía / Municipio', 22, (p) => txt(resolveLocation(p.city, p.state).city)],
    ['Estado', 18, (p) => txt(resolveLocation(p.city, p.state).state)],
    ['C.P.', 8, (p) => txt(p.postal_code)],
    ['Domicilio completo', 60, (p) => txt(buildFullAddress(p))],
    ['Dirección (campo anterior)', 30, (p) => txt(p.address)],
    ['Latitud', 12, (p) => num(p.lat)],
    ['Longitud', 12, (p) => num(p.lng)],
    ['Ver en Google Maps', 40, (p) => {
      const c = getCoords(p);
      return c ? `https://www.google.com/maps?q=${c.lat},${c.lng}` : null;
    }],
    ['Amenidades', 45, (p) => list(p.amenities)],
    ['Formas de pago', 30, (p) => list(p.payment_methods)],
    ['Descripción corta', 40, (p) => txt(p.short_description)],
    ['Descripción', 70, (p) => txt(p.description)],
    ['Mostrar en landing', 12, (p) => (p.show_on_landing ? 'Sí' : 'No')],
    ['Publicada por', 24, (p) => txt(p.publishing_agent)],
    ['Fecha de creación', 18, (p) => {
      const d = p.created_at ? new Date(p.created_at) : null;
      return d && !isNaN(d.getTime()) ? { value: d, format: 'datetime' as const } : null;
    }],
    ['Enlace a la ficha', 52, (p) => txt(propertyUrl(p))],
    ['Total de fotos', 12, (_p, imgs) => imgs.length],
    ['Foto principal (URL)', 50, (_p, imgs) => txt((imgs.find((i) => i.is_main) || imgs[0])?.image_url)],
    ['Todas las fotos (URLs)', 60, (_p, imgs) => (imgs.length ? imgs.map((i) => i.image_url).join('\n') : null)],
  ];

  const sheetData: Cell[][] = [cols.map(([h]) => head(h))];
  properties.forEach((p) => {
    const imgs = imagesBy.get(p.id) || [];
    sheetData.push(cols.map(([, , get]) => get(p, imgs)));
  });

  const blob = buildXlsx('Propiedades', cols.map(([, width]) => width), sheetData);

  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `propiedades-arosas-realty-${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
