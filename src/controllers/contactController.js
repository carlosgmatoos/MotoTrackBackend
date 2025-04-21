const { enviarCorreoContacto } = require('../services/emailService');

const enviarMensajeContacto = async (req, res) => {
  try {
    const { nombre, correo, asunto, mensaje } = req.body;
    
    // Validar campos requeridos
    if (!nombre || !correo || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Por favor complete todos los campos requeridos'
      });
    }
    
    // Validar formato de correo electrónico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo)) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido',
        message: 'El formato del correo electrónico es inválido'
      });
    }
    
    // Enviar el correo
    const resultado = await enviarCorreoContacto({
      nombre,
      correo,
      asunto: asunto || 'Mensaje de contacto desde MotoTrack',
      mensaje
    });
    
    if (resultado.success) {
      return res.status(200).json({
        success: true,
        message: 'Mensaje enviado correctamente'
      });
    } else {
      throw new Error(resultado.error || 'Error al enviar el mensaje');
    }
  } catch (error) {
    console.error('Error al enviar mensaje de contacto:', error);
    return res.status(500).json({
      success: false,
      error: 'Error del servidor',
      message: error.message || 'Ha ocurrido un error al enviar el mensaje'
    });
  }
};

module.exports = {
  enviarMensajeContacto
}; 