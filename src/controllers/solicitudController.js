const solicitudService = require('../services/solicitudService');
const { handleError } = require('../utils/errorHandler');
const personaService = require('../services/personaService');
const ubicacionService = require('../services/ubicacionService');
const { pool } = require('../db');

/**
 * Crear una nueva solicitud de matrícula
 */
const crearSolicitud = async (req, res) => {
  try {
    // Extraer datos de la solicitud
    const { 
      // Vehículo
      chasis, tipoUso, idMarca, idModelo, color, cilindraje, año,
      // Seguro (opcional)
      seguro,
      // Documentos
      docCedula, docLicencia, docFacturaVehiculo, docSeguro,
      // Datos personales
      persona
    } = req.body;

    // Validaciones básicas
    if (!chasis || !tipoUso || !idMarca || !idModelo) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Faltan datos obligatorios del vehículo'
      });
    }

    if (!persona) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Faltan datos de la persona'
      });
    }

    // Obtener ID del ciudadano a partir del usuario autenticado o buscar por la relación usuario
    let idCiudadano = req.user.idPersona;
    const correoUsuario = req.user.correo;
    const idUsuario = req.user.idUsuario;

    // Si no se encuentra en req.user, intentar buscar en la base de datos
    if (!idCiudadano) {
      try {
        // Buscar persona asociada al idUsuario actual
        const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);

        if (personaAsociada) {
          // Si existe una persona asociada, usar su ID
          idCiudadano = personaAsociada.idpersona;
          console.log(`Persona encontrada para usuario ${idUsuario}: ${idCiudadano}`);
        }
      } catch (busquedaError) {
        console.error('Error al buscar persona por usuario:', busquedaError);
      }
    }

    // Si aún no se encuentra, crear una nueva persona
    if (!idCiudadano) {
      try {
        console.log(`Creando nueva persona para usuario ${idUsuario}`);
        // Primero, crear ubicación
        let idUbicacion = null;
        
        if (persona.direccion && persona.idMunicipio) {
          const ubicacionData = {
            direccion: persona.direccion,
            idMunicipio: persona.idMunicipio
          };
          
          const nuevaUbicacion = await ubicacionService.createUbicacion(ubicacionData);
          
          if (nuevaUbicacion && nuevaUbicacion.id) {
            idUbicacion = nuevaUbicacion.id;
          }
        }
        
        // Crear la persona asociada al usuario
        const personaData = {
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          cedula: persona.cedula,
          fechaNacimiento: persona.fechaNacimiento,
          estadoCivil: persona.estadoCivil,
          sexo: persona.sexo,
          telefono: persona.telefono,
          idUbicacion: idUbicacion,
          idTipoPersona: 3, // Ciudadano
          idUsuario: idUsuario
        };
        
        const nuevaPersona = await personaService.createPersona(personaData);
        
        if (nuevaPersona && nuevaPersona.idpersona) {
          idCiudadano = nuevaPersona.idpersona;
        } else {
          return res.status(500).json({
            success: false,
            error: 'Error al crear persona',
            message: 'No se pudo crear un registro de persona asociado a su usuario'
          });
        }
      } catch (personaError) {
        console.error('Error al crear persona:', personaError);
        return res.status(500).json({
          success: false,
          error: 'Error al crear persona',
          message: personaError.message || 'Error al crear registro de persona'
        });
      }
    } else {
      // Si ya existe una persona asociada al usuario, actualizar sus datos
      try {
        console.log(`Actualizando persona existente: ${idCiudadano}`);
        // Primero, obtener la información actual
        const personaActual = await personaService.getPersonaById(idCiudadano);
        
        if (!personaActual) {
          console.error(`No se encontró información para la persona con ID ${idCiudadano}`);
          return res.status(404).json({
            success: false,
            error: 'Persona no encontrada',
            message: 'No se encontró el registro de persona asociado a su usuario'
          });
        }

        console.log(`Datos actuales de persona: ${JSON.stringify(personaActual)}`);

        // Actualizar la ubicación si se proporcionan nuevos datos
        let idUbicacion = personaActual.idubicacion;
        
        if (persona.direccion && persona.idMunicipio && 
           (!idUbicacion || 
            (personaActual.direccion !== persona.direccion || 
             (personaActual.idmunicipio && personaActual.idmunicipio.toString() !== persona.idMunicipio.toString())))) {
          
          console.log('Es necesario actualizar la ubicación');
          
          if (idUbicacion) {
            // Actualizar ubicación existente
            await ubicacionService.updateUbicacion(idUbicacion, {
              direccion: persona.direccion,
              idMunicipio: persona.idMunicipio
            });
            console.log(`Ubicación actualizada: ${idUbicacion}`);
          } else {
            // Crear nueva ubicación
            const ubicacionData = {
              direccion: persona.direccion,
              idMunicipio: persona.idMunicipio
            };
            
            const nuevaUbicacion = await ubicacionService.createUbicacion(ubicacionData);
            
            if (nuevaUbicacion && nuevaUbicacion.id) {
              idUbicacion = nuevaUbicacion.id;
              console.log(`Nueva ubicación creada: ${idUbicacion}`);
              
              // Actualizar la referencia en la persona
              await personaService.updatePersona(idCiudadano, {
                idUbicacion: idUbicacion
              });
              console.log(`Referencia de ubicación actualizada en persona ${idCiudadano}`);
            }
          }
        }
        
        // Actualizar los datos personales
        console.log(`Actualizando datos personales para persona ${idCiudadano}`);
        const datosActualizados = await personaService.updatePersona(idCiudadano, {
          nombres: persona.nombres,
          apellidos: persona.apellidos,
          cedula: persona.cedula,
          fechaNacimiento: persona.fechaNacimiento,
          estadoCivil: persona.estadoCivil,
          sexo: persona.sexo,
          telefono: persona.telefono
        });
        console.log(`Datos personales actualizados: ${JSON.stringify(datosActualizados)}`);
        
        // Si el correo cambió, actualizar también en la tabla Usuario
        if (persona.correo && persona.correo !== correoUsuario) {
          console.log(`Actualizando correo de usuario ${idUsuario} de ${correoUsuario} a ${persona.correo}`);
          await pool.query(
            'UPDATE Usuario SET correo = $1 WHERE idUsuario = $2',
            [persona.correo, idUsuario]
          );
        }
        
      } catch (updateError) {
        console.error('Error al actualizar datos de persona:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Error al actualizar datos personales',
          message: updateError.message || 'Error al actualizar los datos personales asociados a su usuario'
        });
      }
    }

    // Validar seguro si se proporciona
    if (seguro) {
      if (seguro.idSeguro) {
        if (!seguro.numeroPoliza) {
          return res.status(400).json({
            success: false,
            error: 'Datos de seguro incompletos',
            message: 'Si proporciona idSeguro, debe incluir también el numeroPoliza'
          });
        }
      } else if (seguro.proveedor) {
        if (!seguro.numeroPoliza) {
          return res.status(400).json({
            success: false,
            error: 'Datos de seguro incompletos',
            message: 'Si proporciona proveedor, debe incluir también el numeroPoliza'
          });
        }
      } else {
        return res.status(400).json({
          success: false,
          error: 'Datos de seguro incompletos',
          message: 'Debe proporcionar idSeguro o proveedor para el seguro'
        });
      }
    }

    // Crear la solicitud
    const nuevaSolicitud = await solicitudService.crearSolicitud({
      idCiudadano,
      vehiculo: {
        chasis,
        tipoUso,
        idMarca,
        idModelo,
        color,
        cilindraje,
        año
      },
      seguro,
      documentos: {
        docCedula,
        docLicencia,
        docFacturaVehiculo,
        docSeguro
      },
      persona
    });

    let mensaje = 'Solicitud creada exitosamente';
    // Si la solicitud está en cola (todos los empleados están ocupados)
    if (nuevaSolicitud && nuevaSolicitud.enCola) {
      mensaje += '. Su solicitud ha sido puesta en cola porque todos los empleados tienen actualmente el máximo de 5 solicitudes pendientes. Será procesada tan pronto un empleado esté disponible.';
    }

    res.status(201).json({
      success: true,
      message: mensaje,
      data: nuevaSolicitud
    });
  } catch (error) {
    if (error.message === 'Ya existe un vehículo con ese número de chasis') {
      return res.status(400).json({
        success: false,
        error: 'Chasis duplicado',
        message: error.message
      });
    }
    
    // Si es un error de empleados, dar mensaje específico
    if (error.message.includes('No hay empleados registrados en el sistema')) {
      return res.status(500).json({
        success: false,
        error: 'No hay empleados disponibles',
        message: 'No hay empleados registrados en el sistema actualmente. Contacte al administrador.'
      });
    }

    if (error.message.includes('No se encontró ningún empleado disponible')) {
      return res.status(500).json({
        success: false,
        error: 'No hay empleados disponibles',
        message: 'No se encontraron empleados disponibles para asignar. Contacte al administrador.'
      });
    }
    
    // Si es un error de empleados con 5 solicitudes, no lo tratamos como error sino como solicitud en cola
    if (error.message && error.message.includes('No hay empleados activos disponibles con menos de 5 solicitudes pendientes')) {
      return res.status(201).json({
        success: true,
        message: 'Solicitud creada exitosamente. Su solicitud está en cola y será atendida cuando un empleado esté disponible.',
        data: null
      });
    }
    
    handleError(res, error, 'Error al crear la solicitud');
  }
};

