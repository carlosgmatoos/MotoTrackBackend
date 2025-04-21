const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

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

// Envía un correo electrónico

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
 * @param {string} datos.tipo - Tipo de notificación (solicitud, aprobacion, rechazo, asignacion)
 * @param {Object} datos.detalles - Detalles adicionales (opcional)
 */
const generarPlantilla = (datos) => {
  // Paleta de colores sofisticada
  const colores = {
    // Colores principales
    brand: '#5046e5',       // Morado oscuro como color principal de la marca
    accent: '#06b6d4',      // Cyan como acento
    success: '#10b981',     // Verde esmeralda para éxito
    warning: '#f59e0b',     // Ámbar para advertencias/pendientes
    danger: '#ef4444',      // Rojo para errores/rechazos
    
    // Tonos neutros
    dark: '#1e293b',        // Azul grisáceo oscuro para texto principal
    medium: '#64748b',      // Gris azulado para texto secundario
    light: '#e2e8f0',       // Gris claro para bordes y separadores
    muted: '#94a3b8',       // Gris azulado claro para texto terciario
    
    // Fondos
    bgLight: '#f8fafc',     // Casi blanco para fondos claros
    bgDark: '#0f172a',      // Azul muy oscuro para fondos oscuros
    white: '#ffffff',       // Blanco puro
    bgSuccess: '#f0fdf4',   // Verde muy claro para fondos de éxito
    bgWarning: '#fffbeb',   // Ámbar muy claro para fondos de advertencia
    bgDanger: '#fef2f2',    // Rojo muy claro para fondos de error
  };

  // Seleccionar colores basados en el tipo de notificación
  let mainColor, bgColor, iconColor, cardBgColor, cardBorderColor, icon;
  
  switch (datos.tipo) {
    case 'aprobacion':
      mainColor = colores.success;
      bgColor = colores.bgSuccess;
      iconColor = colores.success;
      cardBgColor = colores.bgSuccess;
      cardBorderColor = `${colores.success}33`; // 20% opacidad
      icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      break;
    case 'rechazo':
      mainColor = colores.danger;
      bgColor = colores.bgDanger;
      iconColor = colores.danger;
      cardBgColor = colores.bgDanger;
      cardBorderColor = `${colores.danger}33`; // 20% opacidad
      icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      break;
    case 'asignacion':
      mainColor = colores.warning;
      bgColor = colores.bgWarning;
      iconColor = colores.warning;
      cardBgColor = colores.bgWarning;
      cardBorderColor = `${colores.warning}33`; // 20% opacidad
      icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      break;
    default: // solicitud y otros
      mainColor = colores.brand;
      bgColor = colores.bgLight;
      iconColor = colores.brand;
      cardBgColor = colores.bgLight;
      cardBorderColor = `${colores.brand}33`; // 20% opacidad
      icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${datos.titulo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #f1f5f9;
          margin: 0;
          padding: 0;
          color: ${colores.dark};
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .container {
          max-width: 620px;
          margin: 40px auto;
          background-color: ${colores.white};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
        }
        
        .header {
          background: linear-gradient(135deg, ${colores.brand}, ${colores.accent});
          padding: 38px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
          opacity: 0.6;
        }
        
        .logo {
          position: relative;
          color: white;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .logo::after {
          content: '';
          display: block;
          width: 40px;
          height: 3px;
          background-color: ${colores.accent};
          margin: 6px auto 10px;
          border-radius: 3px;
        }
        
        .tagline {
          position: relative;
          color: rgba(255, 255, 255, 0.92);
          font-size: 16px;
          font-weight: 500;
        }
        
        .content {
          padding: 40px 35px;
        }
        
        .status-badge {
          display: inline-flex;
          align-items: center;
          background-color: ${bgColor};
          color: ${mainColor};
          padding: 8px 14px;
          border-radius: 50px;
          margin-bottom: 25px;
          font-weight: 600;
          font-size: 15px;
          line-height: 1;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
        }
        
        .status-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${iconColor};
          margin-right: 8px;
        }
        
        .title {
          font-size: 28px;
          font-weight: 700;
          color: ${colores.dark};
          margin-bottom: 16px;
          line-height: 1.3;
        }
        
        .message {
          color: ${colores.medium};
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 30px;
        }
        
        .details-card {
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid ${cardBorderColor};
          margin-bottom: 35px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
        }
        
        .card-header {
          background-color: ${cardBgColor};
          padding: 16px 20px;
          border-bottom: 1px solid ${cardBorderColor};
        }
        
        .card-title {
          font-weight: 600;
          color: ${mainColor};
          font-size: 16px;
          display: flex;
          align-items: center;
        }
        
        .card-title-icon {
          margin-right: 8px;
          opacity: 0.9;
        }
        
        .detail-item {
          display: flex;
          border-bottom: 1px solid ${colores.light};
        }
        
        .detail-item:last-child {
          border-bottom: none;
        }
        
        .detail-label {
          width: 38%;
          padding: 14px 16px;
          font-weight: 500;
          color: ${colores.muted};
          font-size: 14px;
          background-color: ${colores.bgLight};
        }
        
        .detail-value {
          width: 62%;
          padding: 14px 16px;
          font-size: 14px;
          color: ${colores.dark};
        }
        
        .action-button {
          display: block;
          text-align: center;
          margin: 30px auto 5px;
          width: fit-content;
        }
        
        .button {
          display: inline-block;
          background: linear-gradient(to right, ${mainColor}, ${mainColor}dd);
          color: white;
          padding: 12px 28px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          text-decoration: none;
          box-shadow: 0 4px 12px ${mainColor}40;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .button:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px ${mainColor}60;
        }
        
        .footer {
          background-color: ${colores.bgLight};
          border-top: 1px solid ${colores.light};
          padding: 24px 20px;
          text-align: center;
          color: ${colores.muted};
          font-size: 13px;
        }
        
        .separator {
          display: inline-block;
          margin: 0 6px;
          opacity: 0.5;
        }
        
        @media (max-width: 640px) {
          .container {
            margin: 20px auto;
            border-radius: 12px;
          }
          
          .content {
            padding: 30px 20px;
          }
          
          .header {
            padding: 30px 15px;
          }
          
          .title {
            font-size: 24px;
          }
          
          .detail-label, .detail-value {
            padding: 12px 14px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MotoTrack</div>
          <div class="tagline">Sistema de Registro y Control de Motocicletas</div>
        </div>
        
        <div class="content">
          <div class="status-badge">
            <span class="status-icon">${icon}</span>
            <span>${datos.tipo === 'aprobacion' ? '¡Solicitud aprobada!' : 
                    datos.tipo === 'rechazo' ? 'Solicitud no aprobada' : 
                    datos.tipo === 'asignacion' ? 'Nueva asignación' : 'Nueva solicitud'}</span>
          </div>
          
          <h1 class="title">${datos.titulo}</h1>
          <div class="message">${datos.mensaje}</div>
          
          ${datos.detalles ? `
          <div class="details-card">
            <div class="card-header">
              <div class="card-title">
                <span class="card-title-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                </span>
                Detalles de la solicitud
              </div>
            </div>
            ${Object.entries(datos.detalles).map(([key, value]) => `
              <div class="detail-item">
                <div class="detail-label">${key}</div>
                <div class="detail-value">${value}</div>
              </div>
            `).join('')}
          </div>
          ` : ''}
          
          ${datos.urlAccion ? `
          <div class="action-button">
            <a href="${datos.urlAccion}" class="button">${datos.textoBoton || 'Ver detalles'}</a>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          Este es un correo automático, por favor no responda a este mensaje.
          <br>
          <span>&copy; ${new Date().getFullYear()} MotoTrack</span>
          <span class="separator">•</span>
          <span>Santo Domingo Este</span>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Envía una notificación por correo para una nueva solicitud creada

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

// Envía una notificación por correo cuando una solicitud es asignada a un empleado

const notificarAsignacionSolicitud = async (solicitud, emailEmpleado) => {
  if (!emailEmpleado) return { success: false, error: 'No se proporcionó un email' };
  
  const idSolicitud = solicitud.idSolicitud || solicitud.solicitud?.idSolicitud;
  
  // Obtener información adicional de la solicitud para enriquecer la notificación
  const marca = solicitud.vehiculo?.marca?.nombre || solicitud.marca || 'No disponible';
  const modelo = solicitud.vehiculo?.modelo?.nombre || solicitud.modelo || 'No disponible';
  const chasis = solicitud.vehiculo?.chasis || solicitud.chasis || 'No disponible';
  const propietario = solicitud.ciudadano?.nombres 
    ? `${solicitud.ciudadano.nombres} ${solicitud.ciudadano.apellidos}`
    : (solicitud.nombreCiudadano || 'No disponible');
  
  const datos = {
    titulo: 'Nueva solicitud asignada para revisión',
    mensaje: `Se te ha asignado una nueva solicitud de matrícula que requiere tu revisión. Por favor, verifica los documentos adjuntos y procesa la solicitud lo antes posible.`,
    tipo: 'asignacion',
    detalles: {
      'ID Solicitud': idSolicitud,
      'Marca': marca,
      'Modelo': modelo,
      'Chasis': chasis,
      'Propietario': propietario,
      'Fecha de asignación': new Date().toLocaleDateString('es-DO', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      })
    },
    urlAccion: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/solicitudes/${idSolicitud}` : null
  };
  
  return await enviarCorreo({
    to: emailEmpleado,
    subject: `MotoTrack: Solicitud #${idSolicitud} asignada para revisión`,
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
  
  // Extraer datos adicionales para enriquecer la notificación
  const marca = solicitud.vehiculo?.marca?.nombre || solicitud.marca || 'No disponible';
  const modelo = solicitud.vehiculo?.modelo?.nombre || solicitud.modelo || 'No disponible';
  const chasis = solicitud.vehiculo?.chasis || solicitud.chasis || 'No disponible';
  
  const datos = {
    titulo: esAprobada ? '¡Solicitud aprobada con éxito!' : 'Solicitud no aprobada',
    mensaje: esAprobada 
      ? `Tu solicitud de matrícula para tu motocicleta ${marca} ${modelo} ha sido revisada y aprobada. Ya puedes acceder a tu panel de control para descargar tu carnet digital y ver los detalles de tu registro.`
      : `Lamentablemente, tu solicitud de matrícula para tu motocicleta ${marca} ${modelo} no ha sido aprobada. Por favor, revisa los motivos detallados a continuación.`,
    tipo: esAprobada ? 'aprobacion' : 'rechazo',
    detalles: {
      'ID Solicitud': idSolicitud,
      'Marca': marca,
      'Modelo': modelo,
      'Chasis': chasis,
      'Estado': esAprobada ? 'Aprobada' : 'Rechazada',
      'Fecha de proceso': new Date().toLocaleDateString('es-DO', {
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      })
    },
    urlAccion: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/mis-solicitudes/${idSolicitud}` : null
  };
  
  // Obtener el número de matrícula si está disponible y la solicitud fue aprobada
  if (esAprobada) {
    const matricula = solicitud.matricula?.matriculaGenerada || 
                     solicitud.matriculaGenerada ||
                     'No disponible';
    datos.detalles['Matrícula asignada'] = matricula;
    
    if (solicitud.solicitud?.notaRevision || solicitud.notaRevision) {
      datos.detalles['Nota de aprobación'] = solicitud.solicitud?.notaRevision || solicitud.notaRevision;
    }
    
    // Cambiar el texto del botón para descargar el carnet
    if (datos.urlAccion) {
      datos.textoBoton = "Ver mi matrícula";
    }
  } else {
    // Agregar motivo de rechazo
    if (solicitud.solicitud?.motivoRechazo || solicitud.motivoRechazo) {
      datos.detalles['Motivo'] = solicitud.solicitud?.motivoRechazo || solicitud.motivoRechazo;
    }
    
    if (solicitud.solicitud?.detalleRechazo || solicitud.detalleRechazo) {
      datos.detalles['Detalle del rechazo'] = solicitud.solicitud?.detalleRechazo || solicitud.detalleRechazo;
    }
    
    // Cambiar el texto del botón
    if (datos.urlAccion) {
      datos.textoBoton = "Ver detalles";
    }
  }
  
  return await enviarCorreo({
    to: emailDestinatario,
    subject: `MotoTrack: Solicitud #${idSolicitud} ${esAprobada ? 'aprobada con éxito' : 'no aprobada'}`,
    html: generarPlantilla(datos)
  });
};

// Envía un correo electrónico desde el formulario de contacto

const enviarCorreoContacto = async (datos) => {
  try {
    if (!datos.nombre || !datos.correo || !datos.mensaje) {
      return { success: false, error: 'Faltan datos obligatorios para el correo de contacto' };
    }

    const destinatario = 'servicio.mototrack@gmail.com';
    const asunto = datos.asunto || 'Nuevo mensaje de contacto desde MotoTrack';
    const plantilla = generarPlantillaContacto(datos);

    return await enviarCorreo({
      to: destinatario,
      subject: asunto,
      html: plantilla
    });
  } catch (error) {
    console.error('Error al enviar correo de contacto:', error);
    return { success: false, error: error.message };
  }
};

// Genera una plantilla HTML para emails de contacto

const generarPlantillaContacto = (datos) => {
  // Paleta de colores (misma que en generarPlantilla)
  const colores = {
    brand: '#5046e5',
    accent: '#06b6d4',
    dark: '#1e293b',
    medium: '#64748b',
    light: '#e2e8f0',
    white: '#ffffff',
  };

  const asunto = datos.asunto || 'Mensaje de contacto';
  
  // Sanitizar mensaje (convertir saltos de línea a <br>)
  const mensajeHTML = datos.mensaje
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nuevo mensaje de contacto</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          background-color: #f1f5f9;
          margin: 0;
          padding: 0;
          color: ${colores.dark};
          line-height: 1.6;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .container {
          max-width: 620px;
          margin: 40px auto;
          background-color: ${colores.white};
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
        }
        
        .header {
          background: linear-gradient(135deg, ${colores.brand}, ${colores.accent});
          padding: 38px 20px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .logo {
          position: relative;
          color: white;
          font-size: 34px;
          font-weight: 800;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .header-title {
          position: relative;
          color: rgba(255, 255, 255, 0.9);
          font-size: 18px;
          font-weight: 500;
        }
        
        .content {
          padding: 40px 30px;
        }
        
        .greeting {
          font-size: 22px;
          font-weight: 700;
          color: ${colores.dark};
          margin-bottom: 20px;
        }
        
        .message {
          font-size: 16px;
          line-height: 1.7;
          color: ${colores.medium};
          margin-bottom: 24px;
        }
        
        .contact-details {
          background-color: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          border: 1px solid ${colores.light};
        }
        
        .details-row {
          display: flex;
          margin-bottom: 10px;
        }
        
        .details-label {
          flex: 0 0 80px;
          font-weight: 600;
          color: ${colores.dark};
        }
        
        .details-value {
          flex: 1;
          color: ${colores.medium};
        }
        
        .message-content {
          background-color: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 30px;
          border: 1px solid ${colores.light};
        }
        
        .footer {
          background-color: #f8fafc;
          padding: 30px;
          text-align: center;
          color: ${colores.medium};
          font-size: 14px;
          border-top: 1px solid ${colores.light};
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MotoTrack</div>
          <div class="header-title">Formulario de Contacto</div>
        </div>
        
        <div class="content">
          <div class="greeting">Nuevo mensaje de contacto</div>
          
          <p class="message">Se ha recibido un nuevo mensaje a través del formulario de contacto en el sitio web de MotoTrack.</p>
          
          <div class="contact-details">
            <div class="details-row">
              <div class="details-label">Nombre:&nbsp;</div>
              <div class="details-value">${datos.nombre}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Correo:&nbsp;</div>
              <div class="details-value">${datos.correo}</div>
            </div>
            <div class="details-row">
              <div class="details-label">Asunto:&nbsp;</div>
              <div class="details-value">${asunto}</div>
            </div>
          </div>
          
          <p class="message">Mensaje:&nbsp;</p>
          <div class="message-content">
            ${mensajeHTML}
          </div>
        </div>
        
        <div class="footer">
          <p>© ${new Date().getFullYear()} MotoTrack - Sistema de Registro y Control de Motocicletas</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  enviarCorreo,
  generarPlantilla,
  notificarNuevaSolicitud,
  notificarAsignacionSolicitud,
  notificarSolicitudProcesada,
  enviarCorreoContacto
}; 