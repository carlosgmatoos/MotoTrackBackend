const { pool } = require('../db');

const getAllTiposPersona = async () => {
  const query = `
    SELECT * FROM TipoPersona
    WHERE estado != 'deshabilitado'
    ORDER BY idTipoPersona
  `;
  const result = await pool.query(query);
  return result.rows;
};

const createTipoPersona = async (tipoData) => {
  const { nombre, estado = 'activo' } = tipoData;
  
  const query = `
    INSERT INTO TipoPersona (nombre, estado)
    VALUES ($1, $2)
    RETURNING *
  `;
  
  const result = await pool.query(query, [nombre, estado]);
  return result.rows[0];
};

const updateTipoPersona = async (id, tipoData) => {
  const { nombre, estado } = tipoData;
  
  // Verificar que el tipo de persona existe
  const checkQuery = `
    SELECT * FROM TipoPersona
    WHERE idTipoPersona = $1 AND estado != 'deshabilitado'
  `;
  const checkResult = await pool.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    throw new Error('Tipo de persona no encontrado');
  }
  
  let updateFields = [];
  let queryParams = [];
  let paramCount = 1;
  
  if (nombre) {
    updateFields.push(`nombre = $${paramCount}`);
    queryParams.push(nombre);
    paramCount++;
  }
  
  if (estado) {
    updateFields.push(`estado = $${paramCount}`);
    queryParams.push(estado);
    paramCount++;
  }
  
  if (updateFields.length === 0) {
    throw new Error('No se proporcionaron campos para actualizar');
  }
  
  queryParams.push(id);
  
  const query = `
    UPDATE TipoPersona
    SET ${updateFields.join(', ')}
    WHERE idTipoPersona = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, queryParams);
  return result.rows[0];
};

const deleteTipoPersona = async (id) => {
  // Marcar como deshabilitado en lugar de eliminar
  const query = `
    UPDATE TipoPersona
    SET estado = 'deshabilitado'
    WHERE idTipoPersona = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    throw new Error('Tipo de persona no encontrado');
  }
  
  return result.rows[0];
};

const getTipoPersonaByNombre = async (nombre) => {
  try {
    const query = `
      SELECT * FROM TipoPersona
      WHERE nombre = $1 AND estado = 'activo'
    `;
    
    const result = await pool.query(query, [nombre]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error al obtener tipo de persona por nombre "${nombre}":`, error);
    throw error;
  }
};

module.exports = {
  getAllTiposPersona,
  createTipoPersona,
  updateTipoPersona,
  deleteTipoPersona,
  getTipoPersonaByNombre
}; 