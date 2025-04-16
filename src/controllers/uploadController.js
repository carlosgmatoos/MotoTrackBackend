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

/**
 * Controlador para subir múltiples documentos para una solicitud.
 */
exports.uploadDocumentos = async (req, res) => {
  try {
    // 1. Verificar si se enviaron archivos
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Archivos requeridos',
        message: 'No se enviaron archivos'
      });
    }

    const { idVehiculo } = req.body;
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

    // Validar que se proporcionó el ID del vehículo
    if (!idVehiculo) {
      return res.status(400).json({
        success: false,
        error: 'ID de vehículo requerido',
        message: 'Debe proporcionar el ID del vehículo'
      });
    }

    // Procesar cada tipo de documento
    const documentTypes = ['cedula', 'licencia', 'seguro', 'factura'];
    const uploadResults = {};
    const errors = [];

    // Subir cada archivo presente en la solicitud
    for (const docType of documentTypes) {
      const files = req.files[docType];
      if (files && files.length > 0) {
        const file = files[0]; // Tomar solo el primer archivo de cada tipo

        // Subir archivo a Supabase
        const { publicUrl, error, fileName } = await uploadFile(
          file.buffer,
          file.originalname,
          file.mimetype,
          docType
        );

        if (error) {
          errors.push({ docType, error: error.message });
          continue;
        }

        uploadResults[docType] = { publicUrl, fileName };
      }
    }

    // Si hay errores en alguna subida, reportarlos
    if (errors.length > 0 && Object.keys(uploadResults).length === 0) {
      return res.status(500).json({
        success: false,
        error: 'Error en la carga de archivos',
        details: errors
      });
    }

    // Actualizar base de datos con las URLs de los documentos
    const result = await updateSolicitudDocumentos(uploadResults, userId, idVehiculo);
    
    res.status(201).json({
      success: true,
      message: 'Documentos subidos exitosamente',
      data: {
        documentos: uploadResults,
        ...result
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error en carga de documentos:', error);
    handleError(res, error, 'Error en la carga de documentos');
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
    } else {
      // Crear nueva solicitud con el documento
      const insertQuery = {
        text: `INSERT INTO Solicitud (${fieldName}, idUsuario, fechaCreacion, estado) 
               VALUES ($1, $2, NOW(), true) 
               RETURNING idSolicitud`,
        values: [publicUrl, userId]
      };
      
      result = await client.query(insertQuery);
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

// Actualizar o crear solicitud con múltiples documentos
async function updateSolicitudDocumentos(uploadResults, userId, idVehiculo) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Buscar si el ciudadano ya tiene un registro con ese vehículo
    const personaResult = await client.query(
      'SELECT idPersona FROM Persona WHERE idUsuario = $1',
      [userId]
    );
    
    if (personaResult.rows.length === 0) {
      throw new Error('No se encontró la persona asociada al usuario');
    }
    
    const idPersona = personaResult.rows[0].idpersona;
    
    // Buscar si ya existe una solicitud para este vehículo y persona
    const solicitudExistente = await client.query(
      'SELECT * FROM Solicitud WHERE idPersona = $1 AND idVehiculo = $2',
      [idPersona, idVehiculo]
    );
    
    let query;
    let values = [];
    let solicitudId;
    
    // Construir los campos a actualizar basados en los archivos subidos
    const updateFields = [];
    
    if (uploadResults.cedula) {
      updateFields.push('docCedula = $' + (updateFields.length + 1));
      values.push(uploadResults.cedula.publicUrl);
    }
    
    if (uploadResults.licencia) {
      updateFields.push('docLicencia = $' + (updateFields.length + 1));
      values.push(uploadResults.licencia.publicUrl);
    }
    
    if (uploadResults.seguro) {
      updateFields.push('docSeguro = $' + (updateFields.length + 1));
      values.push(uploadResults.seguro.publicUrl);
    }
    
    if (uploadResults.factura) {
      updateFields.push('docFacturaVehiculo = $' + (updateFields.length + 1));
      values.push(uploadResults.factura.publicUrl);
    }
    
    if (solicitudExistente.rows.length > 0) {
      // Actualizar solicitud existente
      solicitudId = solicitudExistente.rows[0].idsolicitud;
      
      query = {
        text: `UPDATE Solicitud SET ${updateFields.join(', ')} WHERE idPersona = $${values.length + 1} AND idVehiculo = $${values.length + 2} RETURNING *`,
        values: [...values, idPersona, idVehiculo]
      };
    } else {
      // Crear nueva solicitud con los documentos
      const insertFields = ['idPersona', 'idVehiculo', 'estadoDecision', 'fechaRegistro'];
      const insertValues = ['$' + (values.length + 1), '$' + (values.length + 2), '$' + (values.length + 3), 'CURRENT_DATE'];
      values.push(idPersona, idVehiculo, 'Pendiente');
      
      if (uploadResults.cedula) {
        insertFields.push('docCedula');
        insertValues.push('$' + (uploadResults.cedula ? values.indexOf(uploadResults.cedula.publicUrl) + 1 : values.length + 1));
      }
      
      if (uploadResults.licencia) {
        insertFields.push('docLicencia');
        insertValues.push('$' + (uploadResults.licencia ? values.indexOf(uploadResults.licencia.publicUrl) + 1 : values.length + 1));
      }
      
      if (uploadResults.seguro) {
        insertFields.push('docSeguro');
        insertValues.push('$' + (uploadResults.seguro ? values.indexOf(uploadResults.seguro.publicUrl) + 1 : values.length + 1));
      }
      
      if (uploadResults.factura) {
        insertFields.push('docFacturaVehiculo');
        insertValues.push('$' + (uploadResults.factura ? values.indexOf(uploadResults.factura.publicUrl) + 1 : values.length + 1));
      }
      
      query = {
        text: `INSERT INTO Solicitud (${insertFields.join(', ')}) VALUES (${insertValues.join(', ')}) RETURNING *`,
        values
      };
    }
    
    const result = await client.query(query);
    
    await client.query('COMMIT');
    
    return {
      idPersona,
      idVehiculo,
      solicitudId: result.rows[0]?.idsolicitud || solicitudId,
      type: 'documentos'
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
