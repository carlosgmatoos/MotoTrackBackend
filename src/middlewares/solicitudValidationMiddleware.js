const Joi = require('joi');
const { handleError } = require('../utils/errorHandler');

// Validación para creación de solicitud
const validateSolicitudCreation = (req, res, next) => {
  try {
    // Corregir problemas de codificación si vienen campos año o aÃ±o
    if (req.body['año'] !== undefined) {
      req.body.ano = req.body['año'];
      delete req.body['año'];
    }
    
    if (req.body['aÃ±o'] !== undefined) {
      req.body.ano = req.body['aÃ±o'];
      delete req.body['aÃ±o'];
    }
    
    // Crear una copia del body para trabajar
    let body = {...req.body};
    
    // En caso de que ano venga como string, convertirlo a número
    if (typeof body.ano === 'string') {
      body.ano = parseInt(body.ano, 10);
    }

    // Manejar datoSeguro vs seguro (para compatibilidad)
    if (body.seguro && !body.datoSeguro) {
      body.datoSeguro = body.seguro;
    }

    // Validar los campos obligatorios manualmente para mayor flexibilidad
    const errores = [];
    
    if (!body.chasis) {
      errores.push('El número de chasis es obligatorio');
    } else if (body.chasis.length !== 17) {
      errores.push('El número de chasis debe tener 17 caracteres');
    }
    
    if (!body.tipoUso) {
      errores.push('El tipo de uso es obligatorio');
    } else if (!['Personal', 'Recreativo', 'Transporte', 'Deportivo', 'Empresarial'].includes(body.tipoUso)) {
      errores.push('El tipo de uso debe ser uno de los siguientes: Personal, Recreativo, Transporte, Deportivo, Empresarial');
    }
    
    if (!body.idMarca) {
      errores.push('La marca es obligatoria');
    }
    
    if (!body.idModelo) {
      errores.push('El modelo es obligatorio');
    }
    
    if (!body.color) {
      errores.push('El color es obligatorio');
    }
    
    if (!body.cilindraje) {
      errores.push('El cilindraje es obligatorio');
    }
    
    // Validar el año utilizando exclusivamente el campo ano
    if (body.ano === undefined || body.ano === null || body.ano === '') {
      errores.push('El año del vehículo es obligatorio');
    } else {
      const year = parseInt(String(body.ano), 10);
      
      if (isNaN(year)) {
        errores.push('El año debe ser un número');
      } else if (year < 1900) {
        errores.push('El año debe ser igual o mayor a 1900');
      } else if (year > new Date().getFullYear() + 1) {
        errores.push(`El año no puede ser mayor a ${new Date().getFullYear() + 1}`);
      } else {
        // Si la validación es exitosa, establecer el campo ano como número
        req.body.ano = year;
      }
    }
    
    // Si hay errores, devolver un mensaje de error
    if (errores.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: errores[0] // Devolver el primer error encontrado
      });
    }
    
    // Aplicar cambios al body original
    req.body = body;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error al validar la solicitud',
      message: error.message
    });
  }
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