const Joi = require('joi');
const { handleError } = require('../utils/errorHandler');

// Validación para creación de solicitud
const validateSolicitudCreation = (req, res, next) => {
  const schema = Joi.object({
    // Datos vehículo
    chasis: Joi.string().length(17).required().messages({
      'string.length': 'El número de chasis debe tener 17 caracteres',
      'any.required': 'El número de chasis es obligatorio'
    }),
    tipoUso: Joi.string().valid('Personal', 'Recreativo', 'Transporte', 'Deportivo', 'Empresarial').required(),
    idMarca: Joi.number().integer().required(),
    idModelo: Joi.number().integer().required(),
    color: Joi.string().required(),
    cilindraje: Joi.string().required(),
    año: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).required().messages({
      'number.min': 'El año debe ser igual o mayor a 1900',
      'number.max': `El año no puede ser mayor a ${new Date().getFullYear() + 1}`,
      'any.required': 'El año del vehículo es obligatorio'
    }),
    
    // Datos seguro (opcional)
    seguro: Joi.object({
      idSeguro: Joi.number().integer(),
      proveedor: Joi.string(),
      numeroPoliza: Joi.string().required()
    })
    .custom((value, helpers) => {
      // Debe proporcionar al menos idSeguro o proveedor
      if (!value.idSeguro && !value.proveedor) {
        return helpers.error('custom.seguro', { message: 'Debe proporcionar idSeguro o proveedor para el seguro' });
      }
      return value;
    })
    .optional(),
    
    // Datos de persona/ciudadano (opcional)
    persona: Joi.object({
      nombres: Joi.string().min(2).max(50),
      apellidos: Joi.string().min(2).max(50),
      cedula: Joi.string().length(11).pattern(/^[0-9]+$/).messages({
        'string.length': 'La cédula debe tener 11 dígitos',
        'string.pattern.base': 'La cédula debe contener solo números'
      }),
      fechaNacimiento: Joi.date().iso(),
      estadoCivil: Joi.string().valid('soltero', 'casado', 'divorciado', 'viudo'),
      sexo: Joi.string().valid('M', 'F'),
      telefono: Joi.string().length(10).pattern(/^[0-9]+$/).messages({
        'string.length': 'El teléfono debe tener 10 dígitos',
        'string.pattern.base': 'El teléfono debe contener solo números'
      }),
      correo: Joi.string().email(),
      direccion: Joi.string(),
      idProvincia: Joi.number().integer(),
      idMunicipio: Joi.number().integer()
    }).optional(),
    
    // Documentos
    docCedula: Joi.string().required(),
    docLicencia: Joi.string().required(),
    docFacturaVehiculo: Joi.string().required(),
    docSeguro: Joi.string().optional()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: error.details[0].message
    });
  }
  
  next();
};

// Validación para procesar solicitud
const validateProcesarSolicitud = (req, res, next) => {
  const schema = Joi.object({
    idVehiculo: Joi.number().integer().required(),
    estadoDecision: Joi.string().valid('Aprobada', 'Rechazada').required(),
    notaRevision: Joi.string().when('estadoDecision', {
      is: 'Aprobada',
      then: Joi.string().required().min(5),
      otherwise: Joi.string().optional()
    }),
    motivoRechazo: Joi.string().when('estadoDecision', {
      is: 'Rechazada',
      then: Joi.string().required().min(5),
      otherwise: Joi.string().optional()
    }),
    detalleRechazo: Joi.string().when('estadoDecision', {
      is: 'Rechazada',
      then: Joi.string().required().min(5),
      otherwise: Joi.string().optional()
    })
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: error.details[0].message
    });
  }
  
  next();
};

// Validación para asignar solicitud a empleado
const validateAsignarSolicitud = (req, res, next) => {
  const schema = Joi.object({
    idVehiculo: Joi.number().integer().required(),
    idEmpleado: Joi.number().integer().required()
  });

  const { error } = schema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: error.details[0].message
    });
  }
  
  next();
};

module.exports = {
  validateSolicitudCreation,
  validateProcesarSolicitud,
  validateAsignarSolicitud
}; 