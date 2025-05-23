const solicitudService = require('../services/solicitudService');
const { handleError } = require('../utils/errorHandler');
const personaService = require('../services/personaService');
const { uploadFile } = require('../services/uploadService');
const emailHelper = require('../utils/emailHelper');
const statisticsService = require('../services/statisticsService');
// Eliminar la línea comentada del statsHelper que ya no se usará

/**
 * Crear una nueva solicitud de matrícula
 */
const crearSolicitud = async (req, res) => {
  try {
    // Convertir cualquier variante de año a ano
    if (req.body['año'] !== undefined) {
      req.body.ano = req.body['año'];
      delete req.body['año'];
    }
    
    if (req.body['aÃ±o'] !== undefined) {
      req.body.ano = req.body['aÃ±o'];
      delete req.body['aÃ±o'];
    }
    
    // Extraer datos de la solicitud
    const { 
      // Vehículo
      chasis, tipoUso, idMarca, idModelo, color, cilindraje, ano,
      // Seguro (opcional)
      seguro, datoSeguro,
      // Datos personales
      persona
    } = req.body;
    
    // Agregar el ID del usuario autenticado a los datos de la persona
    if (req.user) {
      // Asignar el ID del usuario autenticado (puede estar en id o idUsuario)
      persona.idUsuario = req.user.id || req.user.idUsuario;
      
      // También agregar correo si está disponible y no se proporcionó
      if (req.user.correo && !persona.correo) {
        persona.correo = req.user.correo;
      }
    }
    
    // Procesar archivos y obtener URLs
    let documentos = {};
    
    if (req.files) {
      // Realizar subidas a Supabase para cada tipo de documento
      const uploadPromises = [];
      const uploadErrors = [];
      
      if (req.files.cedula && req.files.cedula.length > 0) {
        const file = req.files.cedula[0];
        uploadPromises.push(
          uploadFile(file.buffer, file.originalname, file.mimetype, 'cedula')
            .then(result => {
              if (result.error) {
                console.error(`Error al subir cédula a Supabase:`, result.error);
                uploadErrors.push({ type: 'cedula', error: result.error });
              } else if (result.publicUrl) {
                documentos.docCedula = result.publicUrl;
              }
              return result;
            })
        );
      }
      
      if (req.files.licencia && req.files.licencia.length > 0) {
        const file = req.files.licencia[0];
        uploadPromises.push(
          uploadFile(file.buffer, file.originalname, file.mimetype, 'licencia')
            .then(result => {
              if (result.error) {
                console.error(`Error al subir licencia a Supabase:`, result.error);
                uploadErrors.push({ type: 'licencia', error: result.error });
              } else if (result.publicUrl) {
                documentos.docLicencia = result.publicUrl;
              }
              return result;
            })
        );
      }
      
      if (req.files.seguro_doc && req.files.seguro_doc.length > 0) {
        const file = req.files.seguro_doc[0];
        uploadPromises.push(
          uploadFile(file.buffer, file.originalname, file.mimetype, 'seguro')
            .then(result => {
              if (result.error) {
                console.error(`Error al subir seguro a Supabase:`, result.error);
                uploadErrors.push({ type: 'seguro', error: result.error });
              } else if (result.publicUrl) {
                documentos.docSeguro = result.publicUrl;
              }
              return result;
            })
        );
      }
      
      if (req.files.factura && req.files.factura.length > 0) {
        const file = req.files.factura[0];
        uploadPromises.push(
          uploadFile(file.buffer, file.originalname, file.mimetype, 'factura')
            .then(result => {
              if (result.error) {
                console.error(`Error al subir factura a Supabase:`, result.error);
                uploadErrors.push({ type: 'factura', error: result.error });
              } else if (result.publicUrl) {
                documentos.docFacturaVehiculo = result.publicUrl;
              }
              return result;
            })
        );
      }
      
      // Esperar a que todas las subidas terminen
      await Promise.all(uploadPromises);
      
      // Verificar si hubo errores en las subidas
      if (uploadErrors.length > 0) {
        return res.status(500).json({
          success: false,
          error: 'Error en la carga de archivos',
          details: uploadErrors.map(err => `Error al subir ${err.type}: ${err.error.message || 'Error desconocido'}`)
        });
      }
    }

    // Usar el valor de ano
    let anioVehiculo = ano;
    
    // Intentar convertir a número si es string
    if (typeof anioVehiculo === 'string') {
      anioVehiculo = parseInt(anioVehiculo, 10);
    }
    
    // Establecer un valor predeterminado si sigue siendo inválido
    if (anioVehiculo === undefined || anioVehiculo === null || isNaN(anioVehiculo)) {
      // Si no se puede extraer, usar valor directo del body
      anioVehiculo = parseInt(String(req.body.ano || 0), 10);
    }

    // Validación crítica - no continuar si año sigue siendo inválido
    if (isNaN(anioVehiculo) || anioVehiculo < 1900) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: 'El año del vehículo es obligatorio y debe ser un número válido mayor a 1900'
      });
    }

    // Usar datoSeguro o seguro, priorizando datoSeguro
    const datosSeguro = datoSeguro || seguro;

    // Verificar que tenemos los datos mínimos para crear la solicitud
    if (!chasis) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El número de chasis es obligatorio'
      });
    }

    if (!tipoUso) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El tipo de uso es obligatorio'
      });
    }

    if (!idMarca) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'La marca es obligatoria'
      });
    }

    if (!idModelo) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El modelo es obligatorio'
      });
    }

    if (!persona) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Los datos de la persona son obligatorios'
      });
    }

    // Validar campos básicos de la persona
    if (!persona.nombres || !persona.apellidos || !persona.cedula) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Los nombres, apellidos y cédula de la persona son obligatorios'
      });
    }

    // Si se proporciona seguro, validar campos requeridos
    if (datosSeguro) {
      if (!datosSeguro.proveedor) {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos',
          message: 'El proveedor del seguro es obligatorio'
        });
      }
      
      if (!datosSeguro.numeroPoliza) {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos',
          message: 'El número de póliza del seguro es obligatorio'
        });
      }
    }

    // Validar que se han subido los archivos obligatorios
    if (!documentos.docCedula) {
      return res.status(400).json({
        success: false,
        error: 'Archivos incompletos',
        message: 'El documento de cédula es obligatorio'
      });
    }

    if (!documentos.docLicencia) {
      return res.status(400).json({
        success: false,
        error: 'Archivos incompletos',
        message: 'El documento de licencia es obligatorio'
      });
    }

    if (!documentos.docFacturaVehiculo) {
      return res.status(400).json({
        success: false,
        error: 'Archivos incompletos',
        message: 'El documento de factura del vehículo es obligatorio'
      });
    }

    // Crear el objeto de datos del vehículo
    const datosVehiculo = {
      chasis,
      tipoUso,
      idMarca,
      idModelo,
      color,
      cilindraje,
      ano: anioVehiculo
    };

    // Crear la solicitud con todos los datos
    const solicitudCreada = await solicitudService.crearSolicitud(
      datosVehiculo,
      persona,
      datosSeguro,
      documentos
    );
    
    // Construir la respuesta
    const respuesta = {
      idSolicitud: solicitudCreada.idsolicitud,
      numeroSolicitud: solicitudCreada.numerosolicitud,
      fechaRegistro: solicitudCreada.fecharegistro
    };
    
    res.status(201).json({
      success: true,
      message: 'Solicitud creada exitosamente',
      data: respuesta
    });
    
    // Forzar actualización de estadísticas en segundo plano sin afectar la respuesta
    try {
      // Obtener ID del ciudadano para actualizar sus estadísticas personales
      let idCiudadano = null;
      
      // Intentar obtener el ID de varias fuentes posibles
      if (persona && persona.idPersona) {
        idCiudadano = persona.idPersona;
      } else if (solicitudCreada && solicitudCreada.idpersona) {
        idCiudadano = solicitudCreada.idpersona;
      } else if (req.body && req.body.persona && req.body.persona.idPersona) {
        idCiudadano = req.body.persona.idPersona;
      }
      
      if (idCiudadano) {
        statisticsService.getCiudadanoStatistics(idCiudadano, true)
          .catch(error => console.error('Error al actualizar estadísticas de ciudadano:', error));
      }
      
      // Actualizar estadísticas globales del sistema
      statisticsService.getSystemStatistics({}, true)
        .catch(error => console.error('Error al actualizar estadísticas del sistema:', error));
    } catch (error) {
      console.error('Error en actualización de estadísticas post-creación:', error);
      // Continuar normalmente - la actualización de estadísticas no debe interrumpir el flujo
    }
  } catch (error) {
    // Manejar específicamente el error de límite de vehículos
    if (error.message && error.message.includes('límite de vehículos')) {
      return res.status(400).json({
        success: false,
        error: 'Límite de vehículos excedido',
        message: error.message
      });
    }
    
    handleError(res, error, 'Error al crear solicitud');
  }
};

