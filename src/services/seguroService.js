const { pool } = require('../db');

/**
 * Obtiene todos los seguros con filtros opcionales
 */
const getAllSeguros = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM Seguro WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idSeguro) {
      query += ` AND idSeguro = $${paramCounter}`;
      queryParams.push(filters.idSeguro);
      paramCounter++;
    }
    
    if (filters.proveedor) {
      query += ` AND proveedor ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.proveedor}%`);
      paramCounter++;
    }
    
    if (filters.numeroPoliza) {
      query += ` AND numeroPoliza ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.numeroPoliza}%`);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY idSeguro ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(seguro => ({
      id: seguro.idseguro,
      proveedor: seguro.proveedor,
      numeroPoliza: seguro.numeropoliza,
      estado: seguro.estado,
      fechaCreacion: seguro.fechacreacion
    }));
  } catch (error) {
    console.error('Error al obtener seguros:', error);
    throw error;
  }
};

/**
 * Crea un nuevo seguro
 */
const createSeguro = async (seguroData) => {
  try {
    const { proveedor, numeroPoliza } = seguroData;
    
    // Verificar si ya existe un seguro con ese número de póliza
    const existente = await pool.query(
      'SELECT * FROM Seguro WHERE numeroPoliza = $1',
      [numeroPoliza]
    );
    
    if (existente.rows.length > 0) {
      throw new Error('Ya existe un seguro con ese número de póliza');
    }
    
    const result = await pool.query(
      'INSERT INTO Seguro (proveedor, numeroPoliza, estado) VALUES ($1, $2, $3) RETURNING *',
      [proveedor, numeroPoliza, 'activo']
    );
    
    const seguro = result.rows[0];
    
    return {
      id: seguro.idseguro,
      proveedor: seguro.proveedor,
      numeroPoliza: seguro.numeropoliza,
      estado: seguro.estado,
      fechaCreacion: seguro.fechacreacion
    };
  } catch (error) {
    console.error('Error al crear seguro:', error);
    throw error;
  }
};

/**
 * Actualiza un seguro existente
 */
const updateSeguro = async (seguroId, seguroData) => {
  try {
    const { proveedor, numeroPoliza, estado } = seguroData;
    
    // Verificar si ya existe otro seguro con ese número de póliza
    if (numeroPoliza) {
      const existente = await pool.query(
        'SELECT * FROM Seguro WHERE numeroPoliza = $1 AND idSeguro != $2',
        [numeroPoliza, seguroId]
      );
      
      if (existente.rows.length > 0) {
        throw new Error('Ya existe otro seguro con ese número de póliza');
      }
    }
    
    const result = await pool.query(
      `UPDATE Seguro 
       SET proveedor = COALESCE($1, proveedor),
           numeroPoliza = COALESCE($2, numeroPoliza),
           estado = COALESCE($3, estado)
       WHERE idSeguro = $4
       RETURNING *`,
      [proveedor, numeroPoliza, estado, seguroId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const seguro = result.rows[0];
    
    return {
      id: seguro.idseguro,
      proveedor: seguro.proveedor,
      numeroPoliza: seguro.numeropoliza,
      estado: seguro.estado,
      fechaCreacion: seguro.fechacreacion
    };
  } catch (error) {
    console.error('Error al actualizar seguro:', error);
    throw error;
  }
};

/**
 * Elimina un seguro (cambio de estado a deshabilitado)
 */
const deleteSeguro = async (seguroId) => {
  try {
    // Verificar si hay vehículos asociados a este seguro
    const vehiculos = await pool.query(
      'SELECT COUNT(*) FROM Vehiculo WHERE idSeguro = $1',
      [seguroId]
    );
    
    if (parseInt(vehiculos.rows[0].count) > 0) {
      return { 
        success: false,
        message: 'Seguro en uso'
      };
    }
    
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Seguro SET estado = $1 WHERE idSeguro = $2 RETURNING *',
      ['deshabilitado', seguroId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar seguro:', error);
    throw error;
  }
};

module.exports = {
  getAllSeguros,
  createSeguro,
  updateSeguro,
  deleteSeguro
}; 