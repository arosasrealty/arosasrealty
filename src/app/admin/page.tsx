'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildFullAddress } from '@/lib/property';
import { exportPropertiesToExcel } from '@/lib/exportProperties';

interface Property {
  id: string;
  short_code?: string;
  street_number?: string;
  interior_number?: string;
  title: string;
  type: string;
  category: string;
  price: number;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  area_sqm: number;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  status: string;
  show_on_landing?: boolean;
  parking_spaces?: number;
  levels?: number;
  land_area_sqm?: number;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  async function handleExportExcel(): Promise<void> {
    setExporting(true);
    try {
      // Todas las propiedades (cualquier estatus) con todos sus campos + sus fotos
      const { data: allProps, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;

      const { data: imgs } = await supabase
        .from('property_images')
        .select('property_id, image_url, is_main');

      await exportPropertiesToExcel(allProps || [], imgs || []);
    } catch (err) {
      console.error('Error exportando a Excel:', err);
      alert('No se pudo exportar el archivo. Intenta de nuevo.');
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    checkUserAndFetch();
  }, []);

  async function checkUserAndFetch(): Promise<void> {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
      return;
    }

    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching properties:', error);
    } else {
      setProperties(data || []);
    }
    setLoading(false);
  }

  const handleLogout = async (): Promise<void> => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const handleDeleteProperty = async (id: string): Promise<void> => {
    if (!window.confirm('¿Seguro que deseas eliminar esta propiedad y todo su expediente?')) return;

    await supabase.from('property_images').delete().eq('property_id', id);
    await supabase.from('properties').delete().eq('id', id);
    checkUserAndFetch();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
        Verificando credenciales y expediente...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900">Panel Administrativo</h1>
            <p className="text-xs text-slate-500">Gestión de catálogo de inmuebles y datos de expedientes</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/edit"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              + Nueva Propiedad
            </Link>
            <button
              onClick={handleExportExcel}
              disabled={exporting || properties.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm"
            >
              {exporting ? 'Generando...' : '📊 Exportar a Excel'}
            </button>
            <Link
              href="/"
              target="_blank"
              className="text-xs font-bold text-slate-600 hover:text-blue-600 transition"
            >
              🌐 Sitio Público ↗
            </Link>
            <button
              onClick={handleLogout}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inmuebles Registrados ({properties.length})
            </h2>
          </div>

          {properties.length === 0 ? (
            <div className="text-center py-12 text-xs font-bold text-slate-400">
              No hay propiedades registradas en la base de datos.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {properties.map((prop) => (
                <div key={prop.id} className="py-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        ID: {prop.id.slice(0, 8)}...
                      </span>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {prop.type} / {prop.category}
                      </span>
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {prop.status}
                      </span>
                      {prop.show_on_landing && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          ⭐ En Landing
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-black text-slate-900">
                      {prop.short_code && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md mr-2 align-middle">
                          {prop.short_code}
                        </span>
                      )}
                      {prop.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      📍 {buildFullAddress(prop) || 'Sin dirección registrada'}
                    </p>

                    <div className="flex gap-4 text-xs font-semibold text-slate-600 pt-1 flex-wrap">
                      <span>💰 ${prop.price?.toLocaleString('es-MX')} {prop.currency}</span>
                      <span>🛏️ {prop.bedrooms || 0} rec</span>
                      <span>🚿 {prop.bathrooms || 0} baños</span>
                      <span>🚗 {prop.parking_spaces || 0} est.</span>
                      <span>🏢 {prop.levels || 1} niv</span>
                      <span>📐 Const: {prop.area_sqm || 0} m²</span>
                      <span>🌱 Terreno: {prop.land_area_sqm || 0} m²</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Link
                      href={`/admin/edit?id=${prop.id}`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl transition border border-slate-300"
                    >
                      ✏️ Editar Datos
                    </Link>
                    <Link
                      href={`/admin/images?id=${prop.id}`}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold px-3.5 py-2 rounded-xl transition border border-blue-200 flex items-center gap-1.5"
                    >
                      <span>📷</span> Fotos
                    </Link>
                    <button
                      onClick={() => handleDeleteProperty(prop.id)}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-2 rounded-xl transition border border-rose-200"
                      title="Eliminar propiedad"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}