/**
 * Obtener las solicitudes del ciudadano logueado
 */
const obtenerSolicitudesCiudadano = async (req, res) => {
  try {
    // Obtener ID del ciudadano
    let idCiudadano = req.user.idPersona;
    
    // Si no tenemos idPersona directamente, intentar obtenerlo por otros medios
    if (!idCiudadano) {
      // Intentar obtener desde datosPersonales si existe
      if (req.user.datosPersonales && req.user.datosPersonales.idPersona) {
        idCiudadano = req.user.datosPersonales.idPersona;
        console.log(`Usando idPersona desde datosPersonales: ${idCiudadano}`);
      } 
      // Si aún no tenemos idPersona, buscar por idUsuario
      else if (req.user.idUsuario || req.user.id) {
        const idUsuario = req.user.idUsuario || req.user.id;
        try {
          console.log(`Buscando persona por idUsuario: ${idUsuario}`);
          const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
          
          if (personaAsociada) {
            idCiudadano = personaAsociada.idpersona;
            console.log(`Persona encontrada por idUsuario: ${idCiudadano}`);
          }
        } catch (error) {
          console.error('Error al buscar persona por idUsuario:', error);
        }
      }
    }
    
    if (!idCiudadano) {
      // Depurar información del usuario para diagnóstico
      console.error('No se pudo encontrar idPersona para el ciudadano:', {
        idUsuario: req.user.idUsuario || req.user.id,
        correo: req.user.correo,
        tipoUsuario: req.user.tipoUsuario,
        datosDisponibles: Object.keys(req.user)
      });
      
      return res.status(400).json({
        success: false,
        error: 'Datos de persona incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    const solicitudes = await solicitudService.obtenerSolicitudesPorCiudadano(idCiudadano);
    
    res.status(200).json({
      success: true,
      count: solicitudes.length,
      data: solicitudes
    });
  } catch (error) {
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
        console.log(`Usando idPersona desde datosPersonales: ${idEmpleado}`);
      } 
      // Si aún no tenemos idPersona, buscar por idUsuario
      else if (req.user.idUsuario || req.user.id) {
        const idUsuario = req.user.idUsuario || req.user.id;
        try {
          console.log(`Buscando persona por idUsuario: ${idUsuario}`);
          const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
          
          if (personaAsociada) {
            idEmpleado = personaAsociada.idpersona;
            console.log(`Persona encontrada por idUsuario: ${idEmpleado}`);
          }
        } catch (error) {
          console.error('Error al buscar persona por idUsuario:', error);
        }
      }
    }
    
    // Extraer filtros desde los query params
    const { marca, modelo, estado, fechaDesde, fechaHasta } = req.query;
    
    if (!idEmpleado) {
      // Depurar información del usuario para diagnóstico
      console.error('No se pudo encontrar idPersona para el usuario:', {
        idUsuario: req.user.idUsuario || req.user.id,
        correo: req.user.correo,
        tipoUsuario: req.user.tipoUsuario,
        datosDisponibles: Object.keys(req.user)
      });
      
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
    
    // Depurar información del usuario
    console.log('Información de usuario en procesarSolicitud:', req.user);
    
    // Obtener ID del empleado
    let idEmpleado = req.user.idPersona;
    
    // Si no tenemos idPersona directamente, intentar obtenerlo por otros medios
    if (!idEmpleado) {
      // Intentar obtener desde datosPersonales si existe
      if (req.user.datosPersonales && req.user.datosPersonales.idPersona) {
        idEmpleado = req.user.datosPersonales.idPersona;
        console.log(`Usando idPersona desde datosPersonales: ${idEmpleado}`);
      } 
      // Si aún no tenemos idPersona, buscar por idUsuario
      else if (req.user.idUsuario || req.user.id) {
        const idUsuario = req.user.idUsuario || req.user.id;
        try {
          console.log(`Buscando persona por idUsuario: ${idUsuario}`);
          const personaAsociada = await personaService.getPersonaByUsuarioId(idUsuario);
          
          if (personaAsociada) {
            idEmpleado = personaAsociada.idpersona;
            console.log(`Persona encontrada por idUsuario: ${idEmpleado}`);
          }
        } catch (error) {
          console.error('Error al buscar persona por idUsuario:', error);
        }
      }
    }
    
    if (!idEmpleado) {
      // Depurar información del usuario para diagnóstico
      console.error('No se pudo encontrar idPersona para el usuario:', {
        idUsuario: req.user.idUsuario || req.user.id,
        correo: req.user.correo,
        tipoUsuario: req.user.tipoUsuario,
        datosDisponibles: Object.keys(req.user)
      });
      
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
      console.log(`Solicitud encontrada previamente:`, {
        idVehiculo: solicitudPrevia.idvehiculo,
        estadoDecision: solicitudPrevia.estadodecision,
        idEmpleadoAsignado: solicitudPrevia.idempleado
      });
    } catch (error) {
      console.error(`Error al verificar solicitud para vehículo ${idVehiculo}:`, error);
    }
    
    console.log(`Procesando solicitud para vehículo ${idVehiculo} por empleado ${idEmpleado} con decisión ${estadoDecision}`);
    
    const solicitudActualizada = await solicitudService.procesarSolicitud({
      idSolicitud: idVehiculo, // Mantener compatibilidad con el servicio existente
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