/**
 * Obtener las solicitudes del ciudadano logueado
 */
const obtenerSolicitudesCiudadano = async (req, res) => {
  try {
    // Obtener ID del usuario autenticado
    const idUsuario = req.user.idUsuario || req.user.id;
    
    // Obtener filtro de estado si existe
    const { estado, idSolicitud } = req.query;
    
    if (!idUsuario) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        message: 'No se puede identificar el usuario autenticado'
      });
    }
    
    // Obtener ID de la persona asociada al usuario
    let idPersona = req.user.idPersona;
    
    // Si no tenemos idPersona directamente, intentar obtenerlo
    if (!idPersona && req.user.datosPersonales?.idPersona) {
      idPersona = req.user.datosPersonales.idPersona;
    }
    
    // Si todavía no tenemos idPersona, buscarlo usando el servicio de personas
    if (!idPersona) {
      try {
        const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
        
        if (personaAsociada) {
          idPersona = personaAsociada.idpersona;
        } else {
          
          return res.status(404).json({
            success: false,
            error: 'Datos incompletos',
            message: 'No tiene un perfil de persona asociado a su cuenta. Por favor complete su perfil antes de realizar solicitudes.'
          });
        }
      } catch (error) {
        console.error(`Error al buscar persona para usuario ${idUsuario}:`, error);
        
        return res.status(500).json({
          success: false,
          error: 'Error al buscar datos de persona',
          message: 'Ocurrió un error al buscar sus datos personales'
        });
      }
    }
    
    // Validar el estado si se proporcionó
    if (estado && !['Pendiente', 'Aprobada', 'Rechazada'].includes(estado)) {
      return res.status(400).json({
        success: false,
        error: 'Parámetro inválido',
        message: 'El estado debe ser uno de los siguientes: Pendiente, Aprobada, Rechazada'
      });
    }
    
    // Si se proporciona idSolicitud, obtener esa solicitud específica
    if (idSolicitud) {
      const idSolicitudNum = parseInt(idSolicitud, 10);
      if (isNaN(idSolicitudNum)) {
        return res.status(400).json({
          success: false,
          error: 'Parámetro inválido',
          message: 'El ID de solicitud debe ser un número válido'
        });
      }
      
      // Obtener la solicitud específica
      const solicitud = await solicitudService.obtenerSolicitudPorId(idSolicitudNum);
      
      // Verificar que la solicitud pertenece al ciudadano
      if (solicitud && solicitud.ciudadano && solicitud.ciudadano.idPersona === idPersona) {
        return res.status(200).json({
          success: true,
          count: 1,
          data: [solicitud] // Devolver como array para mantener consistencia con la API
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada',
          message: 'No se encontró la solicitud especificada o no tiene permisos para verla'
        });
      }
    }
    
    // Si no hay idSolicitud, obtener todas las solicitudes del ciudadano (con filtro de estado si existe)
    const solicitudes = await solicitudService.obtenerSolicitudesPorCiudadano(idPersona, idUsuario, estado);
    
    res.status(200).json({
      success: true,
      count: solicitudes.length,
      data: solicitudes
    });
  } catch (error) {
    console.error('Error en obtenerSolicitudesCiudadano:', error);
    handleError(res, error, 'Error al obtener solicitudes');
  }
};

