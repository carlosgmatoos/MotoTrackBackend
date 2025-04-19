// src/services/uploadService.js
const supabase = require('./supabaseClient');

// Usar la variable de entorno o un nombre de bucket predeterminado
const BUCKET_NAME = process.env.BUCKET_NAME || 'mototrack';

class UploadError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function uploadFile(fileBuffer, originalName, mimeType, fileType) {
  try {
    // 1. Validar y determinar la carpeta
    const folderPath = getFolderPath(fileType);
    
    // 2. Generar nombre único y seguro
    const fileName = generateSafeFileName(folderPath, originalName);

    console.log(`Intentando subir archivo a Supabase bucket ${BUCKET_NAME}: ${fileName}`);

    // 3. Subir a Supabase Storage con retry
    const { data, error } = await uploadWithRetry(fileName, fileBuffer, mimeType);

    if (error) {
      console.error('Error uploading to Supabase:', { error, fileName });
      throw new UploadError('Error al subir archivo a Supabase', 'UPLOAD_ERROR');
    }

    // 4. Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return { 
      publicUrl: publicUrlData?.publicUrl, 
      error: null,
      fileName 
    };
  } catch (error) {
    console.error('Upload service error:', { error, fileType });
    return { 
      publicUrl: null, 
      error: error instanceof UploadError ? error : new UploadError('Error interno del servidor', 'INTERNAL_ERROR')
    };
  }
}

function getFolderPath(fileType) {
  const paths = {
    'perfil': 'fotos/perfil',
    'cedula': 'documentos/cedulas',
    'licencia': 'documentos/licencias',
    'seguro': 'documentos/seguros',
    'factura': 'documentos/facturas'
  };
  return paths[fileType] || 'uploads';
}

function generateSafeFileName(folderPath, originalName) {
  const timestamp = Date.now();
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folderPath}/${timestamp}-${safeName}`;
}

async function uploadWithRetry(fileName, fileBuffer, mimeType, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, fileBuffer, {
          contentType: mimeType,
          upsert: true
        });
      
      if (!error) return { data, error: null };
      
      if (i === maxRetries - 1) return { data: null, error };
      
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    } catch (error) {
      if (i === maxRetries - 1) return { data: null, error };
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

module.exports = {
  uploadFile
};
