const nodemailer = require('nodemailer');
const config = require('../config');

// Transportador de correos (se inicializará bajo demanda)
let transporter = null;

/**
 * Inicializa el transportador de nodemailer con OAuth2 (solo cuando sea necesario)
 * @returns {Object} Transportador configurado
 */
const getTransporter = () => {
  if (!transporter) {
    // Verificar si están disponibles las credenciales OAuth2
    if (process.env.GMAIL_CLIENT_ID && 
        process.env.GMAIL_CLIENT_SECRET && 
        process.env.GMAIL_REFRESH_TOKEN) {
      
      // Configurar transportador con OAuth2
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.EMAIL_USER || config.EMAIL_USER,
          clientId: process.env.GMAIL_CLIENT_ID || config.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET || config.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN || config.GMAIL_REFRESH_TOKEN
        }
      });
      
      console.log('Transportador de correo inicializado con OAuth2');
    } else {
      // Fallback a autenticación simple (para retrocompatibilidad)
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || config.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD || config.EMAIL_PASSWORD
        }
      });
      
      console.log('Transportador de correo inicializado con autenticación simple');
    }
  }
  return transporter;
};

/**
 * Envía un correo electrónico
 * @param {Object} options - Opciones del correo
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.html - Contenido HTML
 * @returns {Promise} Resultado del envío
 */