/**
 * Obtener una solicitud específica por ID
 */
const obtenerSolicitudPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const idUsuario = req.user.idUsuario;
    const tipoUsuario = req.user.tipoUsuario?.nombre?.toLowerCase();
    
    // Convertimos el id a number para validar que sea un ID válido
    const idSolicitud = parseInt(id, 10);
    
    if (isNaN(idSolicitud)) {
      return res.status(400).json({
        success: false,
        error: 'ID no válido',
        message: 'El ID de la solicitud debe ser un número'
      });
    }
    
    const solicitud = await solicitudService.obtenerSolicitudPorId(idSolicitud);
    
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada',
        message: `No se encontró la solicitud con ID ${idSolicitud}`
      });
    }
    
    // Verificar permisos (solo administrador, empleado asignado o propietario)
    if (tipoUsuario !== 'administrador' && 
        solicitud.idempleado !== req.user.idPersona && 
        solicitud.idpersona !== req.user.idPersona) {
      return res.status(403).json({
        success: false,
        error: 'Permiso denegado',
        message: 'No tiene permisos para ver esta solicitud'
      });
    }
    
    res.status(200).json({
      success: true,
      data: solicitud
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener solicitud');
  }
};

/**
 * Obtener solicitudes de un empleado (pendientes, aprobadas y rechazadas)
 */
