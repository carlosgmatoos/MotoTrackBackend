const { pool } = require('../db');

/**
 * Obtiene todos los tipos de vehículo con filtros opcionales
 */
const getAllTiposVehiculo = async (filters = {}) => {
  try {
    let query = 'SELECT * FROM TipoVehiculo WHERE 1=1';
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idTipoVehiculo) {
      query += ` AND idTipoVehiculo = $${paramCounter}`;
      queryParams.push(filters.idTipoVehiculo);
      paramCounter++;
    }
    
    if (filters.nombre) {
      query += ` AND nombre ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombre}%`);
      paramCounter++;
    }
    
    if (filters.capacidad) {
      query += ` AND capacidad = $${paramCounter}`;
      queryParams.push(filters.capacidad);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY idTipoVehiculo ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(tipo => ({
      id: tipo.idtipovehiculo,
      nombre: tipo.nombre,
      capacidad: tipo.capacidad,
      estado: tipo.estado,
      fechaCreacion: tipo.fechacreacion
    }));
  } catch (error) {
    console.error('Error al obtener tipos de vehículo:', error);
    throw error;
  }
};

/**
 * Crea un nuevo tipo de vehículo
 */
const createTipoVehiculo = async (tipoVehiculoData) => {
  try {
    const { nombre, capacidad } = tipoVehiculoData;
    
    const result = await pool.query(
      'INSERT INTO TipoVehiculo (nombre, capacidad, estado) VALUES ($1, $2, $3) RETURNING *',
      [nombre, capacidad, 'activo']
    );
    
    const tipoVehiculo = result.rows[0];
    
    return {
      id: tipoVehiculo.idtipovehiculo,
      nombre: tipoVehiculo.nombre,
      capacidad: tipoVehiculo.capacidad,
      estado: tipoVehiculo.estado,
      fechaCreacion: tipoVehiculo.fechacreacion
    };
  } catch (error) {
    console.error('Error al crear tipo de vehículo:', error);
    throw error;
  }
};

/**
 * Actualiza un tipo de vehículo existente
 */
const updateTipoVehiculo = async (tipoVehiculoId, tipoVehiculoData) => {
  try {
    const { nombre, capacidad, estado } = tipoVehiculoData;
    
    const result = await pool.query(
      `UPDATE TipoVehiculo 
       SET nombre = COALESCE($1, nombre),
           capacidad = COALESCE($2, capacidad),
           estado = COALESCE($3, estado)
       WHERE idTipoVehiculo = $4
       RETURNING *`,
      [nombre, capacidad, estado, tipoVehiculoId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tipoVehiculo = result.rows[0];
    
    return {
      id: tipoVehiculo.idtipovehiculo,
      nombre: tipoVehiculo.nombre,
      capacidad: tipoVehiculo.capacidad,
      estado: tipoVehiculo.estado,
      fechaCreacion: tipoVehiculo.fechacreacion
    };
  } catch (error) {
    console.error('Error al actualizar tipo de vehículo:', error);
    throw error;
  }
};

/**
 * Elimina un tipo de vehículo (cambio de estado a deshabilitado)
 */
const deleteTipoVehiculo = async (tipoVehiculoId) => {
  try {
    // Verificar si hay vehículos asociados a este tipo
    const vehiculos = await pool.query(
      'SELECT COUNT(*) FROM Vehiculo WHERE idTipoVehiculo = $1',
      [tipoVehiculoId]
    );
    
    if (parseInt(vehiculos.rows[0].count) > 0) {
      return { 
        success: false,
        message: 'Tipo de vehículo en uso'
      };
    }
    
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE TipoVehiculo SET estado = $1 WHERE idTipoVehiculo = $2 RETURNING *',
      ['deshabilitado', tipoVehiculoId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar tipo de vehículo:', error);
    throw error;
  }
};

module.exports = {
  getAllTiposVehiculo,
  createTipoVehiculo,
  updateTipoVehiculo,
  deleteTipoVehiculo
}; 