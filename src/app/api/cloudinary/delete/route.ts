import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL no proporcionada' }, { status: 400 });
    }

    // 1. Extraer el public_id completo incluyendo la carpeta si existe
    // Ejemplo de URL: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/sample.jpg
    const urlParts = imageUrl.split('/upload/');
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Formato de URL de Cloudinary no válido' }, { status: 400 });
    }

    // Remover número de versión (v12345678) si existe
    const pathAfterUpload = urlParts[1].replace(/^v\d+\//, '');
    
    // Quitar la extensión del archivo (.jpg, .png, etc.)
    const publicId = pathAfterUpload.substring(0, pathAfterUpload.lastIndexOf('.')) || pathAfterUpload;

    console.log('Intentando eliminar public_id:', publicId);

    // 2. Eliminar especificando el resource_type
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true, // Limpia la caché de CDN
    });

    if (result.result !== 'ok') {
      console.warn('Respuesta Cloudinary:', result);
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Error borrando en Cloudinary:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}