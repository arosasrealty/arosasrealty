'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Carga dinámica del mapa (sin SSR)
const PropertyMap = dynamic(() => import('@/components/Map'), { ssr: false });

// Coordenadas de respaldo por defecto
const DEFAULT_COORDS = [
  { lat: 19.4326, lng: -99.1913 }, // Polanco
  { lat: 19.4270, lng: -99.1620 }, // Cuauhtémoc
  { lat: 19.3980, lng: -99.2450 }, // Bosques
];

// Función utilitaria para calcular la edad de publicación (Formato amigable)
function getRelativeTime(dateString?: string): string {
  if (!dateString) return 'Reciente';

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Publicado hoy';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return 'Publicado hace un momento';

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `Hace ${diffInHours} h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Publicado ayer';
  if (diffInDays < 7) return `Hace ${diffInDays} días`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `Hace ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`;

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `Hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`;

  const diffInYears = Math.floor(diffInDays / 365);
  return `Hace ${diffInYears} ${diffInYears === 1 ? 'año' : 'años'}`;
}

// Interfaz adaptada con el campo created_at
interface CatalogueProperty {
  id: string;
  title: string;
  type: string; // 'venta' | 'renta'
  category?: string;
  price: number;
  currency?: string;
  neighborhood?: string;
  city?: string;
  address?: string;
  lat: number;
  lng: number;
  status?: string;
  created_at?: string;
}

export default function CataloguePage() {
  const [properties, setProperties] = useState<CatalogueProperty[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<CatalogueProperty[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados de Filtros, Ordenamiento y UI
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('recientes'); // 'recientes' | 'precio-asc' | 'precio-desc'
  const [showMap, setShowMap] = useState<boolean>(false);

  // Carga de la BD de Supabase ordenada por fecha de creación (descendente)
  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('status', 'disponible')
          .order('created_at', { ascending: false }); // Carga inicial por más reciente

        if (!error && data && data.length > 0) {
          const formatted: CatalogueProperty[] = data.map((item: any, idx: number) => ({
            ...item,
            address: item.address || [item.neighborhood, item.city || 'CDMX'].filter(Boolean).join(', '),
            lat: typeof item.lat === 'number' ? item.lat : DEFAULT_COORDS[idx % DEFAULT_COORDS.length].lat,
            lng: typeof item.lng === 'number' ? item.lng : DEFAULT_COORDS[idx % DEFAULT_COORDS.length].lng,
          }));

          setProperties(formatted);
          setFilteredProperties(formatted);
        }
      } catch (e) {
        console.error('Error al cargar propiedades del catálogo:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  // Filtrado y Ordenamiento Reactivo
  useEffect(() => {
    let result = [...properties];

    // 1. Filtrar por Tipo (Venta / Renta)
    if (filterType !== 'todos') {
      result = result.filter(
        (p) => p.type?.toLowerCase() === filterType.toLowerCase()
      );
    }

    // 2. Filtrar por Término de búsqueda
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(term) ||
          p.address?.toLowerCase().includes(term) ||
          p.neighborhood?.toLowerCase().includes(term)
      );
    }

    // 3. Aplicar Ordenamiento
    if (sortBy === 'recientes') {
      result.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'precio-asc') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'precio-desc') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    setFilteredProperties(result);
  }, [searchTerm, filterType, sortBy, properties]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      <main className="max-w-7xl mx-auto px-6 pt-10 space-y-8">
        
        {/* --- CABECERA Y BOTÓN DE MAPA --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Catálogo de Propiedades
            </h1>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Explora nuestro catálogo exclusivo de inmuebles disponibles
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="self-start sm:self-auto bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition flex items-center gap-2"
          >
            {showMap ? '🙈 Ocultar Mapa' : '🗺️ Desplegar Mapa Interactivo'}
          </button>
        </div>

        {/* --- MAPA INTERACTIVO DINÁMICO --- */}
        {showMap && (
          <div className="space-y-2">
            <PropertyMap properties={filteredProperties as any} />
          </div>
        )}

        {/* --- BARRA DE FILTROS Y ORDENAMIENTO --- */}
        <div className="flex flex-col lg:flex-row gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Buscador de texto */}
          <input
            type="text"
            placeholder="Buscar por título, colonia o zona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
          />

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            {/* Filtro Operación (Todos / Venta / Renta) */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {['todos', 'venta', 'renta'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`text-xs font-extrabold capitalize px-3.5 py-1.5 rounded-lg transition ${
                    filterType === type
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Selector de Ordenamiento Profesional */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-100 border border-transparent text-xs text-slate-700 font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:bg-white focus:border-slate-300 transition cursor-pointer"
            >
              <option value="recientes">✨ Más Recientes Primero</option>
              <option value="precio-asc">💵 Precio: Menor a Mayor</option>
              <option value="precio-desc">💎 Precio: Mayor a Menor</option>
            </select>
          </div>
        </div>

        {/* --- LISTADO DE TARJETAS --- */}
        {loading ? (
          <div className="text-center py-20 text-xs font-bold text-slate-400">
            Cargando catálogo de propiedades...
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 text-xs font-bold text-slate-400">
            No se encontraron propiedades que coincidan con la búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((prop) => {
              const isVenta = prop.type?.toLowerCase() === 'venta';
              const publicationAge = getRelativeTime(prop.created_at);

              return (
                <div
                  key={prop.id}
                  className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between h-[200px]"
                >
                  {/* Fila Superior: Badge + Edad de Publicación + Enlace Ficha */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full ${
                          isVenta
                            ? 'bg-emerald-100/80 text-emerald-700'
                            : 'bg-blue-100/80 text-blue-700'
                        }`}
                      >
                        {prop.type || 'VENTA'}
                      </span>
                    </div>

                    <Link
                      href={`/properties/${prop.id}`}
                      className="text-xs font-bold text-slate-400 hover:text-slate-900 transition flex items-center gap-1"
                    >
                      Ver Ficha <span className="text-sm">→</span>
                    </Link>
                  </div>

                  {/* Título y Ubicación */}
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-900 line-clamp-1">
                      {prop.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-400 line-clamp-1">
                      {prop.address || 'Ubicación no especificada'}
                    </p>
                  </div>

                  {/* Fila Inferior: Precio y Fecha Relativa */}
                  <div className="flex items-end justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-black text-slate-900">
                        ${prop.price ? prop.price.toLocaleString('es-MX') : '0'}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {prop.currency || 'MXN'}
                      </span>
                    </div>

                    {/* Badge discreto de antigüedad */}
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                      🕒 {publicationAge}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}