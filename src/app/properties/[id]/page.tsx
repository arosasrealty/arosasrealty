'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { jsPDF } from 'jspdf';

interface Property {
  id: string;
  title: string;
  description: string;
  short_description?: string;
  type: string;
  category: string;
  price: number;
  currency?: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  status: string;
  lat?: number | null;
  lng?: number | null;
  amenities?: string[] | string;
  parking_spaces: number;
  levels: number;
  land_area_sqm: number;
  payment_methods?: string[] | string;
  publishing_agent?: string;
  created_at?: string;
}

interface PropertyImage {
  id: string;
  image_url: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

// Función auxiliar para formatear la antigüedad de la publicación
function getFormattedPublicationDate(dateString?: string): { relative: string; exact: string } {
  if (!dateString) return { relative: 'Publicación reciente', exact: '' };

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const exact = date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  if (diffInSeconds < 60) return { relative: 'Publicado hoy', exact };
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return { relative: 'Publicado hace un momento', exact };
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return { relative: `Hace ${diffInHours} h`, exact };
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return { relative: 'Publicado ayer', exact };
  if (diffInDays < 7) return { relative: `Hace ${diffInDays} días`, exact };
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return { relative: `Hace ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`, exact };
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return { relative: `Hace ${diffInMonths} ${diffInMonths === 1 ? 'mes' : 'meses'}`, exact };
  const diffInYears = Math.floor(diffInDays / 365);
  return { relative: `Hace ${diffInYears} ${diffInYears === 1 ? 'año' : 'años'}`, exact };
}

export default function PublicPropertyDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const propertyId = resolvedParams.id;
  const router = useRouter();

  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchPropertyData() {
      setLoading(true);

      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (propError || !propData) {
        router.push('/');
        return;
      }

      // Parser para amenidades
      let parsedAmenities: string[] = [];
      if (propData.amenities) {
        if (Array.isArray(propData.amenities)) {
          parsedAmenities = propData.amenities.map(String).map((s: string) => s.trim()).filter(Boolean);
        } else if (typeof propData.amenities === 'string') {
          const trimmed = propData.amenities.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              const jsonParsed = JSON.parse(trimmed);
              if (Array.isArray(jsonParsed)) {
                parsedAmenities = jsonParsed.map(String).map((s: string) => s.trim()).filter(Boolean);
              }
            } catch {
              parsedAmenities = trimmed.replace(/^\[|\]$/g, '').split(',').map((s: string) => s.replace(/["']/g, '').trim()).filter(Boolean);
            }
          } else {
            parsedAmenities = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }

      // Parser para métodos de pago
      let parsedPaymentMethods: string[] = [];
      if (propData.payment_methods) {
        if (Array.isArray(propData.payment_methods)) {
          parsedPaymentMethods = propData.payment_methods.map(String).map((s: string) => s.trim()).filter(Boolean);
        } else if (typeof propData.payment_methods === 'string') {
          try {
            const jsonParsed = JSON.parse(propData.payment_methods);
            if (Array.isArray(jsonParsed)) {
              parsedPaymentMethods = jsonParsed.map(String).map((s: string) => s.trim()).filter(Boolean);
            }
          } catch {
            parsedPaymentMethods = propData.payment_methods.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
        }
      }

      setProperty({
        ...propData,
        amenities: parsedAmenities,
        payment_methods: parsedPaymentMethods,
      });

      const { data: imgData } = await supabase
        .from('property_images')
        .select('id, image_url')
        .eq('property_id', propertyId);

      setImages(imgData || []);
      setLoading(false);
    }

    if (propertyId) {
      fetchPropertyData();
    }
  }, [propertyId, router]);

  // Temporizador para carrusel automático
  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  // Descarga de PDF Ejecutivo Minimalista
  const handleDownloadMinimalistPDF = async () => {
    if (!property) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    let cursorY = 18;

    // --- 1. CABECERA EJECUTIVA Y BRANDING ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('AROSAS REALTY', margin, cursorY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('FICHA TÉCNICA EJECUTIVA', pageWidth - margin, cursorY, { align: 'right' });

    cursorY += 4;
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.4);
    doc.line(margin, cursorY, pageWidth - margin, cursorY);
    cursorY += 7;

    // --- 2. TÍTULO Y CLASIFICACIÓN ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(37, 99, 235); // blue-600
    const metaBadge = `${(property.category || 'PROPIEDAD').toUpperCase()} • EN ${(property.type || 'VENTA').toUpperCase()} • ESTATUS: ${(property.status || 'DISPONIBLE').toUpperCase()}`;
    doc.text(metaBadge, margin, cursorY);
    cursorY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    const splitTitle = doc.splitTextToSize(property.title || 'Sin título', contentWidth);
    doc.text(splitTitle, margin, cursorY);
    cursorY += splitTitle.length * 5.5 + 2;

    // Ubicación / Domicilio Completo
    const fullAddress = [
      property.street,
      property.neighborhood,
      property.city,
      property.state,
      property.postal_code ? `C.P. ${property.postal_code}` : null
    ].filter(Boolean).join(', ');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    const addressText = `Ubicación: ${fullAddress || 'Ubicación no especificada'}`;
    const splitAddress = doc.splitTextToSize(addressText, contentWidth);
    doc.text(splitAddress, margin, cursorY);
    cursorY += splitAddress.length * 4.5 + 3;

    // Coordenadas GPS
    if (property.lat || property.lng) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Coordenadas GPS: Lat ${property.lat ?? 'N/A'}, Lng ${property.lng ?? 'N/A'}`, margin, cursorY);
      cursorY += 5;
    }

    // --- 3. BLOQUE COMERCIAL Y PRECIO ---
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, cursorY, contentWidth, 13, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PRECIO DE INVERSIÓN:', margin + 5, cursorY + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(15, 23, 42);
    const priceText = `$${property.price ? property.price.toLocaleString('es-MX') : '0'} ${property.currency || 'MXN'}`;
    doc.text(priceText, pageWidth - margin - 5, cursorY + 8.5, { align: 'right' });

    cursorY += 18;

    // --- 4. DIMENSIONES Y DISTRIBUCIÓN ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DIMENSIONES Y DISTRIBUCIÓN', margin, cursorY);
    cursorY += 4;

    const boxWidth = (contentWidth - 8) / 3;
    const boxHeight = 10;
    const features = [
      { label: 'Recamaras', value: `${property.bedrooms || 0}` },
      { label: 'Banos', value: `${property.bathrooms || 0}` },
      { label: 'Estacionamiento', value: `${property.parking_spaces || 0}` },
      { label: 'Niveles', value: `${property.levels || 1}` },
      { label: 'Construccion', value: `${property.area_sqm || 0} m²` },
      { label: 'Terreno', value: `${property.land_area_sqm || 0} m²` },
    ];

    features.forEach((feat, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const xPos = margin + col * (boxWidth + 4);
      const yPos = cursorY + row * (boxHeight + 3);

      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(xPos, yPos, boxWidth, boxHeight, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(feat.label, xPos + 4, yPos + 6.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(feat.value, xPos + boxWidth - 4, yPos + 6.5, { align: 'right' });
    });

    cursorY += boxHeight * 2 + 8;

    // --- 5. MÉTODOS DE ADQUISICIÓN Y LEYENDA CREDITICIA ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('MÉTODOS DE ADQUISICIÓN Y CRÉDITOS', margin, cursorY);
    cursorY += 4;

    const paymentMethodsArray = Array.isArray(property.payment_methods) ? property.payment_methods : [];
    const paymentText = paymentMethodsArray.length > 0 
      ? paymentMethodsArray.join(', ') 
      : (property.type === 'renta' ? 'Recursos Propios (Transferencia)' : 'Consultar opciones de crédito');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Opciones aceptadas: ${paymentText}`, margin + 2, cursorY);
    cursorY += 4.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(180, 83, 9); // amber-700
    const banjercitoNotice = 'NOTA: Aplican todas las instituciones financieras y créditos hipotecarios, EXCEPTO Banjército.';
    doc.text(banjercitoNotice, margin + 2, cursorY);
    cursorY += 7;

    // --- 6. AMENIDADES Y CARACTERÍSTICAS ---
    const amenitiesArray = Array.isArray(property.amenities) ? property.amenities : [];
    if (amenitiesArray.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('AMENIDADES Y CARACTERÍSTICAS', margin, cursorY);
      cursorY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      
      const formattedAmenities = amenitiesArray.map((a) => `• ${a}`).join('   ');
      const splitAmenities = doc.splitTextToSize(formattedAmenities, contentWidth);
      doc.text(splitAmenities, margin, cursorY);
      cursorY += splitAmenities.length * 4 + 4;
    }

    // --- 7. DESCRIPCIÓN DETALLADA ---
    const descToUse = property.description || property.short_description;
    if (descToUse) {
      if (cursorY > 210) {
        doc.addPage();
        cursorY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('DESCRIPCIÓN DE LA PROPIEDAD', margin, cursorY);
      cursorY += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const splitDescription = doc.splitTextToSize(descToUse, contentWidth);
      
      const maxLines = cursorY > 160 ? 6 : 12;
      const linesToDraw = splitDescription.slice(0, maxLines);
      doc.text(linesToDraw, margin, cursorY);
      cursorY += linesToDraw.length * 3.8 + 5;
    }

    // --- 8. VISTA PREVIA IMAGEN PRINCIPAL (PROPORCIONAL / ASPECT RATIO REAL) ---
    if (images.length > 0 && cursorY < 220) {
      try {
        const mainImgUrl = images[0].image_url;
        const imgResponse = await fetch(mainImgUrl);
        const blob = await imgResponse.blob();

        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const imgObj = new Image();
        imgObj.src = base64Data;
        await new Promise((resolve) => { imgObj.onload = resolve; });

        const originalWidth = imgObj.naturalWidth || 800;
        const originalHeight = imgObj.naturalHeight || 600;
        const aspectRatio = originalWidth / originalHeight;

        let renderWidth = contentWidth;
        let renderHeight = renderWidth / aspectRatio;

        const maxAllowedHeight = 55;
        if (renderHeight > maxAllowedHeight) {
          renderHeight = maxAllowedHeight;
          renderWidth = renderHeight * aspectRatio;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('VISTA PREVIA', margin, cursorY);
        cursorY += 3.5;

        const xOffset = margin + (contentWidth - renderWidth) / 2;
        doc.addImage(base64Data, 'JPEG', xOffset, cursorY, renderWidth, renderHeight);
      } catch {
        // Manejo silencioso en caso de fallos de red
      }
    }

    // --- 9. PIE DE PÁGINA ---
    const footerY = pageHeight - 12;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('AROSAS REALTY • Catálogo Inmobiliario Ejecutivo (arosasrealty.com.mx)', margin, footerY);

    const safeFileName = property.title ? property.title.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'propiedad';
    doc.save(`ficha_ejecutiva_${safeFileName}.pdf`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
        Cargando expediente de propiedad...
      </div>
    );
  }

  if (!property) return null;

  const currentMainImage = images.length > 0 ? images[activeImageIndex].image_url : null;
  
  const fullAddress = [property.street, property.neighborhood, property.city, property.state, property.postal_code]
    .filter(Boolean)
    .join(', ');

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Hola, me interesa la propiedad "${property.title}" ubicada en ${fullAddress || 'su catálogo'} con ID ${property.id}. ¿Podría darme más información?`)}`;
  
  const amenitiesArray = Array.isArray(property.amenities) ? property.amenities : [];
  const paymentMethodsArray = Array.isArray(property.payment_methods) ? property.payment_methods : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-16">
      {/* Barra superior */}
      <div className="max-w-5xl mx-auto px-6 pt-6 flex justify-between items-center">
        <Link
          href="/catalogue"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 transition flex items-center gap-1.5"
        >
          <span>←</span> Volver al catálogo
        </Link>
      </div>

      <main className="max-w-5xl mx-auto px-6 mt-6 space-y-8">
        {/* Cabecera Principal */}
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-black text-slate-900">{property.title}</h1>
          <p className="text-sm text-slate-500 font-medium">📍 {fullAddress || 'Ubicación no especificada'}</p>
        </div>

        {/* Galería de Fotos */}
        {currentMainImage ? (
          <div className="space-y-4">
            <div className="w-full h-[260px] sm:h-[340px] bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentMainImage}
                alt={property.title}
                className="w-full h-full object-cover bg-slate-950"
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      activeImageIndex === idx ? 'border-blue-600 ring-2 ring-blue-500/20' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.image_url} alt="Miniatura" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-56 bg-slate-100 rounded-3xl border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
            Sin imágenes registradas
          </div>
        )}

        {/* Grid Principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUMNA IZQUIERDA */}
          <div className="md:col-span-2 space-y-6">
            
            {/* 1. Información General */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                📝 Información General
              </h2>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Propiedad</span>
                  <p className="text-base font-extrabold text-slate-900">{property.title}</p>
                </div>

                {property.short_description && (
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resumen</span>
                    <p className="text-xs text-slate-700 font-medium italic">{property.short_description}</p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Descripción Ampliada</span>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100 font-normal">
                    {property.description || 'Sin descripción detallada disponible.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Dimensiones y Distribución */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2.5">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5">
                📐 Dimensiones y Distribución
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2.5 gap-y-1.5 text-center">
                <div className="bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 leading-tight">Recámaras</span>
                  <span className="text-base font-black text-slate-900 leading-tight mt-0.5">{property.bedrooms || 0}</span>
                </div>
                <div className="bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 leading-tight">Baños</span>
                  <span className="text-base font-black text-slate-900 leading-tight mt-0.5">{property.bathrooms || 0}</span>
                </div>
                <div className="bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 leading-tight">Estacionamiento</span>
                  <span className="text-base font-black text-slate-900 leading-tight mt-0.5">{property.parking_spaces || 0}</span>
                </div>
                <div className="bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 leading-tight">Niveles</span>
                  <span className="text-base font-black text-slate-900 leading-tight mt-0.5">{property.levels || 1}</span>
                </div>
                <div className="bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 leading-tight">Construcción</span>
                  <span className="text-base font-black text-slate-900 leading-tight mt-0.5">{property.area_sqm || 0} m²</span>
                </div>
                <div className="bg-slate-50 py-1.5 px-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                  <span className="text-xs font-bold text-slate-500 leading-tight">Terreno</span>
                  <span className="text-base font-black text-slate-900 leading-tight mt-0.5">{property.land_area_sqm || 0} m²</span>
                </div>
              </div>
            </div>

            {/* 3. Amenidades y Características */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                ✨ Amenidades y Características
              </h2>
              {amenitiesArray.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {amenitiesArray.map((amenity, index) => (
                    <span key={index} className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span> {amenity}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No se especificaron amenidades adicionales.</p>
              )}
            </div>

            {/* 4. Ubicación y Coordenadas */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                📍 Ubicación y Coordenadas
              </h2>
              
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Calle / Número</span>
                    <span className="font-semibold text-slate-800">{property.street || 'No especificada'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Colonia</span>
                    <span className="font-semibold text-slate-800">{property.neighborhood || 'No especificada'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Alcaldía / Ciudad</span>
                    <span className="font-semibold text-slate-800">{property.city || 'CDMX'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">Estado / C.P.</span>
                    <span className="font-semibold text-slate-800">{property.state || 'CDMX'} {property.postal_code ? `(C.P. ${property.postal_code})` : ''}</span>
                  </div>
                </div>

                {(property.lat || property.lng) && (
                  <div className="flex gap-4 text-[11px] font-mono bg-blue-50/50 text-blue-900 p-2.5 rounded-xl border border-blue-100">
                    <span><strong>Lat:</strong> {property.lat ?? 'N/A'}</span>
                    <span><strong>Lng:</strong> {property.lng ?? 'N/A'}</span>
                  </div>
                )}

                <div className="w-full h-72 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                  <iframe
                    title="Mapa de ubicación"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={
                      property.lat && property.lng
                        ? `https://maps.google.com/maps?q=${property.lat},${property.lng}&z=16&output=embed`
                        : `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress || 'Mexico City')}&z=15&output=embed`
                    }
                  />
                </div>
              </div>
            </div>

          </div>

          {/* COLUMNA DERECHA */}
          <div className="space-y-6">
            
            {/* Tarjeta Comercial */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Precio de Inversión</span>
                <div className="text-3xl font-black text-slate-900">
                  ${property.price?.toLocaleString('es-MX')}{' '}
                  <span className="text-xs font-bold text-slate-500">{property.currency || 'MXN'}</span>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Clasificación</span>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs font-semibold">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Categoría:</span>
                    <span className="text-slate-900 font-bold">{property.category || 'Casa'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Operación:</span>
                    <span className="text-slate-900 font-bold capitalize">{property.type || 'Venta'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Estatus:</span>
                    <span className="text-emerald-700 font-bold capitalize">{property.status || 'Disponible'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                  Métodos de Adquisición Aceptados
                </span>
                
                {paymentMethodsArray.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {paymentMethodsArray.map((method, idx) => (
                      <span key={idx} className="text-[11px] font-bold bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                        {method}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-medium italic block">
                    {property.type === 'renta' ? 'Recursos Propios (Transferencia)' : 'Consultar opciones de crédito'}
                  </span>
                )}

                <p className="text-[10px] font-extrabold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 leading-relaxed mt-2">
                  ⚠️ Aplican todas las instituciones financieras y créditos hipotecarios, <strong>excepto Banjército</strong>.
                </p>
              </div>

              {/* --- BADGE DE ANTIGÜEDAD + BOTÓN DE DESCARGA PDF --- */}
              <div className="pt-2 space-y-2 border-t border-slate-100">
                {(() => {
                  const pubInfo = getFormattedPublicationDate(property.created_at);
                  return (
                    <div className="flex items-center justify-between gap-4 text-[11px] font-semibold text-slate-500 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-100">
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs">🕒</span> Antigüedad:
                      </span>
                      <span className="font-extrabold text-slate-800 text-right pl-2 leading-tight">
                        {pubInfo.relative} {pubInfo.exact ? `(${pubInfo.exact})` : ''}
                      </span>
                    </div>
                  );
                })()}

                <button
                  type="button"
                  onClick={handleDownloadMinimalistPDF}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-2xl transition shadow-sm flex items-center justify-center gap-2"
                >
                  <span>📥 Descargar Ficha PDF</span>
                </button>
              </div>

            </div>

            {/* Recuadro de Contacto WhatsApp */}
            <div className="bg-emerald-50 border border-emerald-200 p-6 rounded-3xl shadow-sm space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-emerald-800">¿Te interesa esta propiedad?</h2>
              <p className="text-xs text-emerald-700 leading-relaxed font-medium">
                Ponte en contacto directo mediante WhatsApp para agendar una visita guiada o solicitar mayor información.
              </p>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3.5 rounded-2xl transition shadow-sm flex items-center justify-center gap-2 block text-center"
              >
                <span>💬 Contactar por WhatsApp</span>
              </a>
            </div>

            {/* Agente Inmobiliario Publicante */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Publicada en:
              </span>
              <p className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
                <span>🏢</span> {property.publishing_agent || 'Arosas Realty'}
              </p>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}