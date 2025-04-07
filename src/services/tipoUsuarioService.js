const { pool } = require('../db');

/**
 * Obtiene todos los tipos de usuario
 */
const getAllTiposUsuario = async () => {
  try {
    const result = await pool.query(
      'SELECT * FROM TipoUsuario ORDER BY idTipoUsuario ASC'
    );
    
    return result.rows.map(tipo => ({
      id: tipo.idtipousuario,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
      permisos: {
        crear: tipo.podercrear,
        editar: tipo.podereditar,
        eliminar: tipo.podereliminar
      }
    }));
  } catch (error) {
    console.error('Error al obtener tipos de usuario:', error);
    throw error;
  }
};

/**
 * Crea un nuevo tipo de usuario
 */
const createTipoUsuario = async (tipoData) => {
  try {
    const { nombre, descripcion, poderCrear, poderEditar, poderEliminar } = tipoData;
    
    const result = await pool.query(
      `INSERT INTO TipoUsuario 
       (nombre, descripcion, poderCrear, poderEditar, poderEliminar) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [nombre, descripcion, poderCrear, poderEditar, poderEliminar]
    );
    
    const tipo = result.rows[0];
    
    return {
      id: tipo.idtipousuario,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
      permisos: {
        crear: tipo.podercrear,
        editar: tipo.podereditar,
        eliminar: tipo.podereliminar
      }
    };
  } catch (error) {
    console.error('Error al crear tipo de usuario:', error);
    throw error;
  }
};

/**
 * Actualiza un tipo de usuario existente
 */
const updateTipoUsuario = async (tipoId, tipoData) => {
  try {
    const { nombre, descripcion, poderCrear, poderEditar, poderEliminar } = tipoData;
    
    const result = await pool.query(
      `UPDATE TipoUsuario 
       SET nombre = COALESCE($1, nombre), 
           descripcion = COALESCE($2, descripcion),
           poderCrear = COALESCE($3, poderCrear),
           poderEditar = COALESCE($4, poderEditar),
           poderEliminar = COALESCE($5, poderEliminar)
       WHERE idTipoUsuario = $6
       RETURNING *`,
      [nombre, descripcion, poderCrear, poderEditar, poderEliminar, tipoId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tipo = result.rows[0];
    
    return {
      id: tipo.idtipousuario,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion,
      permisos: {
        crear: tipo.podercrear,
        editar: tipo.podereditar,
        eliminar: tipo.podereliminar
      }
    };
  } catch (error) {
    console.error('Error al actualizar tipo de usuario:', error);
    throw error;
  }
};

/**
 * Elimina un tipo de usuario
 */
const deleteTipoUsuario = async (tipoId) => {
  try {
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE TipoUsuario SET estado = $1 WHERE idTipoUsuario = $2 RETURNING *',
      ['deshabilitado', tipoId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar tipo de usuario:', error);
    throw error;
  }
};

module.exports = {
  getAllTiposUsuario,
  createTipoUsuario,
  updateTipoUsuario,
  deleteTipoUsuario
}; 