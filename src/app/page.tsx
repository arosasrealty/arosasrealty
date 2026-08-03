'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const PropertyMap = dynamic(() => import('@/components/Map'), { ssr: false });

/**
 * Extrae la URL de Cloudinary/Imagen desde la tabla relacionada `property_images`
 */
function extractPrimaryImage(item: any): string | null {
  if (!item) return null;

  // 1. Revisa si vienen registros en la tabla relacionada property_images
  if (Array.isArray(item.property_images) && item.property_images.length > 0) {
    // Busca en las columnas habituales de la tabla relacionada (url, image_url, src, etc.)
    const imgObj = item.property_images[0];
    if (typeof imgObj === 'string') return imgObj;
    
    return imgObj.url || imgObj.image_url || imgObj.secure_url || imgObj.src || null;
  }

  // Fallback por si alguna propiedad antigua tuviera la URL como string directo
  if (typeof item.images === 'string' && item.images.startsWith('http')) {
    return item.images;
  }

  return null;
}

export default function HomePage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchProps() {
      try {
        // Usamos el nombre explicito de la clave foranea que exige Supabase
        const { data, error } = await supabase
          .from('properties')
          .select('*, property_images!property_images_property_id_fkey(*)');

        if (error) {
          console.error('Error al consultar Supabase:', error);
          return;
        }

        if (data && data.length > 0) {
          const formatted = data.map((item: any, idx: number) => {
            const baseLat = item.latitude ? parseFloat(item.latitude) : 19.42 + (idx * 0.012);
            const baseLng = item.longitude ? parseFloat(item.longitude) : -99.16 - (idx * 0.015);
            
            // Extraemos la URL de Cloudinary de la primera imagen de la lista
            let primaryImage: string | null = null;
            const imagesList = item.property_images;

            if (Array.isArray(imagesList) && imagesList.length > 0) {
              const firstImg = imagesList[0];
              primaryImage = typeof firstImg === 'string' 
                ? firstImg 
                : (firstImg.url || firstImg.image_url || firstImg.secure_url || firstImg.src || null);
            }

            return {
              ...item,
              primaryImage,
              lat: baseLat,
              lng: baseLng
            };
          });

          setProperties(formatted);
        }
      } catch (e) {
        console.error('Error en fetchProps:', e);
      }
    }
    fetchProps();
  }, []);
  
  const landingProperties = properties
    .filter((p) => p.show_on_landing === true || p.show_on_landing === 'true' || p.show_on_landing === 1)
    .filter((p) =>
      (p.title || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (p.zone || '').toLowerCase().includes(searchFilter.toLowerCase())
    );

  const maxIndex = Math.max(0, landingProperties.length - 3);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  return (
    <main className="w-full bg-slate-50">
      
      {/* Hero Principal */}
      <section className="relative w-full min-h-[580px] lg:min-h-[640px] flex items-center justify-center overflow-hidden bg-slate-900">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=85&w=2000')`
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/60 to-slate-950/30" />

        <div className="relative max-w-7xl mx-auto px-6 py-20 w-full text-white z-10">
          <div className="max-w-2xl space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              No buscamos propiedades, <br />
              <span className="font-serif italic font-normal text-[#C5A059]">
                perfilamos inversiones.
              </span>
            </h1>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-normal">
              Especialistas en perfilar clientes potenciales. No gestionamos visitas, gestionamos cierres bajo tus condiciones y necesidades.
            </p>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light">
              Evita el "turismo inmobiliario". En Alejandro Rosas López Bienes Raíces, conectamos propietarios serios con compradores validados mediante un análisis técnico y financiero previo.
            </p>

            <div className="pt-4 flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full ring-2 ring-white/20 bg-slate-800 text-[10px] font-black text-amber-400">
                  AR
                </span>
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full ring-2 ring-white/20 bg-blue-600 text-[10px] font-black text-white">
                  10+
                </span>
              </div>
              <span className="text-xs font-medium text-slate-300 tracking-wide">
                Años de experiencia filtrando el mercado en México.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de Propiedades */}
      <section id="catalogo" className="max-w-7xl mx-auto px-6 py-14 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              Catálogo de Propiedades
            </h2>
            <p className="text-slate-500 text-xs font-medium mt-1">
              Explora nuestro catálogo exclusivo de inmuebles disponibles
            </p>
          </div>

          <button
            onClick={() => setShowMap(!showMap)}
            className="text-xs font-bold bg-white border border-slate-300 hover:border-slate-400 px-4 py-2.5 rounded-xl text-slate-700 transition shadow-sm self-start sm:self-auto flex items-center gap-2"
          >
            <span>🗺️</span>
            <span>{showMap ? 'Ocultar Mapa' : 'Desplegar Mapa Interactivo'}</span>
          </button>
        </div>

        {showMap && (
          <div className="space-y-2">
            <PropertyMap properties={landingProperties} />
          </div>
        )}

        {/* Carrusel */}
        <div className="relative group/carousel">
          {landingProperties.length > 3 && (
            <button
              onClick={prevSlide}
              className="absolute -left-5 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-white text-slate-800 w-11 h-11 rounded-full shadow-xl border border-slate-200 transition backdrop-blur-sm flex items-center justify-center hover:scale-110"
              aria-label="Anterior"
            >
              ❮
            </button>
          )}

          <div className="overflow-hidden rounded-2xl p-1">
            <div
              className="flex transition-transform duration-500 ease-out gap-6"
              style={{
                transform: `translateX(-${currentIndex * (100 / 3 + 1.1)}%)`
              }}
            >
              {landingProperties.map((prop) => (
                <a
                  key={prop.id}
                  href={`/properties/${prop.id}`}
                  className="w-full md:w-[calc(33.333%-16px)] shrink-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
                >
                  {/* Foto de Portada desde Cloudinary */}
                  <div className="relative h-72 w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                    {prop.primaryImage ? (
                      <img
                        src={prop.primaryImage}
                        alt={prop.title || 'Inmueble'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                        <svg className="w-12 h-12 mb-2 stroke-current opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H7" />
                        </svg>
                        <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                          Sin Fotografía
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Detalle Informativo */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                        {prop.type || 'VENTA'} {prop.property_type ? `| ${prop.property_type}` : ''}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition line-clamp-1">
                        {prop.title}
                      </h3>
                      <p className="text-slate-400 text-[11px] font-semibold tracking-wider uppercase line-clamp-1">
                        {prop.address || prop.zone || 'CIUDAD DE MÉXICO'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xl font-black text-slate-900">
                        ${Number(prop.price || 0).toLocaleString('es-MX')}{' '}
                        {prop.type?.toLowerCase() === 'renta' && <span className="text-xs font-normal text-slate-500">/ mes</span>}
                      </p>

                      {prop.tag && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded">
                          {prop.tag}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {landingProperties.length > 3 && (
            <button
              onClick={nextSlide}
              className="absolute -right-5 top-1/2 -translate-y-1/2 z-30 bg-white/95 hover:bg-white text-slate-800 w-11 h-11 rounded-full shadow-xl border border-slate-200 transition backdrop-blur-sm flex items-center justify-center hover:scale-110"
              aria-label="Siguiente"
            >
              ❯
            </button>
          )}
        </div>
      </section>

    </main>
  );
}