/**
 * Módulo auxiliar para integrar notificaciones por correo 
 * en los flujos existentes sin modificar su funcionamiento
 */

const emailService = require('../services/emailService');
const { pool } = require('../db');

// Obtiene el correo electrónico de un usuario

const obtenerEmailUsuario = async (idUsuario) => {
  if (!idUsuario) return null;
  
  try {
    const result = await pool.query(
      'SELECT correo FROM Usuario WHERE idUsuario = $1',
      [idUsuario]
    );
    
    return result.rows.length > 0 ? result.rows[0].correo : null;
  } catch (error) {
    console.error(`Error al obtener email del usuario ${idUsuario}:`, error);
    return null;
  }
};

// Intenta enviar una notificación por correo cuando se crea una solicitud

const notificarCreacionSolicitud = async (solicitud, idUsuario) => {
  if (!solicitud || !idUsuario) return;
  
  try {
    const email = await obtenerEmailUsuario(idUsuario);
    if (!email) {
      return;
    }
    
    await emailService.notificarNuevaSolicitud(solicitud, email);
  } catch (error) {
    // No interrumpir el flujo principal si falla
    console.error('Error al enviar notificación de creación:', error);
  }
};

// Intenta enviar una notificación por correo cuando se asigna una solicitud

const notificarAsignacionSolicitud = async (solicitud, idUsuarioEmpleado) => {
  if (!solicitud || !idUsuarioEmpleado) return;
  
  try {
    const email = await obtenerEmailUsuario(idUsuarioEmpleado);
    if (!email) {
      return;
    }
    
    await emailService.notificarAsignacionSolicitud(solicitud, email);
  } catch (error) {
    console.error('Error al enviar notificación de asignación:', error);
  }
};

// Obtiene los datos completos de un usuario para la notificación

const obtenerDatosUsuario = async (idUsuario) => {
  if (!idUsuario) return null;
  
  try {
    const result = await pool.query(
      'SELECT u.idUsuario, u.correo, u.nombres, u.apellidos FROM Usuario u WHERE u.idUsuario = $1',
      [idUsuario]
    );
    
    if (result.rows.length === 0) return null;
    
    const usuario = result.rows[0];
    return {
      idUsuario: usuario.idusuario,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      email: usuario.correo // Usar clave 'email' para compatibilidad con la función actual
    };
  } catch (error) {
    console.error(`Error al obtener datos del usuario ${idUsuario}:`, error);
    return null;
  }
};

// Notifica al ciudadano sobre el procesamiento de su solicitud (aprobada o rechazada)  

const notificarSolicitudProcesada = async (solicitud, idUsuario) => {
  try {
    // Obtener datos del usuario
    const usuario = await obtenerDatosUsuario(idUsuario);
    if (!usuario || !usuario.email) {
      return null;
    }

    // Enviar la notificación utilizando el servicio de email
    return await emailService.notificarSolicitudProcesada(solicitud, usuario.email);
  } catch (error) {
    console.error('Error al enviar notificación de procesamiento:', error);
    return null;
  }
};

// Obtiene el ID de usuario asociado a una persona

const obtenerIdUsuarioDePersona = async (idPersona) => {
  if (!idPersona) return null;
  
  try {
    const result = await pool.query(
      'SELECT idUsuario FROM Persona WHERE idPersona = $1',
      [idPersona]
    );
    
    return result.rows.length > 0 ? result.rows[0].idusuario : null;
  } catch (error) {
    console.error(`Error al obtener ID de usuario para persona ${idPersona}:`, error);
    return null;
  }
};

module.exports = {
  notificarCreacionSolicitud,
  notificarAsignacionSolicitud,
  notificarSolicitudProcesada,
  obtenerIdUsuarioDePersona
}; 