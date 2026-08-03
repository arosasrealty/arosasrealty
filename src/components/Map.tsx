'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

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

interface Property {
  id: string;
  title: string;
  price: number;
  type: string;
  lat: number;
  lng: number;
  address: string;
}

export default function PropertyMap({ properties }: { properties: Property[] }) {
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

  // Centro por defecto: CDMX (Reforma / Polanco)
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
        
        {properties.map((prop) => (
          <Marker key={prop.id} position={[prop.lat, prop.lng]} icon={customIcon}>
            <Popup>
              <div className="p-1">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {prop.type}
                </span>
                <h4 className="font-bold text-sm mt-1 text-gray-900">{prop.title}</h4>
                <p className="text-xs text-gray-500">{prop.address}</p>
                <p className="text-sm font-extrabold text-emerald-600 mt-1">
                  ${prop.price?.toLocaleString('es-MX')} MXN
                </p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}