const obtenerSolicitudesEmpleado = async (req, res) => {
  try {
    // Obtener ID del empleado
    let idEmpleado = req.user.idPersona;
    
    // Si no tenemos idPersona directamente, intentar obtenerlo por otros medios
    if (!idEmpleado) {
      // Intentar obtener desde datosPersonales si existe
      if (req.user.datosPersonales && req.user.datosPersonales.idPersona) {
        idEmpleado = req.user.datosPersonales.idPersona;
      } 
      // Si aún no tenemos idPersona, buscar por idUsuario
      else if (req.user.idUsuario || req.user.id) {
        const idUsuario = req.user.idUsuario || req.user.id;
        try {
          const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
          
          if (personaAsociada) {
            idEmpleado = personaAsociada.idpersona;
          }
        } catch (error) {
          // Ignorar error
        }
      }
    }
    
    // Extraer filtros desde los query params
    const { marca, modelo, estado, fechaDesde, fechaHasta, idSolicitud } = req.query;
    
    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'Datos de persona incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    // Si se proporciona idSolicitud, obtener esa solicitud específica
    if (idSolicitud) {
      const idSolicitudNum = parseInt(idSolicitud, 10);
      if (isNaN(idSolicitudNum)) {
        return res.status(400).json({
          success: false,
          error: 'Parámetro inválido',
          message: 'El ID de solicitud debe ser un número válido'
        });
      }
      
      // Obtener la solicitud específica
      const solicitud = await solicitudService.obtenerSolicitudPorId(idSolicitudNum);
      
      // Verificar que la solicitud está asignada al empleado
      if (solicitud && solicitud.empleado && solicitud.empleado.idPersona === idEmpleado) {
        return res.status(200).json({
          success: true,
          data: [solicitud] // Devolver como array para mantener consistencia con la API
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada',
          message: 'No se encontró la solicitud especificada o no está asignada a usted'
        });
      }
    }
    
    // Construir filtros para buscar todas las solicitudes del empleado
    const filtros = {
      idEmpleado: idEmpleado
    };
    
    if (marca) filtros.marca = marca;
    if (modelo) filtros.modelo = modelo;
    if (estado) filtros.estadoDecision = estado;
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;
    
    const result = await solicitudService.obtenerSolicitudesPorEmpleadoFiltradas(filtros);
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, 'Error al obtener solicitudes del empleado');
  }
};

