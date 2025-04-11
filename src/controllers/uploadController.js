// src/controllers/uploadController.js
const { uploadFile } = require('../services/uploadService');
const { handleError } = require('../utils/errorHandler');
const { pool } = require('../db');
/**
 * Controlador para subir archivos a Supabase y almacenar la URL en la base de datos.
 */
exports.uploadToSupabase = async (req, res) => {
  try {
    // 1. Verificar si se envió el archivo
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'Archivo requerido',
        message: 'No se envió ningún archivo'
      });
    }

    const { fileType, solicitudId } = req.body;
    // Obtener el ID del usuario autenticado desde req.user
    const userId = req.user?.idUsuario;
    
    // Validar que el usuario esté autenticado
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Autenticación requerida',
        message: 'Debe iniciar sesión para subir archivos'
      });
    }

    // Subir archivo a Supabase
    const { publicUrl, error, fileName } = await uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      fileType
    );

    if (error) throw error;

    // Actualizar base de datos según el tipo de archivo
    let result;
    if (fileType === 'perfil') {
      // Actualizar foto de perfil
      result = await updateUserProfile(publicUrl, userId);
    } else {
      // Crear o actualizar solicitud con el documento
      result = await updateOrCreateSolicitud(fileType, publicUrl, userId, solicitudId);
    }
    
    res.status(201).json({
      success: true,
      message: 'Archivo subido exitosamente',
      data: {
        url: publicUrl,
        fileName,
        ...result
      }
    });
  } catch (error) {
    console.error('Error en carga de archivo:', error);
    handleError(res, error, 'Error en la carga de archivo');
  }
};

// Actualizar foto de perfil del usuario
async function updateUserProfile(publicUrl, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE Usuario SET ftPerfil = $1 WHERE idUsuario = $2 RETURNING idUsuario',
      [publicUrl, userId]
    );
    
    console.log(`Actualizada foto de perfil para usuario ${userId}`);
    
    await client.query('COMMIT');
    
    return {
      userId: result.rows[0]?.idUsuario || userId,
      type: 'perfil'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en transacción de base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Crear nueva solicitud o actualizar existente
async function updateOrCreateSolicitud(fileType, publicUrl, userId, solicitudId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const fieldName = getDocumentFieldName(fileType);
    let result;
    
    if (solicitudId) {
      // Actualizar solicitud existente
      result = await client.query(
        `UPDATE Solicitud SET ${fieldName} = $1 WHERE idSolicitud = $2 RETURNING idSolicitud`,
        [publicUrl, solicitudId]
      );
      console.log(`Actualizado documento ${fieldName} para solicitud ${solicitudId}`);
    } else {
      // Crear nueva solicitud con el documento
      const insertQuery = {
        text: `INSERT INTO Solicitud (${fieldName}, idUsuario, fechaCreacion, estado) 
               VALUES ($1, $2, NOW(), true) 
               RETURNING idSolicitud`,
        values: [publicUrl, userId]
      };
      
      result = await client.query(insertQuery);
      const newSolicitudId = result.rows[0].idSolicitud;
      console.log(`Creada nueva solicitud ${newSolicitudId} con documento ${fieldName}`);
    }
    
    await client.query('COMMIT');
    
    return {
      solicitudId: result.rows[0]?.idSolicitud || null,
      documentType: fileType,
      type: 'documento'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en transacción de base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
}

function getDocumentFieldName(fileType) {
  const fieldNames = {
    'cedula': 'docCedula',
    'licencia': 'docLicencia',
    'seguro': 'docSeguro',
    'factura': 'docFacturaVehiculo'
  };
  
  if (!fieldNames[fileType]) {
    throw new Error('Tipo de documento no válido');
  }
  
  return fieldNames[fileType];
}
