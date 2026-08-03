'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface PropertyForm {
  id?: string;
  title: string;
  description: string;
  type: string;
  category: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  status: string;
  lat: number | null;
  lng: number | null;
  short_description: string;
  show_on_landing: boolean;
  amenities: string[];
  parking_spaces: number;
  levels: number;
  land_area_sqm: number;
  publishing_agent: string;
  payment_methods: string[]; // Formas de Pago / Financiamiento
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose?: () => void;
}

const COMMON_AMENITIES = [
  'Alberca',
  'Estacionamiento techado',
  'Seguridad privada',
  'Roof garden',
  'Pet friendly',
  'Gimnasio',
  'Bodega',
  'Cuarto de servicio',
  'Jardín',
  'Cocina integral',
  'Aire acondicionado',
  'Elevador',
];

// Opciones de pago para Venta
const VENTA_PAYMENT_OPTIONS = [
  'Transferencia',
  'Crédito Hipotecario / Bancario',
  'Infonavit',
  'FOVISSSTE',
  'Cofinavit',
  'Otro Financiamiento',
];

// Opciones de pago para Renta
const RENTA_PAYMENT_OPTIONS = [
  'Transferencia',
  'Recursos Propios',
];

function EditPropertyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [geocoding, setGeocoding] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [newAmenityInput, setNewAmenityInput] = useState<string>('');

  // Estado para controlar el Modal Personalizado
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  // Estados para Agente Inmobiliario
  const [customAgentInput, setCustomAgentInput] = useState<string>('');
  const [isCustomAgent, setIsCustomAgent] = useState<boolean>(false);

  const [form, setForm] = useState<PropertyForm>({
    title: '',
    description: '',
    type: 'venta',
    category: 'Casa',
    price: 0,
    currency: 'MXN',
    bedrooms: 0,
    bathrooms: 0,
    area_sqm: 0,
    street: '',
    neighborhood: '',
    city: 'CDMX',
    state: 'CDMX',
    postal_code: '',
    status: 'disponible',
    short_description: '',
    show_on_landing: false,
    amenities: [],
    parking_spaces: 0,
    levels: 1,
    land_area_sqm: 0,
    lat: null,
    lng: null,
    publishing_agent: 'ARR',
    payment_methods: ['Transferencia', 'Crédito Hipotecario / Bancario'],
  });

  const closeModal = () => {
    if (modal.onClose) {
      modal.onClose();
    }
    setModal(prev => ({ ...prev, isOpen: false }));
  };

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    onClose?: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onClose,
    });
  };

  useEffect(() => {
    async function checkAndFetch(): Promise<void> {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
        return;
      }

      if (id) {
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          showAlert(
            'Error al Cargar',
            'No se pudo obtener la información de la propiedad: ' + error.message,
            'error',
            () => router.push('/admin')
          );
          setLoading(false);
          return;
        }

        if (data) {
          const agentVal = data.publishing_agent || 'ARR';
          const isStandard = ['ARR', 'EB'].includes(agentVal);

          // Limpiar métodos antiguos si contenían la palabra "Contado"
          const rawPayments: string[] = data.payment_methods || [];
          const cleanedPayments = rawPayments.map(p => p === 'Contado' ? 'Transferencia' : p);

          setForm({
            id: data.id,
            title: data.title || '',
            description: data.description || '',
            type: data.type || 'venta',
            category: data.category || 'Casa',
            price: data.price || 0,
            currency: data.currency || 'MXN',
            bedrooms: data.bedrooms || 0,
            bathrooms: data.bathrooms || 0,
            area_sqm: data.area_sqm || 0,
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || 'CDMX',
            state: data.state || 'CDMX',
            postal_code: data.postal_code || '',
            status: data.status || 'disponible',
            short_description: data.short_description || '',
            show_on_landing: Boolean(data.show_on_landing),
            amenities: data.amenities || [],
            parking_spaces: data.parking_spaces ?? 0,
            levels: data.levels ?? 1,
            land_area_sqm: data.land_area_sqm ?? 0,
            lat: data.lat ?? null,
            lng: data.lng ?? null,
            publishing_agent: agentVal,
            payment_methods: cleanedPayments.length > 0 
              ? cleanedPayments 
              : (data.type === 'renta' ? ['Transferencia'] : ['Transferencia', 'Crédito Hipotecario / Bancario']),
          });

          if (!isStandard) {
            setIsCustomAgent(true);
            setCustomAgentInput(agentVal);
          }
        }
      }
      setLoading(false);
    }

    checkAndFetch();
  }, [id, router]);

  const handleFetchCoordinates = async () => {
    setGeoError(null);
    const streetClean = (form.street || '').replace(/^(Av\.|Avenida|Calle|C\.)\s*/i, 'Avenida ');
    const stateClean = (form.state || '').replace(/,?\s*CDMX/i, '');

    const primaryQuery = [
      streetClean,
      form.neighborhood,
      form.city,
      stateClean,
      form.postal_code,
      'Mexico'
    ].filter(Boolean).join(', ');

    const fallbackQuery = [
      streetClean,
      form.postal_code,
      form.city,
      'Mexico'
    ].filter(Boolean).join(', ');

    if (!streetClean && !form.postal_code) {
      setGeoError('Por favor escribe al menos la calle o el código postal para buscar la ubicación.');
      return;
    }

    setGeocoding(true);
    try {
      const fetchCoords = async (queryStr: string) => {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1`;
        const res = await fetch(url);
        return await res.json();
      };

      let data = await fetchCoords(primaryQuery);

      if (!data || data.length === 0) {
        data = await fetchCoords(fallbackQuery);
      }

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setForm(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lon)
        }));
      } else {
        setGeoError('No se encontraron coordenadas para esta dirección. Prueba simplificando la colonia o ajustando la calle.');
      }
    } catch (err) {
      console.error(err);
      setGeoError('Error de conexión al consultar el servicio de geocodificación.');
    } finally {
      setGeocoding(false);
    }
  };

  const handleAddAmenity = (amenityToAdd: string) => {
    if (form.amenities.includes(amenityToAdd)) return;
    setForm({ ...form, amenities: [...form.amenities, amenityToAdd] });
  };

  const handleRemoveAmenity = (amenityToRemove: string) => {
    setForm({ ...form, amenities: form.amenities.filter((i) => i !== amenityToRemove) });
  };

  const handleAgentSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'OTHER') {
      setIsCustomAgent(true);
      setCustomAgentInput('');
    } else {
      setIsCustomAgent(false);
      setForm({ ...form, publishing_agent: val });
    }
  };

  const handleAddCustomAgent = () => {
    if (customAgentInput.trim()) {
      setForm({ ...form, publishing_agent: customAgentInput.trim().toUpperCase() });
    }
  };

  const togglePaymentMethod = (method: string) => {
    const current = form.payment_methods;
    if (current.includes(method)) {
      if (current.length === 1) return; // Evitar dejarlo vacío
      setForm({ ...form, payment_methods: current.filter(m => m !== method) });
    } else {
      setForm({ ...form, payment_methods: [...current, method] });
    }
  };

  const handleOperationTypeChange = (newType: string) => {
    const defaultPayments = newType === 'renta' 
      ? ['Transferencia', 'Recursos Propios'] 
      : ['Transferencia', 'Crédito Hipotecario / Bancario'];

    setForm({
      ...form,
      type: newType,
      payment_methods: defaultPayments
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      type: form.type,
      category: form.category,
      price: Number(form.price) || 0,
      currency: form.currency,
      bedrooms: Number(form.bedrooms) || 0,
      bathrooms: Number(form.bathrooms) || 0,
      area_sqm: Number(form.area_sqm) || 0,
      street: form.street,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
      postal_code: form.postal_code,
      status: form.status,
      short_description: form.short_description || null,
      show_on_landing: form.show_on_landing,
      amenities: form.amenities,
      parking_spaces: Number(form.parking_spaces) || 0,
      levels: Number(form.levels) || 1,
      land_area_sqm: Number(form.land_area_sqm) || 0,
      lat: form.lat !== null && !isNaN(Number(form.lat)) ? Number(form.lat) : null,
      lng: form.lng !== null && !isNaN(Number(form.lng)) ? Number(form.lng) : null,
      publishing_agent: form.publishing_agent || 'ARR',
      payment_methods: form.payment_methods,
    };

    if (form.id) {
      const { error } = await supabase.from('properties').update(payload).eq('id', form.id);
      if (error) {
        showAlert('Error al Actualizar', error.message, 'error');
      } else {
        showAlert(
          '¡Operación Exitosa!',
          'La propiedad ha sido actualizada correctamente en la base de datos.',
          'success',
          () => router.push('/admin')
        );
      }
    } else {
      const { error } = await supabase.from('properties').insert([payload]);
      if (error) {
        showAlert('Error al Registrar', error.message, 'error');
      } else {
        showAlert(
          '¡Operación Exitosa!',
          'La propiedad ha sido registrada exitosamente.',
          'success',
          () => router.push('/admin')
        );
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
        Cargando formulario y expediente...
      </div>
    );
  }

  const availablePaymentOptions = form.type === 'renta' ? RENTA_PAYMENT_OPTIONS : VENTA_PAYMENT_OPTIONS;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-6 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Cabecera */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {form.id ? 'Editar datos de la Propiedad' : 'Nueva Propiedad'}
            </h1>
          </div>
          <Link
            href="/admin"
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
          >
            ← Volver al Dashboard
          </Link>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          
          {/* Bloque 1: Información General y Descripciones */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-4">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              📝 Información General y Descripciones
            </span>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Título / Nombre de la Propiedad</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Descripción Resumen</label>
              <input
                type="text"
                placeholder="Breve introducción de una línea..."
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Descripción Ampliada</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Bloque 2: Dimensiones y Distribución */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              📐 Dimensiones y Distribución
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Recámaras</label>
                <input
                  type="number"
                  value={form.bedrooms === 0 ? '' : form.bedrooms}
                  onChange={(e) => setForm({ ...form, bedrooms: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 text-center sm:text-left"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Baños</label>
                <input
                  type="number"
                  step="0.5"
                  value={form.bathrooms === 0 ? '' : form.bathrooms}
                  onChange={(e) => setForm({ ...form, bathrooms: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 text-center sm:text-left"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Estacionam.</label>
                <input
                  type="number"
                  value={form.parking_spaces === 0 ? '' : form.parking_spaces}
                  onChange={(e) => setForm({ ...form, parking_spaces: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 text-center sm:text-left"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Niveles</label>
                <input
                  type="number"
                  value={form.levels === 0 ? '' : form.levels}
                  onChange={(e) => setForm({ ...form, levels: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 text-center sm:text-left"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Const. (m²)</label>
                <input
                  type="number"
                  value={form.area_sqm === 0 ? '' : form.area_sqm}
                  onChange={(e) => setForm({ ...form, area_sqm: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 text-center sm:text-left"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Terreno (m²)</label>
                <input
                  type="number"
                  value={form.land_area_sqm === 0 ? '' : form.land_area_sqm}
                  onChange={(e) => setForm({ ...form, land_area_sqm: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 text-center sm:text-left"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Amenidades y Características */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              ✨ Amenidades y Características
            </span>

            <div className="flex flex-wrap gap-1.5 min-h-[40px] p-2.5 bg-white rounded-xl border border-slate-200">
              {form.amenities.length > 0 ? (
                form.amenities.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-900 text-white px-2.5 py-1 rounded-lg"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveAmenity(item)}
                      className="text-slate-400 hover:text-white font-bold ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-slate-400 italic self-center">Sin amenidades agregadas.</span>
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 block">Sugerencias rápidas:</span>
              <div className="flex flex-wrap gap-1">
                {COMMON_AMENITIES.map((amenity, idx) => {
                  const isSelected = form.amenities.includes(amenity);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddAmenity(amenity)}
                      className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                        isSelected
                          ? 'bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      + {amenity}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Otra amenidad..."
                value={newAmenityInput}
                onChange={(e) => setNewAmenityInput(e.target.value)}
                className="flex-1 text-xs font-medium p-2 bg-white rounded-xl border border-slate-300 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  if (newAmenityInput.trim()) {
                    handleAddAmenity(newAmenityInput.trim());
                    setNewAmenityInput('');
                  }
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Agregar
              </button>
            </div>
          </div>

          {/* Bloque 4: Ubicación, Coordenadas y Mapa */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-4">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              📍 Ubicación, Coordenadas y Mapa
            </span>

            {/* Fila 1: Calle y Número | Colonia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Calle y Número"
                value={form.street}
                onChange={(e) => {
                  setForm({ ...form, street: e.target.value });
                  setGeoError(null);
                }}
                className="text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
              <input
                type="text"
                placeholder="Colonia"
                value={form.neighborhood}
                onChange={(e) => {
                  setForm({ ...form, neighborhood: e.target.value });
                  setGeoError(null);
                }}
                className="text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Fila 2: Alcaldía/Ciudad | Estado | Código Postal */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Alcaldía / Ciudad"
                value={form.city}
                onChange={(e) => {
                  setForm({ ...form, city: e.target.value });
                  setGeoError(null);
                }}
                className="flex-1 text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
              <input
                type="text"
                placeholder="Estado (ej. CDMX, Estado de México)"
                value={form.state}
                onChange={(e) => {
                  setForm({ ...form, state: e.target.value });
                  setGeoError(null);
                }}
                className="flex-1 text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
              <input
                type="text"
                placeholder="Código Postal"
                value={form.postal_code}
                onChange={(e) => {
                  setForm({ ...form, postal_code: e.target.value });
                  setGeoError(null);
                }}
                className="w-full sm:w-36 text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
              />
            </div>

            {/* Fila 3: Latitud | Longitud | Botón */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-end">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Latitud</label>
                <input
                  type="number"
                  step="any"
                  placeholder="ej. 19.4326"
                  value={form.lat ?? ''}
                  onChange={(e) => {
                    setForm({ ...form, lat: e.target.value ? Number(e.target.value) : null });
                    setGeoError(null);
                  }}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">Longitud</label>
                <input
                  type="number"
                  step="any"
                  placeholder="ej. -99.1332"
                  value={form.lng ?? ''}
                  onChange={(e) => {
                    setForm({ ...form, lng: e.target.value ? Number(e.target.value) : null });
                    setGeoError(null);
                  }}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-transparent block mb-1 select-none">Acción</label>
                <button
                  type="button"
                  onClick={handleFetchCoordinates}
                  disabled={geocoding}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold p-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap h-[38px]"
                >
                  🗺️ {geocoding ? 'Calculando...' : 'Calcular Coordenadas'}
                </button>
              </div>
            </div>

            {/* Mapa o Mensaje de Error */}
            {geoError ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 h-44 flex flex-col items-center justify-center p-4 text-center">
                <span className="text-lg mb-1">⚠️</span>
                <p className="text-xs font-bold text-rose-700 max-w-md">
                  {geoError}
                </p>
              </div>
            ) : form.lat && form.lng ? (
              <div className="mt-3 rounded-xl overflow-hidden border border-slate-300 h-52 bg-slate-200">
                <iframe
                  title="Vista Previa de Mapa"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://maps.google.com/maps?q=${form.lat},${form.lng}&z=16&output=embed`}
                />
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 h-28 flex items-center justify-center text-[11px] text-slate-400 italic text-center p-4">
                Ingresa o calcula las coordenadas para visualizar el mapa interactivo.
              </div>
            )}
          </div>

          {/* Bloque 5: Clasificación y Precio */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              🏷️ Clasificación y Precio
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Operación</label>
                <select
                  value={form.type}
                  onChange={(e) => handleOperationTypeChange(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="venta">Venta</option>
                  <option value="renta">Renta</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Categoría</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="Casa">Casa</option>
                  <option value="Departamento">Departamento</option>
                  <option value="Penthouse">Penthouse</option>
                  <option value="Terreno">Terreno</option>
                  <option value="Oficina">Oficina / Local</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Estatus</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="disponible">Disponible</option>
                  <option value="reservado">Reservado</option>
                  <option value="vendido">Vendido</option>
                  <option value="rentado">Rentado</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Precio</label>
                <input
                  type="number"
                  required
                  value={form.price === 0 ? '' : form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : Number(e.target.value) })}
                  className="w-full text-xs font-medium p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Moneda</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="w-full text-xs font-medium p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600 bg-white"
                >
                  <option value="MXN">MXN</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bloque: Forma de Pago y Financiamiento */}
          <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              💳 Forma de Pago y Financiamiento
            </span>

            <p className="text-[11px] text-slate-500 font-medium">
              {form.type === 'renta'
                ? 'Selecciona la forma de pago aceptada para el arrendamiento:'
                : 'Selecciona los métodos o créditos aceptados para la compra (puedes marcar múltiples):'}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {availablePaymentOptions.map((option) => {
                const isSelected = form.payment_methods.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => togglePaymentMethod(option)}
                    className={`text-xs font-semibold px-3 py-2 rounded-xl border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{isSelected ? '✓' : '+'}</span>
                    <span>{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloque 6: Agente Inmobiliario (Izquierda) | Mostrar en Landing (Derecha) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* LADO IZQUIERDO: Agente Inmobiliario Publicante */}
            <div className="bg-slate-50/80 border border-slate-200 p-4 rounded-2xl space-y-3">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                👤 Agente Inmobiliario Publicante
              </span>

              <div className="flex flex-col gap-2">
                <select
                  value={isCustomAgent ? 'OTHER' : form.publishing_agent}
                  onChange={handleAgentSelectChange}
                  className="w-full text-xs font-semibold p-2.5 bg-white rounded-xl border border-slate-300 focus:outline-none focus:border-blue-600"
                >
                  <option value="ARR">ARR - AROSAS REALTY</option>
                  <option value="EB">EB - EASY BROKER</option>
                  <option value="OTHER">Otro / Personalizado...</option>
                </select>

                {isCustomAgent && (
                  <div className="flex gap-1.5 pt-0.5">
                    <input
                      type="text"
                      placeholder="Escribe la clave u origen..."
                      value={customAgentInput}
                      onChange={(e) => setCustomAgentInput(e.target.value)}
                      className="flex-1 text-xs font-medium p-2 bg-white rounded-xl border border-slate-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomAgent}
                      className="bg-slate-900 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl hover:bg-slate-800 transition"
                    >
                      Establecer
                    </button>
                  </div>
                )}

                <span className="text-[10px] text-slate-500 font-medium">
                  Agente activo (`publishing_agent`): <strong className="text-slate-900">{form.publishing_agent}</strong>
                </span>
              </div>
            </div>

            {/* LADO DERECHO: Checkbox Landing Page */}
            <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-2xl flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <label htmlFor="show_on_landing" className="text-[11px] font-black text-amber-900 uppercase tracking-wide cursor-pointer block">
                  ⭐ Mostrar en Landing Page
                </label>
                <span className="text-[10px] text-amber-800 font-medium block">
                  Activa esta casilla para destacarla en la página de inicio.
                </span>
              </div>
              <input
                type="checkbox"
                id="show_on_landing"
                checked={form.show_on_landing}
                onChange={(e) => setForm({ ...form, show_on_landing: e.target.checked })}
                className="w-5 h-5 accent-slate-900 rounded cursor-pointer flex-shrink-0"
              />
            </div>

          </div>

          {/* Acciones del Formulario */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/admin"
              className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold transition shadow-sm"
            >
              {saving ? 'Guardando Cambios...' : 'Guardar y Volver'}
            </button>
          </div>
        </form>
      </div>

      {/* MODAL DE NOTIFICACIÓN SUSTITUTO DE ALERT() */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center transform transition-all scale-100">
            
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-100">
              {modal.type === 'success' && <span className="text-2xl">🎉</span>}
              {modal.type === 'error' && <span className="text-2xl">❌</span>}
              {modal.type === 'info' && <span className="text-2xl">ℹ️</span>}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">{modal.title}</h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {modal.message}
              </p>
            </div>

            <button
              type="button"
              onClick={closeModal}
              className={`w-full py-2.5 rounded-xl text-xs font-bold text-white transition shadow-sm ${
                modal.type === 'error' 
                  ? 'bg-rose-600 hover:bg-rose-700' 
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              Aceptar
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

export default function EditPropertyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-slate-400 font-bold">Cargando editor...</div>}>
      <EditPropertyContent />
    </Suspense>
  );
}