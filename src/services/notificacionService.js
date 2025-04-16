const { pool } = require('../db');

/**
 * Crear una nueva notificación para un usuario
 */
const crearNotificacion = async ({ idUsuario, titulo, mensaje }) => {
  if (!idUsuario || !titulo || !mensaje) {
    console.error('Datos de notificación incompletos:', { idUsuario, titulo, mensaje });
    return null;
  }
  
  try {
    const result = await pool.query(
      `INSERT INTO Notificaciones 
       (mensaje, titulo, estado, fechaCreacion, idUsuario) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4) 
       RETURNING *`,
      [mensaje, titulo, 'Pendiente', idUsuario]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al crear notificación:', error);
    return null;
  }
};

/**
 * Obtener todas las notificaciones de un usuario
 */
const obtenerNotificacionesPorUsuario = async (idUsuario) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Notificaciones WHERE idUsuario = $1 ORDER BY fechaCreacion DESC',
      [idUsuario]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    throw error;
  }
};

/**
 * Marcar una notificación como leída
 */
const marcarNotificacionComoLeida = async (idNotificacion) => {
  try {
    const result = await pool.query(
      'UPDATE Notificaciones SET estado = $1 WHERE idNotificacion = $2 RETURNING *',
      ['Leida', idNotificacion]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    throw error;
  }
};

/**
 * Eliminar una notificación
 */
const eliminarNotificacion = async (idNotificacion) => {
  try {
    await pool.query(
      'DELETE FROM Notificaciones WHERE idNotificacion = $1',
      [idNotificacion]
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    throw error;
  }
};

module.exports = {
  crearNotificacion,
  obtenerNotificacionesPorUsuario,
  marcarNotificacionComoLeida,
  eliminarNotificacion
}; 