/**
 * Procesar una solicitud (aprobar o rechazar)
 */
const procesarSolicitud = async (req, res) => {
  try {
    const { idSolicitud, estadoDecision, notaRevision, motivoRechazo, detalleRechazo } = req.body;
    
    // Validaciones básicas
    if (!idSolicitud) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la solicitud es obligatorio'
      });
    }
    
    if (!estadoDecision || !['Aprobada', 'Rechazada'].includes(estadoDecision)) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: 'La decisión debe ser "Aprobada" o "Rechazada"'
      });
    }
    
    if (estadoDecision === 'Rechazada' && !motivoRechazo) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Debe proporcionar un motivo de rechazo'
      });
    }
    
    // Obtener ID del empleado desde el token
    let idEmpleado = req.user.idPersona;
    
    // Si no tenemos idPersona directamente, intentar obtenerlo por otros medios
    if (!idEmpleado) {
      // Intentar obtener desde datosPersonales si existe
      if (req.user.datosPersonales && req.user.datosPersonales.idPersona) {
        idEmpleado = req.user.datosPersonales.idPersona;
      } 
      // Si aún no tenemos idPersona, buscar por idUsuario
      else if (req.user.idUsuario || req.user.id) {
        const idUsuario = req.user.idUsuario || req.user.id;
        try {
          const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
          
          if (personaAsociada) {
            idEmpleado = personaAsociada.idpersona;
          }
        } catch (error) {
          // Ignorar error
        }
      }
    }
    
    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'Datos de persona incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    // Verificar primero si la solicitud existe
    try {
      const solicitudPrevia = await solicitudService.obtenerSolicitudPorId(idSolicitud);
      if (!solicitudPrevia) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada',
          message: `No se encontró la solicitud con ID ${idSolicitud}`
        });
      }

      // Guardar esta información para la notificación posterior
      var idPersonaCiudadano = solicitudPrevia.ciudadano?.idPersona;
    } catch (error) {
      // Ignorar error
    }
    
    const solicitudActualizada = await solicitudService.procesarSolicitud({
      idSolicitud,
      idEmpleado,
      estadoDecision,
      notaRevision,
      motivoRechazo,
      detalleRechazo
    });
    
    if (!solicitudActualizada) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada',
        message: `No se pudo procesar la solicitud con ID ${idSolicitud}`
      });
    }
    
    // Forzar actualización de estadísticas en segundo plano
    try {
      // Actualizar estadísticas del empleado que procesó la solicitud
      statisticsService.getEmpleadoStatistics(idEmpleado, {})
        .catch(error => console.error('Error al actualizar estadísticas del empleado:', error));
      
      // Si tenemos el ID del ciudadano, actualizar sus estadísticas personales
      if (idPersonaCiudadano) {
        statisticsService.getCiudadanoStatistics(idPersonaCiudadano)
          .catch(error => console.error('Error al actualizar estadísticas del ciudadano:', error));
      }
      
      // Actualizar estadísticas globales del sistema
      statisticsService.getSystemStatistics({})
        .catch(error => console.error('Error al actualizar estadísticas del sistema:', error));
    } catch (error) {
      console.error('Error en actualización de estadísticas post-procesamiento:', error);
      // Continuar normalmente - la actualización de estadísticas no debe interrumpir el flujo
    }
    
    // Intentar enviar notificación por correo (si existe función emailHelper)
    if (typeof emailHelper !== 'undefined' && idPersonaCiudadano) {
      try {
        const idUsuarioCiudadano = await emailHelper.obtenerIdUsuarioDePersona(idPersonaCiudadano);
        if (idUsuarioCiudadano) {
          emailHelper.notificarSolicitudProcesada(solicitudActualizada, idUsuarioCiudadano)
            .catch(error => console.error('Error al notificar por correo:', error));
        }
      } catch (error) {
        console.error('Error al preparar notificación por correo:', error);
        // Continuar con la respuesta normal, no interrumpir el flujo
      }
    }
    
    res.status(200).json({
      success: true,
      data: solicitudActualizada,
      message: estadoDecision === 'Aprobada' ? 
        'Solicitud aprobada exitosamente' : 
        'Solicitud rechazada exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al procesar solicitud');
  }
};

