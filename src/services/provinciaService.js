const { pool } = require('../db');

/**
 * Obtiene todas las provincias con filtros opcionales
 */
const getAllProvincias = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM Provincia WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idProvincia) {
      query += ` AND idProvincia = $${paramCounter}`;
      queryParams.push(filters.idProvincia);
      paramCounter++;
    }
    
    if (filters.nombreProvincia) {
      query += ` AND nombreProvincia ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombreProvincia}%`);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY idProvincia ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(provincia => ({
      id: provincia.idprovincia,
      nombreProvincia: provincia.nombreprovincia,
      estado: provincia.estado,
      fechaCreacion: provincia.fechacreacion
    }));
  } catch (error) {
    console.error('Error al obtener provincias:', error);
    throw error;
  }
};

/**
 * Crea una nueva provincia
 */
const createProvincia = async (provinciaData) => {
  try {
    const { nombreProvincia } = provinciaData;
    
    const result = await pool.query(
      'INSERT INTO Provincia (nombreProvincia, estado) VALUES ($1, $2) RETURNING *',
      [nombreProvincia, 'activo']
    );
    
    const provincia = result.rows[0];
    
    return {
      id: provincia.idprovincia,
      nombreProvincia: provincia.nombreprovincia,
      estado: provincia.estado,
      fechaCreacion: provincia.fechacreacion
    };
  } catch (error) {
    console.error('Error al crear provincia:', error);
    throw error;
  }
};

/**
 * Actualiza una provincia existente
 */
const updateProvincia = async (provinciaId, provinciaData) => {
  try {
    const { nombreProvincia, estado } = provinciaData;
    
    const result = await pool.query(
      `UPDATE Provincia 
       SET nombreProvincia = COALESCE($1, nombreProvincia),
           estado = COALESCE($2, estado)
       WHERE idProvincia = $3
       RETURNING *`,
      [nombreProvincia, estado, provinciaId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const provincia = result.rows[0];
    
    return {
      id: provincia.idprovincia,
      nombreProvincia: provincia.nombreprovincia,
      estado: provincia.estado,
      fechaCreacion: provincia.fechacreacion
    };
  } catch (error) {
    console.error('Error al actualizar provincia:', error);
    throw error;
  }
};

/**
 * Elimina una provincia
 */
const deleteProvincia = async (provinciaId) => {
  try {
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Provincia SET estado = $1 WHERE idProvincia = $2 RETURNING *',
      ['deshabilitado', provinciaId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar provincia:', error);
    throw error;
  }
};

module.exports = {
  getAllProvincias,
  createProvincia,
  updateProvincia,
  deleteProvincia
}; 