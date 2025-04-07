const { pool } = require('../db');

/**
 * Obtiene todas las marcas con filtros opcionales
 */
const getAllMarcas = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM Marca WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idMarca) {
      query += ` AND idMarca = $${paramCounter}`;
      queryParams.push(filters.idMarca);
      paramCounter++;
    }
    
    if (filters.nombre) {
      query += ` AND nombre ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombre}%`);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY idMarca ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(marca => ({
      id: marca.idmarca,
      nombre: marca.nombre,
      estado: marca.estado,
      fechaCreacion: marca.fechacreacion
    }));
  } catch (error) {
    console.error('Error al obtener marcas:', error);
    throw error;
  }
};

/**
 * Crea una nueva marca
 */
const createMarca = async (marcaData) => {
  try {
    const { nombre } = marcaData;
    
    const result = await pool.query(
      'INSERT INTO Marca (nombre, estado) VALUES ($1, $2) RETURNING *',
      [nombre, 'activo']
    );
    
    const marca = result.rows[0];
    
    return {
      id: marca.idmarca,
      nombre: marca.nombre,
      estado: marca.estado,
      fechaCreacion: marca.fechacreacion
    };
  } catch (error) {
    console.error('Error al crear marca:', error);
    throw error;
  }
};

/**
 * Actualiza una marca existente
 */
const updateMarca = async (marcaId, marcaData) => {
  try {
    const { nombre, estado } = marcaData;
    
    const result = await pool.query(
      `UPDATE Marca 
       SET nombre = COALESCE($1, nombre),
           estado = COALESCE($2, estado)
       WHERE idMarca = $3
       RETURNING *`,
      [nombre, estado, marcaId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const marca = result.rows[0];
    
    return {
      id: marca.idmarca,
      nombre: marca.nombre,
      estado: marca.estado,
      fechaCreacion: marca.fechacreacion
    };
  } catch (error) {
    console.error('Error al actualizar marca:', error);
    throw error;
  }
};

/**
 * Elimina una marca (cambio de estado a deshabilitado)
 */
const deleteMarca = async (marcaId) => {
  try {
    // Verificar si hay modelos asociados a esta marca
    const modelos = await pool.query(
      'SELECT COUNT(*) FROM Modelo WHERE idMarca = $1',
      [marcaId]
    );
    
    if (parseInt(modelos.rows[0].count) > 0) {
      return { 
        success: false,
        message: 'Marca en uso'
      };
    }
    
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Marca SET estado = $1 WHERE idMarca = $2 RETURNING *',
      ['deshabilitado', marcaId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar marca:', error);
    throw error;
  }
};

module.exports = {
  getAllMarcas,
  createMarca,
  updateMarca,
  deleteMarca
}; 