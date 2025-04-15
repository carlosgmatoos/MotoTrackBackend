const Joi = require('joi');
const { handleError } = require('../utils/errorHandler');
const userService = require('../services/userService');

/**
 * Esquema de validación para creación de usuarios
 */
const userCreationSchema = Joi.object({
  nombres: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'El nombre es obligatorio',
      'string.min': 'El nombre debe tener al menos {#limit} caracteres',
      'string.max': 'El nombre no puede exceder los {#limit} caracteres'
    }),
  apellidos: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'Los apellidos son obligatorios',
      'string.min': 'Los apellidos deben tener al menos {#limit} caracteres',
      'string.max': 'Los apellidos no pueden exceder los {#limit} caracteres'
    }),
  correo: Joi.string().email().required()
    .messages({
      'string.empty': 'El correo es obligatorio',
      'string.email': 'Debe proporcionar un correo electrónico válido'
    }),
  contrasena: Joi.string().min(6).required()
    .messages({
      'string.empty': 'La contraseña es obligatoria',
      'string.min': 'La contraseña debe tener al menos {#limit} caracteres'
    }),
  idTipoUsuario: Joi.number().integer().min(1)
    .messages({
      'number.base': 'El tipo de usuario debe ser un número',
      'number.min': 'El tipo de usuario debe ser un valor válido'
    }),
  cargo: Joi.string().min(2).max(50).optional()
    .messages({
      'string.min': 'El cargo debe tener al menos {#limit} caracteres',
      'string.max': 'El cargo no puede exceder los {#limit} caracteres'
    }),
  estado: Joi.string().valid('activo', 'inactivo', 'deshabilitado').optional(),
  cedula: Joi.string().pattern(/^[0-9]{11}$/).optional()
    .messages({
      'string.pattern.base': 'La cédula debe tener 11 dígitos numéricos'
    }),
  fechaNacimiento: Joi.date().iso().optional()
    .messages({
      'date.base': 'La fecha de nacimiento debe ser una fecha válida',
      'date.iso': 'La fecha de nacimiento debe tener formato YYYY-MM-DD'
    }),
  estadoCivil: Joi.string().valid('soltero', 'casado', 'divorciado', 'viudo').optional()
    .messages({
      'any.only': 'El estado civil debe ser: soltero, casado, divorciado o viudo'
    }),
  sexo: Joi.string().valid('M', 'F').optional()
    .messages({
      'any.only': 'El sexo debe ser M o F'
    }),
  telefono: Joi.string().pattern(/^[0-9]{10}$/).optional()
    .messages({
      'string.pattern.base': 'El teléfono debe tener 10 dígitos numéricos'
    }),
  direccion: Joi.string().optional(),
  idMunicipio: Joi.number().integer().min(1).optional(),
  municipio: Joi.string().optional(),
  idProvincia: Joi.number().integer().min(1).optional(),
  provincia: Joi.string().optional(),
  idUbicacion: Joi.number().integer().min(1).optional(),
  idTipoPersona: Joi.number().integer().min(1).optional(),
  datosPersonales: Joi.object({
    cedula: Joi.string().pattern(/^[0-9]{11}$/).required()
      .messages({
        'string.empty': 'La cédula es obligatoria',
        'string.pattern.base': 'La cédula debe tener 11 dígitos numéricos'
      }),
    fechaNacimiento: Joi.date().iso().required()
      .messages({
        'date.base': 'La fecha de nacimiento debe ser una fecha válida',
        'date.iso': 'La fecha de nacimiento debe tener formato YYYY-MM-DD'
      }),
    estadoCivil: Joi.string().valid('soltero', 'casado', 'divorciado', 'viudo').required()
      .messages({
        'any.only': 'El estado civil debe ser: soltero, casado, divorciado o viudo'
      }),
    sexo: Joi.string().valid('M', 'F').required()
      .messages({
        'any.only': 'El sexo debe ser M o F'
      }),
    telefono: Joi.string().pattern(/^[0-9]{10}$/).required()
      .messages({
        'string.pattern.base': 'El teléfono debe tener 10 dígitos numéricos'
      }),
    idUbicacion: Joi.number().integer().min(1)
      .messages({
        'number.base': 'La ubicación debe ser un número',
        'number.min': 'La ubicación debe ser un valor válido'
      }),
    idTipoPersona: Joi.number().integer().min(1)
      .messages({
        'number.base': 'El tipo de persona debe ser un número',
        'number.min': 'El tipo de persona debe ser un valor válido'
      })
  }).optional()
});

