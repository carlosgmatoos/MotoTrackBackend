const { pool } = require('../db');

/**
 * Obtiene todos los municipios con filtros opcionales
 */
const getAllMunicipios = async (filters = {}) => {
  try {
    let query = `
      SELECT m.*, p.nombreProvincia 
      FROM Municipio m
      LEFT JOIN Provincia p ON m.idProvincia = p.idProvincia
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idMunicipio) {
      query += ` AND m.idMunicipio = $${paramCounter}`;
      queryParams.push(filters.idMunicipio);
      paramCounter++;
    }
    
    if (filters.nombreMunicipio) {
      query += ` AND m.nombreMunicipio ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombreMunicipio}%`);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND m.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    if (filters.idProvincia) {
      query += ` AND m.idProvincia = $${paramCounter}`;
      queryParams.push(filters.idProvincia);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY m.idMunicipio ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(municipio => ({
      id: municipio.idmunicipio,
      nombreMunicipio: municipio.nombremunicipio,
      estado: municipio.estado,
      fechaCreacion: municipio.fechacreacion,
      provincia: {
        id: municipio.idprovincia,
        nombreProvincia: municipio.nombreprovincia
      }
    }));
  } catch (error) {
    console.error('Error al obtener municipios:', error);
    throw error;
  }
};

/**
 * Crea un nuevo municipio
 */
const createMunicipio = async (municipioData) => {
  try {
    const { nombreMunicipio, idProvincia } = municipioData;
    
    const result = await pool.query(
      'INSERT INTO Municipio (nombreMunicipio, idProvincia, estado) VALUES ($1, $2, $3) RETURNING *',
      [nombreMunicipio, idProvincia, 'activo']
    );
    
    const municipio = result.rows[0];
    
    // Get provincia info
    const provinciaResult = await pool.query(
      'SELECT nombreProvincia FROM Provincia WHERE idProvincia = $1',
      [municipio.idprovincia]
    );
    
    const nombreProvincia = provinciaResult.rows.length > 0 
      ? provinciaResult.rows[0].nombreprovincia 
      : null;
    
    return {
      id: municipio.idmunicipio,
      nombreMunicipio: municipio.nombremunicipio,
      estado: municipio.estado,
      fechaCreacion: municipio.fechacreacion,
      provincia: {
        id: municipio.idprovincia,
        nombreProvincia: nombreProvincia
      }
    };
  } catch (error) {
    console.error('Error al crear municipio:', error);
    throw error;
  }
};

/**
 * Actualiza un municipio existente
 */
const updateMunicipio = async (municipioId, municipioData) => {
  try {
    const { nombreMunicipio, estado, idProvincia } = municipioData;
    
    const result = await pool.query(
      `UPDATE Municipio 
       SET nombreMunicipio = COALESCE($1, nombreMunicipio),
           estado = COALESCE($2, estado),
           idProvincia = COALESCE($3, idProvincia)
       WHERE idMunicipio = $4
       RETURNING *`,
      [nombreMunicipio, estado, idProvincia, municipioId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const municipio = result.rows[0];
    
    // Get provincia info
    const provinciaResult = await pool.query(
      'SELECT nombreProvincia FROM Provincia WHERE idProvincia = $1',
      [municipio.idprovincia]
    );
    
    const nombreProvincia = provinciaResult.rows.length > 0 
      ? provinciaResult.rows[0].nombreprovincia 
      : null;
    
    return {
      id: municipio.idmunicipio,
      nombreMunicipio: municipio.nombremunicipio,
      estado: municipio.estado,
      fechaCreacion: municipio.fechacreacion,
      provincia: {
        id: municipio.idprovincia,
        nombreProvincia: nombreProvincia
      }
    };
  } catch (error) {
    console.error('Error al actualizar municipio:', error);
    throw error;
  }
};

/**
 * Elimina un municipio
 */
const deleteMunicipio = async (municipioId) => {
  try {
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Municipio SET estado = $1 WHERE idMunicipio = $2 RETURNING *',
      ['deshabilitado', municipioId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar municipio:', error);
    throw error;
  }
};

module.exports = {
  getAllMunicipios,
  createMunicipio,
  updateMunicipio,
  deleteMunicipio
}; 