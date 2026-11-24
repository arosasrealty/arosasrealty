'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getCoords } from '@/lib/property';

// Importar estilos de Leaflet directamente en el componente
import 'leaflet/dist/leaflet.css';

// Fix para los iconos de marcadores en Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapProperty {
  id: string;
  short_code?: string | null;
  title: string;
  price: number;
  type: string;
  lat?: number | null;
  lng?: number | null;
  address?: string; // domicilio completo ya armado con buildFullAddress()
}

// Ajusta el zoom para que se vean todos los pines
function FitToMarkers({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function PropertyMap({ properties }: { properties: MapProperty[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div style={{ height: '400px', width: '100%' }} className="bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
        Cargando mapa...
      </div>
    );
  }

  // Solo propiedades con coordenadas reales (ya no se inventan posiciones)
  const located = properties
    .map((p) => ({ prop: p, coords: getCoords(p) }))
    .filter((x): x is { prop: MapProperty; coords: { lat: number; lng: number } } => x.coords !== null);

  const points: [number, number][] = located.map((x) => [x.coords.lat, x.coords.lng]);

  // Centro por defecto: CDMX
  const center: [number, number] = [19.4270, -99.1620];

  return (
    <div style={{ height: '400px', width: '100%', position: 'relative' }} className="rounded-xl overflow-hidden shadow-md border border-gray-200">
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToMarkers points={points} />

        {located.map(({ prop, coords }) => (
          <Marker key={prop.id} position={[coords.lat, coords.lng]} icon={customIcon}>
            <Popup>
              <div className="p-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {prop.type}
                </span>
                {prop.short_code && (
                  <span className="text-[10px] font-bold ml-1 text-gray-500">{prop.short_code}</span>
                )}
                <h4 className="font-bold text-sm mt-1 text-gray-900">{prop.title}</h4>
                {prop.address && <p className="text-xs text-gray-500">{prop.address}</p>}
                <p className="text-sm font-extrabold text-emerald-600 mt-1">
                  ${prop.price?.toLocaleString('es-MX')} MXN
                </p>
                <a
                  href={`/properties/${prop.short_code || prop.id}`}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Ver ficha →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