/**
 * Esquema de validación para actualización de usuarios
 */
const userUpdateSchema = Joi.object({
  id: Joi.number().integer().min(1),
  idUsuario: Joi.number().integer().min(1),
  nombres: Joi.string().min(2).max(50)
    .messages({
      'string.min': 'El nombre debe tener al menos {#limit} caracteres',
      'string.max': 'El nombre no puede exceder los {#limit} caracteres'
    }),
  apellidos: Joi.string().min(2).max(50)
    .messages({
      'string.min': 'Los apellidos deben tener al menos {#limit} caracteres',
      'string.max': 'Los apellidos no pueden exceder los {#limit} caracteres'
    }),
  correo: Joi.string().email()
    .messages({
      'string.email': 'Debe proporcionar un correo electrónico válido'
    }),
  contrasena: Joi.string().min(6)
    .messages({
      'string.min': 'La contraseña debe tener al menos {#limit} caracteres'
    }),
  estado: Joi.string().valid('activo', 'inactivo', 'deshabilitado')
    .messages({
      'any.only': 'El estado debe ser "activo", "inactivo" o "deshabilitado"'
    }),
  idTipoUsuario: Joi.number().integer().min(1)
    .messages({
      'number.base': 'El tipo de usuario debe ser un número',
      'number.min': 'El tipo de usuario debe ser un valor válido'
    }),
  cargo: Joi.string().min(2).max(50)
    .messages({
      'string.min': 'El cargo debe tener al menos {#limit} caracteres',
      'string.max': 'El cargo no puede exceder los {#limit} caracteres'
    }),
  cedula: Joi.string().pattern(/^[0-9]{11}$/).optional()
    .messages({
      'string.pattern.base': 'La cédula debe tener 11 dígitos numéricos'
    }),
  fechaNacimiento: Joi.date().iso().optional()
    .messages({
      'date.base': 'La fecha de nacimiento debe ser una fecha válida',
      'date.iso': 'La fecha de nacimiento debe tener formato YYYY-MM-DD'
    }),
  estadoCivil: Joi.string().valid('soltero', 'casado', 'divorciado', 'viudo').optional()
    .messages({
      'any.only': 'El estado civil debe ser: soltero, casado, divorciado o viudo'
    }),
  sexo: Joi.string().valid('M', 'F').optional()
    .messages({
      'any.only': 'El sexo debe ser M o F'
    }),
  telefono: Joi.string().pattern(/^[0-9]{10}$/).optional()
    .messages({
      'string.pattern.base': 'El teléfono debe tener 10 dígitos numéricos'
    }),
  direccion: Joi.string().optional(),
  idMunicipio: Joi.number().integer().min(1).optional(),
  municipio: Joi.string().optional(),
  idProvincia: Joi.number().integer().min(1).optional(),
  provincia: Joi.string().optional(),
  idUbicacion: Joi.number().integer().min(1).optional(),
  idTipoPersona: Joi.number().integer().min(1).optional(),
  idPersona: Joi.number().integer().min(1).optional(),
  datosPersonales: Joi.object().optional()
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

/**
 * Esquema de validación para actualización de perfil
 */
const profileUpdateSchema = Joi.object({
  nombres: Joi.string().min(2).max(50)
    .messages({
      'string.min': 'El nombre debe tener al menos {#limit} caracteres',
      'string.max': 'El nombre no puede exceder los {#limit} caracteres'
    }),
  apellidos: Joi.string().min(2).max(50)
    .messages({
      'string.min': 'Los apellidos deben tener al menos {#limit} caracteres',
      'string.max': 'Los apellidos no pueden exceder los {#limit} caracteres'
    }),
  correo: Joi.string().email()
    .messages({
      'string.email': 'Debe proporcionar un correo electrónico válido'
    }),
  contrasena: Joi.string().min(6)
    .messages({
      'string.min': 'La contraseña debe tener al menos {#limit} caracteres'
    })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

/**
 * Middleware para validar creación de usuarios
 */
const validateUserCreation = (req, res, next) => {
  const { error } = userCreationSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: errorMessage
    });
  }
  
  // Verificar si hay datos personales en el objeto principal
  const { 
    cedula, fechaNacimiento, estadoCivil, sexo, telefono, direccion, 
    idMunicipio, municipio, idProvincia, provincia, idUbicacion, idTipoPersona 
  } = req.body;
  
  // Si hay datos personales en el objeto principal y no hay objeto datosPersonales,
  // reorganizar para crear un objeto datosPersonales
  const hasPersonalDataInRoot = cedula || fechaNacimiento || estadoCivil || sexo || 
                               telefono || direccion || idMunicipio || municipio || 
                               idProvincia || provincia || idUbicacion || idTipoPersona;
  
  if (hasPersonalDataInRoot && !req.body.datosPersonales) {
    // Crear objeto datosPersonales para uso interno
    const datosPersonales = {};
    
    if (cedula) datosPersonales.cedula = cedula;
    if (fechaNacimiento) datosPersonales.fechaNacimiento = fechaNacimiento;
    if (estadoCivil) datosPersonales.estadoCivil = estadoCivil;
    if (sexo) datosPersonales.sexo = sexo;
    if (telefono) datosPersonales.telefono = telefono;
    if (direccion) datosPersonales.direccion = direccion;
    if (idMunicipio) datosPersonales.idMunicipio = idMunicipio;
    if (municipio) datosPersonales.municipio = municipio;
    if (idProvincia) datosPersonales.idProvincia = idProvincia;
    if (provincia) datosPersonales.provincia = provincia;
    if (idUbicacion) datosPersonales.idUbicacion = idUbicacion;
    if (idTipoPersona) datosPersonales.idTipoPersona = idTipoPersona;
    
    // No modificar el req.body original para evitar confusiones en los controladores
    // que ya manejan estos campos directamente
  }
  
  next();
};

/**
 * Middleware para validar actualización de usuarios
 */
const validateUserUpdate = (req, res, next) => {
  const { error } = userUpdateSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: errorMessage
    });
  }
  
  // Verificar si hay datos personales en el objeto principal
  const { 
    cedula, fechaNacimiento, estadoCivil, sexo, telefono, direccion, 
    idMunicipio, municipio, idProvincia, provincia, idUbicacion, idTipoPersona, idPersona 
  } = req.body;
  
  // Si hay datos personales en el objeto principal y no hay objeto datosPersonales,
  // reorganizar para crear un objeto datosPersonales
  const hasPersonalDataInRoot = cedula || fechaNacimiento || estadoCivil || sexo || 
                               telefono || direccion || idMunicipio || municipio || 
                               idProvincia || provincia || idUbicacion || idTipoPersona || idPersona;
  
  if (hasPersonalDataInRoot && !req.body.datosPersonales) {
    // Crear objeto datosPersonales para uso interno
    const datosPersonales = {};
    
    if (cedula) datosPersonales.cedula = cedula;
    if (fechaNacimiento) datosPersonales.fechaNacimiento = fechaNacimiento;
    if (estadoCivil) datosPersonales.estadoCivil = estadoCivil;
    if (sexo) datosPersonales.sexo = sexo;
    if (telefono) datosPersonales.telefono = telefono;
    if (direccion) datosPersonales.direccion = direccion;
    if (idMunicipio) datosPersonales.idMunicipio = idMunicipio;
    if (municipio) datosPersonales.municipio = municipio;
    if (idProvincia) datosPersonales.idProvincia = idProvincia;
    if (provincia) datosPersonales.provincia = provincia;
    if (idUbicacion) datosPersonales.idUbicacion = idUbicacion;
    if (idTipoPersona) datosPersonales.idTipoPersona = idTipoPersona;
    if (idPersona) datosPersonales.idPersona = idPersona;
    
    // No modificar el req.body original para evitar confusiones en los controladores
    // que ya manejan estos campos directamente
  }
  
  next();
};


module.exports = {
  validateUserCreation,
  validateUserUpdate
};