const enviarCorreo = async (options) => {
  if (!options.to || !options.subject || !options.html) {
    console.error('Faltan datos para enviar el correo:', options);
    return { success: false, error: 'Faltan datos para enviar el correo' };
  }

  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || config.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const resultado = await getTransporter().sendMail(mailOptions);
    console.log('Correo enviado exitosamente a', options.to);
    return { success: true, messageId: resultado.messageId };
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Genera una plantilla HTML para las notificaciones
 * @param {Object} datos - Datos para la plantilla
 * @param {string} datos.titulo - Título de la notificación
 * @param {string} datos.mensaje - Mensaje principal
 * @param {string} datos.tipo - Tipo de notificación (solicitud, aprobacion, rechazo)
 * @param {Object} datos.detalles - Detalles adicionales (opcional)
 */
const generarPlantilla = (datos) => {
  // Colores basados en la interfaz mostrada
  const colores = {
    primario: '#6366f1', // Color principal (morado)
    secundario: '#f97316', // Color naranja para pendientes
    exito: '#22c55e', // Color verde para aprobados
    peligro: '#ef4444', // Color rojo para rechazados
    texto: '#333333',
    fondo: '#f9fafb',
    card: '#ffffff'
  };

  // Determinar el color según el tipo de notificación
  let colorPrincipal = colores.primario;
  let iconoNotificacion = '📋';
  
  if (datos.tipo === 'aprobacion') {
    colorPrincipal = colores.exito;
    iconoNotificacion = '✅';
  } else if (datos.tipo === 'rechazo') {
    colorPrincipal = colores.peligro;
    iconoNotificacion = '❌';
  } else if (datos.tipo === 'asignacion') {
    colorPrincipal = colores.secundario;
    iconoNotificacion = '📌';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${datos.titulo}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: ${colores.fondo};
          margin: 0;
          padding: 0;
          color: ${colores.texto};
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: ${colores.card};
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
          background-color: ${colorPrincipal};
          color: white;
          padding: 20px;
          text-align: center;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        .content {
          padding: 20px;
        }
        .icon {
          font-size: 48px;
          text-align: center;
          margin: 15px 0;
        }
        .title {
          font-size: 20px;
          font-weight: bold;
          margin-bottom: 15px;
          color: ${colorPrincipal};
        }
        .message {
          margin-bottom: 20px;
        }
        .details {
          background-color: ${colores.fondo};
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        .detail-item {
          margin-bottom: 8px;
        }
        .detail-label {
          font-weight: bold;
        }
        .footer {
          text-align: center;
          padding: 15px;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #eee;
        }
        .btn {
          display: inline-block;
          background-color: ${colorPrincipal};
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin-top: 10px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">🏍️ MotoTrack</div>
          <div>Sistema de Registro y Control de Motocicletas</div>
        </div>
        <div class="content">
          <div class="icon">${iconoNotificacion}</div>
          <div class="title">${datos.titulo}</div>
          <div class="message">
            ${datos.mensaje}
          </div>
          ${datos.detalles ? `
          <div class="details">
            ${Object.entries(datos.detalles).map(([key, value]) => `
              <div class="detail-item">
                <span class="detail-label">${key}:</span> ${value}
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${datos.urlAccion ? `
          <div style="text-align: center;">
            <a href="${datos.urlAccion}" class="btn">Ver detalles</a>
          </div>
          ` : ''}
        </div>
        <div class="footer">
          <p>Este es un correo automático, por favor no responda a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} MotoTrack - Santo Domingo Este</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Envía una notificación por correo para una nueva solicitud creada
 * @param {Object} solicitud - Datos de la solicitud
 * @param {string} emailDestinatario - Correo del destinatario
 */
const notificarNuevaSolicitud = async (solicitud, emailDestinatario) => {
  if (!emailDestinatario) return { success: false, error: 'No se proporcionó un email' };
  
  const datos = {
    titulo: 'Nueva solicitud creada',
    mensaje: `Has creado una nueva solicitud de matrícula para tu motocicleta. Te notificaremos cuando sea procesada.`,
    tipo: 'solicitud',
    detalles: {
      'ID Solicitud': solicitud.idSolicitud || solicitud.solicitud?.idSolicitud,
      'Estado': 'Pendiente',
      'Fecha': new Date().toLocaleDateString()
    }
  };
  
  return await enviarCorreo({
    to: emailDestinatario,
    subject: 'MotoTrack: Nueva solicitud creada',
    html: generarPlantilla(datos)
  });
};

/**
 * Envía una notificación por correo cuando una solicitud es asignada a un empleado
 * @param {Object} solicitud - Datos de la solicitud
 * @param {string} emailEmpleado - Correo del empleado
 */
const notificarAsignacionSolicitud = async (solicitud, emailEmpleado) => {
  if (!emailEmpleado) return { success: false, error: 'No se proporcionó un email' };
  
  const idSolicitud = solicitud.idSolicitud || solicitud.solicitud?.idSolicitud;
  const datos = {
    titulo: 'Nueva solicitud asignada',
    mensaje: `Se te ha asignado una nueva solicitud de matrícula para revisión.`,
    tipo: 'asignacion',
    detalles: {
      'ID Solicitud': idSolicitud,
      'Fecha de asignación': new Date().toLocaleDateString()
    }
  };
  
  return await enviarCorreo({
    to: emailEmpleado,
    subject: `MotoTrack: Solicitud #${idSolicitud} asignada`,
    html: generarPlantilla(datos)
  });
};

/**
 * Envía una notificación por correo cuando una solicitud es procesada
 * @param {Object} solicitud - Datos de la solicitud procesada
 * @param {string} emailDestinatario - Correo del ciudadano
 */
const notificarSolicitudProcesada = async (solicitud, emailDestinatario) => {
  if (!emailDestinatario) return { success: false, error: 'No se proporcionó un email' };
  
  const idSolicitud = solicitud.idSolicitud || solicitud.solicitud?.idSolicitud;
  const esAprobada = solicitud.estadoDecision === 'Aprobada' || 
                     solicitud.solicitud?.estadoDecision === 'Aprobada';
  
  const datos = {
    titulo: esAprobada ? '¡Solicitud aprobada!' : 'Solicitud rechazada',
    mensaje: esAprobada 
      ? `Tu solicitud de matrícula ha sido aprobada. Ya puedes descargar tu carnet desde el panel.`
      : `Tu solicitud de matrícula ha sido rechazada.`,
    tipo: esAprobada ? 'aprobacion' : 'rechazo',
    detalles: {
      'ID Solicitud': idSolicitud,
      'Estado': esAprobada ? 'Aprobada' : 'Rechazada',
      'Fecha': new Date().toLocaleDateString()
    }
  };
  
  // Agregar información adicional según el estado
  if (esAprobada) {
    // Obtener el número de matrícula si está disponible
    const matricula = solicitud.matricula?.matriculaGenerada || 
                     solicitud.matriculaGenerada ||
                     'No disponible';
    datos.detalles['Matrícula'] = matricula;
    
    if (solicitud.solicitud?.notaRevision || solicitud.notaRevision) {
      datos.detalles['Nota'] = solicitud.solicitud?.notaRevision || solicitud.notaRevision;
    }
  } else {
    // Agregar motivo de rechazo
    if (solicitud.solicitud?.motivoRechazo || solicitud.motivoRechazo) {
      datos.detalles['Motivo'] = solicitud.solicitud?.motivoRechazo || solicitud.motivoRechazo;
    }
    
    if (solicitud.solicitud?.detalleRechazo || solicitud.detalleRechazo) {
      datos.detalles['Detalle'] = solicitud.solicitud?.detalleRechazo || solicitud.detalleRechazo;
    }
  }
  
  return await enviarCorreo({
    to: emailDestinatario,
    subject: `MotoTrack: Solicitud #${idSolicitud} ${esAprobada ? 'aprobada' : 'rechazada'}`,
    html: generarPlantilla(datos)
  });
};

module.exports = {
  enviarCorreo,
  generarPlantilla,
  notificarNuevaSolicitud,
  notificarAsignacionSolicitud,
  notificarSolicitudProcesada
}; 