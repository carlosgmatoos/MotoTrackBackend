const Joi = require('joi');

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Al menos 8 caracteres, una mayúscula, una minúscula y un número
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return passwordRegex.test(password);
};

const validateUser = (data, isUpdate = false) => {
  // Esquema base
  const schemaObject = {
    nombres: Joi.string().min(2).max(50).trim(),
    apellidos: Joi.string().min(2).max(50).trim(),
    correo: Joi.string().email(),
    contrasena: Joi.string().min(8),
    estado: Joi.string().valid('activo', 'inactivo', 'deshabilitado'),
    idTipoUsuario: Joi.number().integer().positive()
  };
  
  // Si es creación, hacer campos obligatorios
  if (!isUpdate) {
    schemaObject.nombres = schemaObject.nombres.required();
    schemaObject.apellidos = schemaObject.apellidos.required();
    schemaObject.correo = schemaObject.correo.required();
    schemaObject.contrasena = schemaObject.contrasena.required();
    schemaObject.idTipoUsuario = schemaObject.idTipoUsuario.required();
  }
  
  const schema = Joi.object(schemaObject);
  return schema.validate(data);
};

const validateProfile = (data) => {
  const schema = Joi.object({
    nombres: Joi.string().min(2).max(50).trim(),
    apellidos: Joi.string().min(2).max(50).trim(),
    correo: Joi.string().email(),
    contrasena: Joi.string().min(8)
  }).min(1); // Al menos un campo debe estar presente
  
  return schema.validate(data);
};

/**
 * Esquema de validación para datos de inicio de sesión
 */
const loginSchema = Joi.object({
  correo: Joi.string().email().required()
    .messages({
      'string.empty': 'El correo es obligatorio',
      'string.email': 'Debe proporcionar un correo electrónico válido'
    }),
  contrasena: Joi.string().required()
    .messages({
      'string.empty': 'La contraseña es obligatoria'
    })
});

/**
 * Valida datos de inicio de sesión
 */
const validateLoginData = (data) => {
  return loginSchema.validate(data, { abortEarly: false });
};

/**
 * Valida los datos de una provincia
 */
