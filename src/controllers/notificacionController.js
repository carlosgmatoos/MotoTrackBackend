const notificacionService = require('../services/notificacionService');
const { handleError } = require('../utils/errorHandler');

/**
 * Obtener las notificaciones del usuario autenticado
 */
const obtenerMisNotificaciones = async (req, res) => {
  try {
    const idUsuario = req.user.idUsuario;
    
    if (!idUsuario) {
      return res.status(400).json({
        success: false,
        error: 'Usuario no identificado',
        message: 'No se pudo identificar al usuario actual'
      });
    }
    
    const notificaciones = await notificacionService.obtenerNotificacionesPorUsuario(idUsuario);
    
    res.status(200).json({
      success: true,
      count: notificaciones.length,
      data: notificaciones
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener notificaciones');
  }
};

/**
 * Marcar una notificación como leída
 */
const marcarComoLeida = async (req, res) => {
  try {
    const { idNotificacion } = req.body;
    
    if (!idNotificacion) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la notificación es requerido'
      });
    }
    
    const notificacion = await notificacionService.marcarNotificacionComoLeida(idNotificacion);
    
    if (!notificacion) {
      return res.status(404).json({
        success: false,
        error: 'Notificación no encontrada',
        message: `No se encontró la notificación con ID ${idNotificacion}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notificación marcada como leída exitosamente',
      data: notificacion
    });
  } catch (error) {
    handleError(res, error, 'Error al marcar notificación como leída');
  }
};

/**
 * Eliminar una notificación
 */
const eliminarNotificacion = async (req, res) => {
  try {
    const { idNotificacion } = req.body;
    
    if (!idNotificacion) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la notificación es requerido'
      });
    }
    
    const resultado = await notificacionService.eliminarNotificacion(idNotificacion);
    
    res.status(200).json({
      success: true,
      message: 'Notificación eliminada exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar notificación');
  }
};

module.exports = {
  obtenerMisNotificaciones,
  marcarComoLeida,
  eliminarNotificacion
}; 