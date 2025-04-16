const solicitudService = require('../services/solicitudService');
const { handleError } = require('../utils/errorHandler');
const personaService = require('../services/personaService');

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
      console.log(`Asociando solicitud al usuario autenticado: ${persona.idUsuario}`);
      
      // También agregar correo si está disponible y no se proporcionó
      if (req.user.correo && !persona.correo) {
        persona.correo = req.user.correo;
      }
    } else {
      console.log('No hay usuario autenticado para asociar a la solicitud');
    }
    
    // Procesar archivos y obtener URLs
    let documentos = {};
    
    if (req.files) {
      // Procesar cada tipo de documento
      if (req.files.cedula && req.files.cedula.length > 0) {
        documentos.docCedula = `/uploads/cedulas/${Date.now()}-${req.files.cedula[0].originalname}`;
      }
      
      if (req.files.licencia && req.files.licencia.length > 0) {
        documentos.docLicencia = `/uploads/licencias/${Date.now()}-${req.files.licencia[0].originalname}`;
      }
      
      if (req.files.seguro_doc && req.files.seguro_doc.length > 0) {
        documentos.docSeguro = `/uploads/seguros/${Date.now()}-${req.files.seguro_doc[0].originalname}`;
      }
      
      if (req.files.factura && req.files.factura.length > 0) {
        documentos.docFacturaVehiculo = `/uploads/facturas/${Date.now()}-${req.files.factura[0].originalname}`;
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
      // Si se proporciona idSeguro o numeroPoliza, verificar que sean valores válidos
      if (datosSeguro.idSeguro && typeof datosSeguro.idSeguro !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          message: 'El ID del seguro debe ser un número válido'
        });
      }
      
      if (datosSeguro.numeroPoliza && typeof datosSeguro.numeroPoliza !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          message: 'El número de póliza debe ser una cadena de texto válida'
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

    // Llamar al servicio para crear la solicitud
    try {
      const solicitudCreada = await solicitudService.crearSolicitud(
        datosVehiculo,
        persona,
        datosSeguro,
        documentos
      );

      // Transformar la respuesta al formato deseado
      // Normalizar nombres de propiedades a minúsculas
      const respuesta = {};
      
      // Convertir todas las claves a minúsculas para tener un formato estándar
      if (solicitudCreada) {
        Object.keys(solicitudCreada).forEach(key => {
          const keyLower = key.toLowerCase();
          respuesta[keyLower] = solicitudCreada[key];
        });
      }
      
      if (solicitudCreada?.enCola) {
        respuesta.encola = true;
      }
      
      res.status(201).json({
        success: true,
        message: 'Solicitud creada exitosamente',
        data: respuesta
      });
    } catch (error) {
      // Manejar específicamente el error de límite de vehículos
      if (error.message && error.message.includes('El ciudadano ya tiene') && error.message.includes('vehículos registrados')) {
        return res.status(400).json({
          success: false,
          error: 'Límite de vehículos alcanzado',
          message: error.message
        });
      }
      
      // Para otros errores, pasar al manejador de errores general
      throw error;
    }
  } catch (error) {
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
    
    if (!idUsuario) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        message: 'No se puede identificar el usuario autenticado'
      });
    }
    
    console.log(`Obteniendo solicitudes para el usuario ID: ${idUsuario}`);
    
    // Obtener ID de la persona asociada al usuario
    let idPersona = req.user.idPersona;
    
    // Si no tenemos idPersona directamente, intentar obtenerlo
    if (!idPersona && req.user.datosPersonales?.idPersona) {
      idPersona = req.user.datosPersonales.idPersona;
      console.log(`Usando ID de persona desde datosPersonales: ${idPersona}`);
    }
    
    // Si todavía no tenemos idPersona, buscarlo usando el servicio de personas
    if (!idPersona) {
      try {
        const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
        
        if (personaAsociada) {
          idPersona = personaAsociada.idpersona;
          console.log(`Encontrada persona ID ${idPersona} asociada al usuario ID ${idUsuario}`);
        } else {
          console.log(`No se encontró ninguna persona asociada al usuario ID ${idUsuario}`);
          
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
    
    // Obtener las solicitudes usando el ID de persona
    const solicitudes = await solicitudService.obtenerSolicitudesPorCiudadano(idPersona, idUsuario);
    
    console.log(`Se encontraron ${solicitudes.length} solicitudes para la persona ID ${idPersona} (Usuario ID ${idUsuario})`);
    
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
    
    const solicitud = await solicitudService.obtenerSolicitudPorId(id);
    
    if (!solicitud) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada',
        message: `No se encontró la solicitud con ID ${id}`
      });
    }
    
    // Verificar permisos (solo administrador, empleado asignado o propietario)
    if (tipoUsuario !== 'administrador' && 
        solicitud.idEmpleado !== req.user.idPersona && 
        solicitud.idCiudadano !== req.user.idPersona) {
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
    const { marca, modelo, estado, fechaDesde, fechaHasta } = req.query;
    
    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'Datos de persona incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    // Construir filtros
    const filtros = {
      idEmpleado: idEmpleado
    };
    
    if (marca) filtros.marca = marca;
    if (modelo) filtros.modelo = modelo;
    if (estado) filtros.estadoDecision = estado;
    if (fechaDesde) filtros.fechaDesde = fechaDesde;
    if (fechaHasta) filtros.fechaHasta = fechaHasta;
    
    const solicitudes = await solicitudService.obtenerSolicitudesPorEmpleadoFiltradas(filtros);
    
    res.status(200).json({
      success: true,
      count: solicitudes.length,
      data: solicitudes
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener solicitudes del empleado');
  }
};

/**
 * Procesar una solicitud (aprobar o rechazar)
 */
const procesarSolicitud = async (req, res) => {
  try {
    const { idVehiculo, estadoDecision, notaRevision, motivoRechazo, detalleRechazo } = req.body;
    
    // Validaciones básicas
    if (!idVehiculo) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del vehículo de la solicitud es obligatorio'
      });
    }
    
    if (!estadoDecision || !['Aprobada', 'Rechazada'].includes(estadoDecision)) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Debe proporcionar un estado de decisión válido (Aprobada o Rechazada)'
      });
    }
    
    if (estadoDecision === 'Aprobada' && !notaRevision) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Debe proporcionar una nota de revisión para aprobar la solicitud'
      });
    }
    
    if (estadoDecision === 'Rechazada' && (!motivoRechazo || !detalleRechazo)) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Debe proporcionar motivo y detalle de rechazo para rechazar la solicitud'
      });
    }
    
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
    
    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'Datos de persona incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    // Verificar primero si la solicitud existe
    try {
      const solicitudPrevia = await solicitudService.obtenerSolicitudPorId(idVehiculo);
      if (!solicitudPrevia) {
        return res.status(404).json({
          success: false,
          error: 'Solicitud no encontrada',
          message: `No se encontró la solicitud para el vehículo con ID ${idVehiculo}`
        });
      }
    } catch (error) {
      // Ignorar error
    }
    
    const solicitudActualizada = await solicitudService.procesarSolicitud({
      idVehiculo,
      idEmpleado,
      estadoDecision,
      notaRevision,
      motivoRechazo,
      detalleRechazo
    });
    
    if (!solicitudActualizada) {
      return res.status(404).json({
        success: false,
        error: 'Error al procesar la solicitud',
        message: `No se pudo procesar la solicitud. Verifique que la solicitud existe, está pendiente y está asignada a usted o es administrador.`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Solicitud ${estadoDecision.toLowerCase()} exitosamente`,
      data: solicitudActualizada
    });
  } catch (error) {
    handleError(res, error, 'Error al procesar la solicitud');
  }
};

/**
 * Obtener todas las solicitudes (para administradores)
 */
const obtenerTodasSolicitudes = async (req, res) => {
  try {
    const { 
      marca, modelo, estado, idEmpleado, 
      fechaDesde, fechaHasta, page = 1, limit = 10 
    } = req.query;
    
    // Construir filtros
    const filtros = {};
    if (marca) filtros.marca = marca;
    if (modelo) filtros.modelo = modelo;
    if (estado) filtros.estadoDecision = estado;
    if (idEmpleado) filtros.idEmpleado = parseInt(idEmpleado, 10);
    
    // Fechas
    if (fechaDesde) filtros.fechaDesde = new Date(fechaDesde);
    if (fechaHasta) filtros.fechaHasta = new Date(fechaHasta);
    
    // Paginación
    const paginacion = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10)
    };
    
    const result = await solicitudService.obtenerTodasSolicitudes(filtros, paginacion);
    
    res.status(200).json({
      success: true,
      totalItems: result.total,
      totalPages: Math.ceil(result.total / paginacion.limit),
      currentPage: paginacion.page,
      data: result.solicitudes
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener solicitudes');
  }
};

/**
 * Asignar una solicitud a un empleado
 */
const asignarSolicitudEmpleado = async (req, res) => {
  try {
    const { idVehiculo, idEmpleado } = req.body;
    
    // Validaciones básicas
    if (!idVehiculo) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del vehículo de la solicitud es obligatorio'
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
    const solicitudAsignada = await solicitudService.asignarSolicitudEmpleado(idVehiculo, idEmpleado);
    
    if (!solicitudAsignada) {
      return res.status(404).json({
        success: false,
        error: 'Solicitud no encontrada o no pendiente',
        message: 'No se pudo asignar la solicitud. Verifique que la solicitud existe y está pendiente.'
      });
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