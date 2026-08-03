'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Property {
  id: string;
  title: string;
  address: string;
  price: number;
}

interface PropertyImage {
  id: string;
  image_url: string;
  property_id: string;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'confirm';
  onConfirm?: () => void;
  onClose?: () => void;
}

export default function AdminPropertyImagesPage() {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState<string>('');

  const [property, setProperty] = useState<Property | null>(null);
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Estado para controlar el Modal Personalizado
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
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
    type: 'success' | 'error' | 'info' | 'confirm' = 'info',
    onConfirm?: () => void,
    onClose?: () => void
  ) => {
    setModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      onClose,
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setPropertyId(id);
    } else {
      router.push('/admin');
    }
  }, [router]);

  const checkSessionAndFetch = useCallback(async (): Promise<void> => {
    if (!propertyId) return;
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/admin/login');
      return;
    }

    const cleanId = String(propertyId).trim();

    const { data: propData, error: propError } = await supabase
      .from('properties')
      .select('id, title, address, price')
      .eq('id', cleanId)
      .single();

    if (propError) {
      showAlert(
        'Error al Cargar Propiedad',
        'No se pudo encontrar la propiedad especificada.',
        'error',
        undefined,
        () => router.push('/admin')
      );
      setLoading(false);
      return;
    }

    if (propData) setProperty(propData);

    const { data: imgData, error: imgError } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', cleanId);

    if (imgError) {
      console.error('Error al obtener imágenes:', imgError);
      showAlert('Error al Cargar Galería', 'No se pudieron recuperar las imágenes asociadas.', 'error');
    } else {
      setImages(imgData || []);
      setSelectedImageIds([]);
    }
    setLoading(false);
  }, [propertyId, router]);

  useEffect(() => {
    if (propertyId) {
      checkSessionAndFetch();
    }
  }, [propertyId, checkSessionAndFetch]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const cleanId = String(propertyId).trim();

    let uploadedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'upload_preset',
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''
      );

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );

        const data = await res.json();

        if (data.secure_url) {
          const { error } = await supabase.from('property_images').insert({
            property_id: cleanId,
            image_url: data.secure_url,
          });

          if (!error) {
            uploadedCount++;
          } else {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error('Error cargando imagen:', err);
        failedCount++;
      }
    }

    setUploading(false);
    await checkSessionAndFetch();

    if (failedCount === 0 && uploadedCount > 0) {
      showAlert('¡Carga Completada!', `Se subieron exitosamente ${uploadedCount} fotografía(s).`, 'success');
    } else if (uploadedCount > 0 && failedCount > 0) {
      showAlert('Carga Parcial', `Se subieron ${uploadedCount} imagen(es), pero ${failedCount} fallaron.`, 'info');
    } else if (failedCount > 0) {
      showAlert('Error en la Carga', 'No se pudo subir ninguna de las imágenes seleccionadas.', 'error');
    }
  };

  const toggleSelectImage = (imageId: string): void => {
    setSelectedImageIds((prev) =>
      prev.includes(imageId) ? prev.filter((item) => item !== imageId) : [...prev, imageId]
    );
  };

  const toggleSelectAll = (): void => {
    if (selectedImageIds.length === images.length) {
      setSelectedImageIds([]);
    } else {
      setSelectedImageIds(images.map((img) => img.id));
    }
  };

  const confirmDeleteImages = async (): Promise<void> => {
    closeModal();
    setDeleting(true);

    const imagesToDelete = images.filter((img) => selectedImageIds.includes(img.id));

    for (const img of imagesToDelete) {
      try {
        await fetch('/api/cloudinary/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: img.image_url }),
        });
      } catch (err) {
        console.error('Error eliminando de Cloudinary:', err);
      }
    }

    const { error } = await supabase.from('property_images').delete().in('id', selectedImageIds);

    if (error) {
      showAlert('Error al Eliminar', 'Hubo un problema al borrar los registros de la base de datos.', 'error');
    } else {
      showAlert(
        'Imágenes Eliminadas',
        `Se han eliminado correctamente ${selectedImageIds.length} fotografía(s).`,
        'success'
      );
    }

    setSelectedImageIds([]);
    await checkSessionAndFetch();
    setDeleting(false);
  };

  const handleDeleteSelected = (): void => {
    if (selectedImageIds.length === 0) return;

    showAlert(
      '¿Confirmar Eliminación?',
      `Esta acción eliminará permanentemente ${selectedImageIds.length} fotografía(s) de la propiedad y del servidor.`,
      'confirm',
      confirmDeleteImages
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-xs font-bold text-slate-400">
        Cargando expediente fotográfico...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 font-sans relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <Link
            href="/admin"
            className="text-xs font-bold text-slate-500 hover:text-blue-600 transition"
          >
            ← Volver al Dashboard
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            {property?.title || 'Expediente Fotográfico'}
          </h1>
          <p className="text-xs text-slate-500">
            📍 {property?.address} • ID: {propertyId.slice(0, 8)}...
          </p>
        </div>

        <label className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition shadow-sm flex items-center gap-2">
          <span>{uploading ? '⏳ Subiendo...' : '+ Subir Fotografías'}</span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {images.length > 0 && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-3.5 py-2 rounded-xl transition shadow-xs"
            >
              {selectedImageIds.length === images.length
                ? '☐ Desmarcar todas'
                : '☑ Seleccionar todas'}
            </button>
            <span className="text-xs font-semibold text-slate-500">
              {selectedImageIds.length} de {images.length} fotos seleccionadas
            </span>
          </div>

          {selectedImageIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5"
            >
              <span>🗑️</span>
              {deleting ? 'Eliminando...' : `Eliminar seleccionadas (${selectedImageIds.length})`}
            </button>
          )}
        </div>
      )}

      {images.length === 0 ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-2">
          <p className="text-sm font-bold text-slate-600">No hay fotografías registradas.</p>
          <p className="text-xs text-slate-400">Haz clic en &quot;+ Subir Fotografías&quot; para agregar imágenes.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((img) => {
            const isSelected = selectedImageIds.includes(img.id);

            return (
              <div
                key={img.id}
                onClick={() => toggleSelectImage(img.id)}
                className={`group relative aspect-4/3 bg-slate-900 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-blue-600 ring-4 ring-blue-500/20 scale-[0.98]'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt="Propiedad"
                  className={`w-full h-full object-cover ${
                    isSelected ? 'opacity-80' : 'opacity-100'
                  }`}
                />

                <div className="absolute top-2 left-2 z-10">
                  <div
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-xs font-black transition-all ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white/80 border-slate-400 text-transparent'
                    }`}
                  >
                    ✓
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE NOTIFICACIÓN Y CONFIRMACIÓN */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center transform transition-all scale-100">
            
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-slate-100">
              {modal.type === 'success' && <span className="text-2xl">🎉</span>}
              {modal.type === 'error' && <span className="text-2xl">❌</span>}
              {modal.type === 'info' && <span className="text-2xl">ℹ️</span>}
              {modal.type === 'confirm' && <span className="text-2xl">⚠️</span>}
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900">{modal.title}</h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {modal.message}
              </p>
            </div>

            {modal.type === 'confirm' ? (
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={modal.onConfirm}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            ) : (
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
            )}

          </div>
        </div>
      )}
    </div>
  );
}