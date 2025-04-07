const { pool } = require('../db');

/**
 * Obtiene todos los modelos con filtros opcionales
 */
const getAllModelos = async (filters = {}) => {
  try {
    let query = `
      SELECT m.*, marca.nombre as nombreMarca
      FROM Modelo m
      LEFT JOIN Marca marca ON m.idMarca = marca.idMarca
      WHERE 1=1`;
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idModelo) {
      query += ` AND m.idModelo = $${paramCounter}`;
      queryParams.push(filters.idModelo);
      paramCounter++;
    }
    
    if (filters.nombre) {
      query += ` AND m.nombre ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombre}%`);
      paramCounter++;
    }
    
    if (filters.año) {
      query += ` AND m.año = $${paramCounter}`;
      queryParams.push(filters.año);
      paramCounter++;
    }
    
    if (filters.color) {
      query += ` AND m.color ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.color}%`);
      paramCounter++;
    }
    
    if (filters.cilindraje) {
      query += ` AND m.cilindraje ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.cilindraje}%`);
      paramCounter++;
    }
    
    if (filters.idMarca) {
      query += ` AND m.idMarca = $${paramCounter}`;
      queryParams.push(filters.idMarca);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND m.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY m.idModelo ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(modelo => ({
      id: modelo.idmodelo,
      nombre: modelo.nombre,
      año: modelo.año,
      color: modelo.color,
      cilindraje: modelo.cilindraje,
      idMarca: modelo.idmarca,
      nombreMarca: modelo.nombremarca,
      estado: modelo.estado,
      fechaCreacion: modelo.fechacreacion
    }));
  } catch (error) {
    console.error('Error al obtener modelos:', error);
    throw error;
  }
};

/**
 * Crea un nuevo modelo
 */
const createModelo = async (modeloData) => {
  try {
    const { nombre, año, color, cilindraje, idMarca } = modeloData;
    
    // Verificar que la marca existe
    const marcaResult = await pool.query(
      'SELECT * FROM Marca WHERE idMarca = $1',
      [idMarca]
    );
    
    if (marcaResult.rows.length === 0) {
      throw new Error('La marca especificada no existe');
    }
    
    const result = await pool.query(
      `INSERT INTO Modelo (nombre, año, color, cilindraje, estado, idMarca) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, año, color, cilindraje, 'activo', idMarca]
    );
    
    const modelo = result.rows[0];
    
    // Obtener el nombre de la marca
    const marca = await pool.query(
      'SELECT nombre FROM Marca WHERE idMarca = $1',
      [idMarca]
    );
    
    return {
      id: modelo.idmodelo,
      nombre: modelo.nombre,
      año: modelo.año,
      color: modelo.color,
      cilindraje: modelo.cilindraje,
      idMarca: modelo.idmarca,
      nombreMarca: marca.rows[0].nombre,
      estado: modelo.estado,
      fechaCreacion: modelo.fechacreacion
    };
  } catch (error) {
    console.error('Error al crear modelo:', error);
    throw error;
  }
};

/**
 * Actualiza un modelo existente
 */
const updateModelo = async (modeloId, modeloData) => {
  try {
    const { nombre, año, color, cilindraje, idMarca, estado } = modeloData;
    
    // Si se proporciona una marca, verificar que existe
    if (idMarca) {
      const marcaResult = await pool.query(
        'SELECT * FROM Marca WHERE idMarca = $1',
        [idMarca]
      );
      
      if (marcaResult.rows.length === 0) {
        throw new Error('La marca especificada no existe');
      }
    }
    
    const result = await pool.query(
      `UPDATE Modelo 
       SET nombre = COALESCE($1, nombre),
           año = COALESCE($2, año),
           color = COALESCE($3, color),
           cilindraje = COALESCE($4, cilindraje),
           idMarca = COALESCE($5, idMarca),
           estado = COALESCE($6, estado)
       WHERE idModelo = $7
       RETURNING *`,
      [nombre, año, color, cilindraje, idMarca, estado, modeloId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const modelo = result.rows[0];
    
    // Obtener el nombre de la marca
    const marca = await pool.query(
      'SELECT nombre FROM Marca WHERE idMarca = $1',
      [modelo.idmarca]
    );
    
    return {
      id: modelo.idmodelo,
      nombre: modelo.nombre,
      año: modelo.año,
      color: modelo.color,
      cilindraje: modelo.cilindraje,
      idMarca: modelo.idmarca,
      nombreMarca: marca.rows[0].nombre,
      estado: modelo.estado,
      fechaCreacion: modelo.fechacreacion
    };
  } catch (error) {
    console.error('Error al actualizar modelo:', error);
    throw error;
  }
};

/**
 * Elimina un modelo (cambio de estado a deshabilitado)
 */
const deleteModelo = async (modeloId) => {
  try {
    // Verificar si hay vehículos asociados a este modelo
    const vehiculos = await pool.query(
      'SELECT COUNT(*) FROM Vehiculo WHERE idModelo = $1',
      [modeloId]
    );
    
    if (parseInt(vehiculos.rows[0].count) > 0) {
      return { 
        success: false,
        message: 'Modelo en uso'
      };
    }
    
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Modelo SET estado = $1 WHERE idModelo = $2 RETURNING *',
      ['deshabilitado', modeloId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows [0] : null
    };
  } catch (error) {
    console.error('Error al eliminar modelo:', error);
    throw error;
  }
};

module.exports = {
  getAllModelos,
  createModelo,
  updateModelo,
  deleteModelo
};