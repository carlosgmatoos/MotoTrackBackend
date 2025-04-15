const { pool } = require('../db');

/**
 * Obtiene todas las ubicaciones con filtros opcionales
 */
const getAllUbicaciones = async (filters = {}) => {
  try {
    let query = `
      SELECT u.*, m.nombreMunicipio, p.idProvincia, p.nombreProvincia 
      FROM Ubicacion u
      LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      LEFT JOIN Provincia p ON m.idProvincia = p.idProvincia
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idUbicacion) {
      query += ` AND u.idUbicacion = $${paramCounter}`;
      queryParams.push(filters.idUbicacion);
      paramCounter++;
    }
    
    if (filters.direccion) {
      query += ` AND u.direccion ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.direccion}%`);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND u.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    if (filters.idMunicipio) {
      query += ` AND u.idMunicipio = $${paramCounter}`;
      queryParams.push(filters.idMunicipio);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY u.idUbicacion ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(ubicacion => ({
      id: ubicacion.idubicacion,
      direccion: ubicacion.direccion,
      estado: ubicacion.estado,
      fechaCreacion: ubicacion.fechacreacion,
      municipio: {
        id: ubicacion.idmunicipio,
        nombreMunicipio: ubicacion.nombremunicipio,
        provincia: {
          id: ubicacion.idprovincia,
          nombreProvincia: ubicacion.nombreprovincia
        }
      }
    }));
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error);
    throw error;
  }
};

/**
 * Crea una nueva ubicación
 */
const createUbicacion = async (ubicacionData) => {
  try {
    const { direccion, idMunicipio } = ubicacionData;
    
    const result = await pool.query(
      'INSERT INTO Ubicacion (direccion, idMunicipio, estado) VALUES ($1, $2, $3) RETURNING *',
      [direccion, idMunicipio, 'activo']
    );
    
    const ubicacion = result.rows[0];
    
    // Get municipio and provincia info
    const municipioResult = await pool.query(
      `SELECT m.nombreMunicipio, p.idProvincia, p.nombreProvincia 
       FROM Municipio m
       LEFT JOIN Provincia p ON m.idProvincia = p.idProvincia
       WHERE m.idMunicipio = $1`,
      [ubicacion.idmunicipio]
    );
    
    const municipioInfo = municipioResult.rows.length > 0 
      ? municipioResult.rows[0]
      : { nombremunicipio: null, idprovincia: null, nombreprovincia: null };
    
    return {
      id: ubicacion.idubicacion,
      direccion: ubicacion.direccion,
      estado: ubicacion.estado,
      fechaCreacion: ubicacion.fechacreacion,
      municipio: {
        id: ubicacion.idmunicipio,
        nombreMunicipio: municipioInfo.nombremunicipio,
        provincia: {
          id: municipioInfo.idprovincia,
          nombreProvincia: municipioInfo.nombreprovincia
        }
      }
    };
  } catch (error) {
    console.error('Error al crear ubicación:', error);
    throw error;
  }
};

/**
 * Actualiza una ubicación existente
 */
const updateUbicacion = async (ubicacionId, ubicacionData) => {
  try {
    const { direccion, estado, idMunicipio } = ubicacionData;
    
    const result = await pool.query(
      `UPDATE Ubicacion 
       SET direccion = COALESCE($1, direccion),
           estado = COALESCE($2, estado),
           idMunicipio = COALESCE($3, idMunicipio)
       WHERE idUbicacion = $4
       RETURNING *`,
      [direccion, estado, idMunicipio, ubicacionId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const ubicacion = result.rows[0];
    
    // Get municipio and provincia info
    const municipioResult = await pool.query(
      `SELECT m.nombreMunicipio, p.idProvincia, p.nombreProvincia 
       FROM Municipio m
       LEFT JOIN Provincia p ON m.idProvincia = p.idProvincia
       WHERE m.idMunicipio = $1`,
      [ubicacion.idmunicipio]
    );
    
    const municipioInfo = municipioResult.rows.length > 0 
      ? municipioResult.rows[0]
      : { nombremunicipio: null, idprovincia: null, nombreprovincia: null };
    
    return {
      id: ubicacion.idubicacion,
      direccion: ubicacion.direccion,
      estado: ubicacion.estado,
      fechaCreacion: ubicacion.fechacreacion,
      municipio: {
        id: ubicacion.idmunicipio,
        nombreMunicipio: municipioInfo.nombremunicipio,
        provincia: {
          id: municipioInfo.idprovincia,
          nombreProvincia: municipioInfo.nombreprovincia
        }
      }
    };
  } catch (error) {
    console.error('Error al actualizar ubicación:', error);
    throw error;
  }
};

/**
 * Elimina una ubicación
 */
const deleteUbicacion = async (ubicacionId) => {
  try {
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Ubicacion SET estado = $1 WHERE idUbicacion = $2 RETURNING *',
      ['deshabilitado', ubicacionId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar ubicación:', error);
    throw error;
  }
};

module.exports = {
  getAllUbicaciones,
  createUbicacion,
  updateUbicacion,
  deleteUbicacion
};