/**
 * Obtener todas las solicitudes (para administradores)
 */
const obtenerTodasSolicitudes = async (req, res) => {
  try {
    const { 
      marca, modelo, estado, idEmpleado, 
      fechaDesde, fechaHasta, idSolicitud
    } = req.query;
    
    // Si se proporciona idSolicitud, obtener esa solicitud específica
    if (idSolicitud) {
      const idSolicitudNum = parseInt(idSolicitud, 10);
      if (isNaN(idSolicitudNum)) {
        return res.status(400).json({
          success: false,
          error: 'Parámetro inválido',
          message: 'El ID de solicitud debe ser un número válido'
        });
      }
      
      // Obtener la solicitud específica (administrador puede ver cualquier solicitud)
      const solicitud = await solicitudService.obtenerSolicitudPorId(idSolicitudNum);
      
      if (solicitud) {
        return res.status(200).json({
          success: true,
          count: 1,
          data: [solicitud] // Devolver como array para mantener consistencia con la API
        });
      } else {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada',
          message: 'No se encontró la solicitud especificada'
        });
      }
    }
    
    // Construir filtros
    const filtros = {};
    if (marca) filtros.marca = marca;
    if (modelo) filtros.modelo = modelo;
    if (estado) filtros.estadoDecision = estado;
    if (idEmpleado) filtros.idEmpleado = parseInt(idEmpleado, 10);
    
    // Fechas
    if (fechaDesde) filtros.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filtros.fechaHasta = new Date(fechaHasta);
    
    // Obtener todas las solicitudes sin paginación
    const result = await solicitudService.obtenerTodasSolicitudes(filtros);
    
    res.status(200).json(result);
  } catch (error) {
    handleError(res, error, 'Error al obtener todas las solicitudes');
  }
};

/**
 * Asignar una solicitud a un empleado
 */
const asignarSolicitudEmpleado = async (req, res) => {
  try {
    const { idSolicitud, idEmpleado } = req.body;
    
    // Validaciones básicas
    if (!idSolicitud) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la solicitud es obligatorio'
      });
    }
    
    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del empleado es obligatorio'
      });
    }
    
    // Asignar la solicitud
    const solicitudAsignada = await solicitudService.asignarSolicitudEmpleado(idSolicitud, idEmpleado);
    
    if (!solicitudAsignada) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada o no pendiente',
        message: 'No se pudo asignar la solicitud. Verifique que la solicitud existe y está pendiente.'
      });
    }
    
    // Intentar enviar notificación por correo (sin afectar el flujo principal)
    try {
      const idUsuarioEmpleado = await emailHelper.obtenerIdUsuarioDePersona(idEmpleado);
      if (idUsuarioEmpleado) {
        // No utilizar await para no bloquear la respuesta
        emailHelper.notificarAsignacionSolicitud(solicitudAsignada, idUsuarioEmpleado)
          .catch(error => console.error('Error al notificar asignación por correo:', error));
      }
    } catch (error) {
      console.error('Error al obtener usuario de empleado para notificación:', error);
    }
    
    res.status(200).json({
      success: true,
      message: 'Solicitud asignada exitosamente',
      data: solicitudAsignada
    });
  } catch (error) {
    handleError(res, error, 'Error al asignar la solicitud');
  }
};

module.exports = {
  crearSolicitud,
  obtenerSolicitudesCiudadano,
  obtenerSolicitudPorId,
  obtenerSolicitudesEmpleado,
  procesarSolicitud,
  obtenerTodasSolicitudes,
  asignarSolicitudEmpleado
}; 