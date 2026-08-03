'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface PropertyImage {
  id: string;
  property_id: string;
  image_url: string;
}

interface ImageUploaderProps {
  propertyId: string;
}

export default function ImageUploader({ propertyId }: ImageUploaderProps) {
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [uploading, setUploading] = useState(false);

  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showModal = (
    type: 'success' | 'error' | 'confirm',
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    setModal((prev) => ({ ...prev, isOpen: false, onConfirm: undefined }));
  };

  // Carga de imágenes sin la columna created_at
  const fetchImages = useCallback(async () => {
    if (!propertyId || propertyId === 'undefined' || propertyId === '[object Object]') {
      return;
    }

    const targetId = String(propertyId).trim();

    const { data, error } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', targetId);

    if (error) {
      console.error('❌ Error de Supabase al consultar fotos:', error);
    } else {
      setImages(data || []);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!propertyId) {
      showModal('error', 'Error', 'ID de propiedad no identificado.');
      return;
    }

    setUploading(true);
    const targetId = String(propertyId).trim();

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append(
          'upload_preset',
          process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || ''
        );

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );

        const data = await res.json();

        if (data.secure_url) {
          const { error: insertError } = await supabase
            .from('property_images')
            .insert({
              property_id: targetId,
              image_url: data.secure_url,
            });

          if (insertError) {
            console.error('❌ Error al guardar en BD:', insertError);
            throw new Error(`Error BD: ${insertError.message}`);
          }
        } else {
          throw new Error('Cloudinary no devolvió la URL de la imagen.');
        }
      }

      showModal('success', 'Subida Completada', 'Las fotografías han sido agregadas con éxito.');
      await fetchImages();
    } catch (err: any) {
      showModal('error', 'Error de Carga', err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteRequest = (img: PropertyImage) => {
    showModal(
      'confirm',
      '¿Eliminar Fotografía?',
      'Esta imagen será retirada del expediente.',
      () => confirmDelete(img)
    );
  };

  const confirmDelete = async (img: PropertyImage) => {
    closeModal();

    try {
      await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: img.image_url }),
      });

      await supabase.from('property_images').delete().eq('id', img.id);

      showModal('success', 'Imagen Eliminada', 'La fotografía fue retirada del expediente.');
      await fetchImages();
    } catch (err: any) {
      showModal('error', 'Error al Eliminar', err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">
          Fotos registradas ({images.length})
        </span>
        <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm flex items-center gap-1.5">
          <span>{uploading ? '⏳ Subiendo...' : '+ Subir Fotografías'}</span>
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image_url}
                alt="Fotografía de la propiedad"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                type="button"
                onClick={() => handleDeleteRequest(img)}
                className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded-lg shadow-md transition opacity-0 group-hover:opacity-100 text-xs"
                title="Eliminar fotografía"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center text-xs text-slate-400 font-medium">
          Aún no hay fotos registradas para este inmueble. Haz clic en el botón de arriba para subir.
        </div>
      )}

      {/* MODAL DE ALERTAS Y CONFIRMACIÓN */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-center mb-4">
              {modal.type === 'success' && (
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-lg font-bold">✓</div>
              )}
              {modal.type === 'error' && (
                <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-lg font-bold">⚠️</div>
              )}
              {modal.type === 'confirm' && (
                <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-lg font-bold">❓</div>
              )}
            </div>

            <h3 className="text-sm font-bold text-center text-slate-900 mb-1">{modal.title}</h3>
            <p className="text-xs text-center text-slate-500 mb-5 leading-relaxed">{modal.message}</p>

            <div className="flex gap-2">
              {modal.type === 'confirm' ? (
                <>
                  <button onClick={closeModal} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-xl text-xs font-bold transition">Cancelar</button>
                  <button onClick={modal.onConfirm} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-xs font-bold transition shadow-sm">Confirmar</button>
                </>
              ) : (
                <button onClick={closeModal} className="w-full bg-slate-900 hover:bg-black text-white py-2 rounded-xl text-xs font-bold transition shadow-sm">Aceptar</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}