const validateProvinciaData = (data) => {
  const errors = [];
  
  // Validar nombre de provincia
  if (!data.nombreProvincia) {
    errors.push('El nombre de la provincia es obligatorio');
  } else if (typeof data.nombreProvincia !== 'string') {
    errors.push('El nombre de la provincia debe ser texto');
  } else if (data.nombreProvincia.length < 2) {
    errors.push('El nombre de la provincia debe tener al menos 2 caracteres');
  } else if (data.nombreProvincia.length > 50) {
    errors.push('El nombre de la provincia no puede exceder los 50 caracteres');
  }
  
  // Validar estado si está presente
  if (data.estado !== undefined && !['activo', 'inactivo'].includes(data.estado)) {
    errors.push('El estado debe ser "activo" o "inactivo"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida los datos de un municipio
 */
const validateMunicipioData = (data) => {
  const errors = [];
  
  // Validar nombre de municipio
  if (!data.nombreMunicipio) {
    errors.push('El nombre del municipio es obligatorio');
  } else if (typeof data.nombreMunicipio !== 'string') {
    errors.push('El nombre del municipio debe ser texto');
  } else if (data.nombreMunicipio.length < 2) {
    errors.push('El nombre del municipio debe tener al menos 2 caracteres');
  } else if (data.nombreMunicipio.length > 50) {
    errors.push('El nombre del municipio no puede exceder los 50 caracteres');
  }
  
  // Validar ID de provincia
  if (!data.idProvincia) {
    errors.push('El ID de la provincia es obligatorio');
  } else if (isNaN(parseInt(data.idProvincia))) {
    errors.push('El ID de la provincia debe ser un número');
  } else if (parseInt(data.idProvincia) <= 0) {
    errors.push('El ID de la provincia debe ser un número positivo');
  }
  
  // Validar estado si está presente
  if (data.estado !== undefined && !['activo', 'inactivo'].includes(data.estado)) {
    errors.push('El estado debe ser "activo" o "inactivo"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Valida los datos de una ubicación
 */
const validateUbicacionData = (data) => {
  const errors = [];
  
  // Validar dirección
  if (!data.direccion) {
    errors.push('La dirección es obligatoria');
  } else if (typeof data.direccion !== 'string') {
    errors.push('La dirección debe ser texto');
  } else if (data.direccion.length < 5) {
    errors.push('La dirección debe tener al menos 5 caracteres');
  } else if (data.direccion.length > 200) {
    errors.push('La dirección no puede exceder los 200 caracteres');
  }
  
  // Validar sector (opcional)
  if (data.sector !== undefined && data.sector !== null) {
    if (typeof data.sector !== 'string') {
      errors.push('El sector debe ser texto');
    } else if (data.sector.length > 100) {
      errors.push('El sector no puede exceder los 100 caracteres');
    }
  }
  
  // Validar ID de municipio
  if (!data.idMunicipio) {
    errors.push('El ID del municipio es obligatorio');
  } else if (isNaN(parseInt(data.idMunicipio))) {
    errors.push('El ID del municipio debe ser un número');
  } else if (parseInt(data.idMunicipio) <= 0) {
    errors.push('El ID del municipio debe ser un número positivo');
  }
  
  // Validar estado si está presente
  if (data.estado !== undefined && !['activo', 'inactivo', 'deshabilitado'].includes(data.estado)) {
    errors.push('El estado debe ser "activo", "inactivo" o "deshabilitado"');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validador de Persona
const validatePersona = (persona) => {
  const errors = [];
  
  if (!persona.nombres) {
    errors.push("Los nombres son requeridos");
  } else if (typeof persona.nombres !== 'string' || persona.nombres.trim().length < 2) {
    errors.push("Los nombres deben ser un texto de al menos 2 caracteres");
  }
  
  if (!persona.apellidos) {
    errors.push("Los apellidos son requeridos");
  } else if (typeof persona.apellidos !== 'string' || persona.apellidos.trim().length < 2) {
    errors.push("Los apellidos deben ser un texto de al menos 2 caracteres");
  }
  
  if (!persona.cedula) {
    errors.push("La cédula es requerida");
  } else if (!(/^[0-9]+$/).test(persona.cedula)) {
    errors.push("La cédula debe contener solo números");
  }
  
  if (persona.email && !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(persona.email)) {
    errors.push("El formato del email es inválido");
  }
  
  if (persona.telefono && !(/^[0-9]{10}$/).test(persona.telefono)) {
    errors.push("El teléfono debe tener 10 dígitos numéricos");
  }
  
  if (persona.idTipoPersona && isNaN(Number(persona.idTipoPersona))) {
    errors.push("El tipo de persona debe ser un ID numérico válido");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validador para actualización de Persona
const validatePersonaUpdate = (personaData) => {
  const errors = [];
  
  if (Object.keys(personaData).length === 0) {
    errors.push("Debe proporcionar al menos un campo para actualizar");
    return { isValid: false, errors };
  }
  
  if (personaData.nombres !== undefined) {
    if (typeof personaData.nombres !== 'string' || personaData.nombres.trim().length < 2) {
      errors.push("Los nombres deben ser un texto de al menos 2 caracteres");
    }
  }
  
  if (personaData.apellidos !== undefined) {
    if (typeof personaData.apellidos !== 'string' || personaData.apellidos.trim().length < 2) {
      errors.push("Los apellidos deben ser un texto de al menos 2 caracteres");
    }
  }
  
  if (personaData.cedula !== undefined) {
    if (!(/^[0-9]+$/).test(personaData.cedula)) {
      errors.push("La cédula debe contener solo números");
    }
  }
  
  if (personaData.email !== undefined) {
    if (!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(personaData.email)) {
      errors.push("El formato del email es inválido");
    }
  }
  
  if (personaData.telefono !== undefined) {
    if (!(/^[0-9]{10}$/).test(personaData.telefono)) {
      errors.push("El teléfono debe tener 10 dígitos numéricos");
    }
  }
  
  if (personaData.idTipoPersona !== undefined) {
    if (isNaN(Number(personaData.idTipoPersona))) {
      errors.push("El tipo de persona debe ser un ID numérico válido");
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validador de TipoPersona
const validateTipoPersona = (tipoPersona) => {
  const errors = [];
  
  if (!tipoPersona.descripcion) {
    errors.push("La descripción es requerida");
  } else if (typeof tipoPersona.descripcion !== 'string' || tipoPersona.descripcion.trim().length < 3) {
    errors.push("La descripción debe ser un texto de al menos 3 caracteres");
  }
  
  if (tipoPersona.codigo !== undefined) {
    if (typeof tipoPersona.codigo !== 'string' || tipoPersona.codigo.trim().length < 2) {
      errors.push("El código debe ser un texto de al menos 2 caracteres");
    }
  }
  
  if (tipoPersona.estado !== undefined && typeof tipoPersona.estado !== 'boolean') {
    errors.push("El estado debe ser un valor booleano");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validador para actualización de TipoPersona
const validateTipoPersonaUpdate = (tipoPersonaData) => {
  const errors = [];
  
  if (Object.keys(tipoPersonaData).length === 0) {
    errors.push("Debe proporcionar al menos un campo para actualizar");
    return { isValid: false, errors };
  }
  
  if (tipoPersonaData.descripcion !== undefined) {
    if (typeof tipoPersonaData.descripcion !== 'string' || tipoPersonaData.descripcion.trim().length < 3) {
      errors.push("La descripción debe ser un texto de al menos 3 caracteres");
    }
  }
  
  if (tipoPersonaData.codigo !== undefined) {
    if (typeof tipoPersonaData.codigo !== 'string' || tipoPersonaData.codigo.trim().length < 2) {
      errors.push("El código debe ser un texto de al menos 2 caracteres");
    }
  }
  
  if (tipoPersonaData.estado !== undefined && typeof tipoPersonaData.estado !== 'boolean') {
    errors.push("El estado debe ser un valor booleano");
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateEmail,
  validatePassword,
  validateUser,
  validateProfile,
  validateLoginData,
  validateProvinciaData,
  validateMunicipioData,
  validateUbicacionData,
  validatePersona,
  validatePersonaUpdate,
  validateTipoPersona,
  validateTipoPersonaUpdate
}; 