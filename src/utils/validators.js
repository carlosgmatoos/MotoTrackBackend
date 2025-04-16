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
  
  // Nombres y apellidos son opcionales ya que se pueden obtener del usuario autenticado
  if (persona.nombres !== undefined) {
    if (typeof persona.nombres !== 'string' || persona.nombres.trim().length < 2) {
      errors.push("Los nombres deben ser un texto de al menos 2 caracteres");
    }
  }
  
  if (persona.apellidos !== undefined) {
    if (typeof persona.apellidos !== 'string' || persona.apellidos.trim().length < 2) {
      errors.push("Los apellidos deben ser un texto de al menos 2 caracteres");
    }
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
  
  // Validar campo cargo si está presente
  if (persona.cargo !== undefined) {
    if (typeof persona.cargo !== 'string' || persona.cargo.trim().length < 2) {
      errors.push("El cargo debe ser un texto de al menos 2 caracteres");
    }
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
  
  // Validar campo cargo si está presente
  if (personaData.cargo !== undefined) {
    if (typeof personaData.cargo !== 'string' || personaData.cargo.trim().length < 2) {
      errors.push("El cargo debe ser un texto de al menos 2 caracteres");
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

/**
 * Valida los datos de una marca
 */
const validateMarcaData = (data) => {
  const errors = [];
  
  // Validar nombre de marca
  if (!data.nombre) {
    errors.push('El nombre de la marca es obligatorio');
  } else if (typeof data.nombre !== 'string') {
    errors.push('El nombre de la marca debe ser texto');
  } else if (data.nombre.length < 2) {
    errors.push('El nombre de la marca debe tener al menos 2 caracteres');
  } else if (data.nombre.length > 75) {
    errors.push('El nombre de la marca no puede exceder los 75 caracteres');
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

/**
 * Valida los datos de un modelo
 */
const validateModeloData = (data) => {
  const errors = [];
  
  // Validar nombre de modelo
  if (!data.nombre) {
    errors.push('El nombre del modelo es obligatorio');
  } else if (typeof data.nombre !== 'string') {
    errors.push('El nombre del modelo debe ser texto');
  } else if (data.nombre.length < 2) {
    errors.push('El nombre del modelo debe tener al menos 2 caracteres');
  } else if (data.nombre.length > 100) {
    errors.push('El nombre del modelo no puede exceder los 100 caracteres');
  }
  
  // Validar año
  if (!data.año) {
    errors.push('El año del modelo es obligatorio');
  } else if (isNaN(parseInt(data.año))) {
    errors.push('El año del modelo debe ser un número');
  } else {
    const año = parseInt(data.año);
    const añoActual = new Date().getFullYear();
    if (año < 1900 || año > añoActual + 1) {
      errors.push(`El año debe estar entre 1900 y ${añoActual + 1}`);
    }
  }
  
  // Validar color (opcional)
  if (data.color !== undefined && data.color !== null) {
    if (typeof data.color !== 'string') {
      errors.push('El color debe ser texto');
    } else if (data.color.length > 30) {
      errors.push('El color no puede exceder los 30 caracteres');
    }
  }
  
  // Validar cilindraje (opcional)
  if (data.cilindraje !== undefined && data.cilindraje !== null) {
    if (typeof data.cilindraje !== 'string') {
      errors.push('El cilindraje debe ser texto');
    } else if (data.cilindraje.length > 25) {
      errors.push('El cilindraje no puede exceder los 25 caracteres');
    }
  }
  
  // Validar ID de marca
  if (!data.idMarca) {
    errors.push('El ID de la marca es obligatorio');
  } else if (isNaN(parseInt(data.idMarca))) {
    errors.push('El ID de la marca debe ser un número');
  } else if (parseInt(data.idMarca) <= 0) {
    errors.push('El ID de la marca debe ser un número positivo');
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

/**
 * Valida los datos de un tipo de vehículo
 */
const validateTipoVehiculoData = (data) => {
  const errors = [];
  
  // Validar nombre
  if (!data.nombre) {
    errors.push('El nombre del tipo de vehículo es obligatorio');
  } else if (typeof data.nombre !== 'string') {
    errors.push('El nombre del tipo de vehículo debe ser texto');
  } else if (data.nombre.length < 2) {
    errors.push('El nombre del tipo de vehículo debe tener al menos 2 caracteres');
  } else if (data.nombre.length > 75) {
    errors.push('El nombre del tipo de vehículo no puede exceder los 75 caracteres');
  }
  
  // Validar capacidad (opcional)
  if (data.capacidad !== undefined && data.capacidad !== null) {
    if (isNaN(parseInt(data.capacidad))) {
      errors.push('La capacidad debe ser un número');
    } else if (parseInt(data.capacidad) <= 0) {
      errors.push('La capacidad debe ser un número positivo');
    }
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

/**
 * Valida los datos de un seguro
 */
const validateSeguroData = (data) => {
  const errors = [];
  
  // Validar idSeguro
  if (!data.idSeguro) {
    errors.push('El ID del seguro es obligatorio');
  } else if (isNaN(parseInt(data.idSeguro))) {
    errors.push('El ID del seguro debe ser un número');
  } else if (parseInt(data.idSeguro) <= 0) {
    errors.push('El ID del seguro debe ser un número positivo');
  }
  
  // Validar número de póliza
  if (!data.numeroPoliza) {
    errors.push('El número de póliza es obligatorio');
  } else if (typeof data.numeroPoliza !== 'string') {
    errors.push('El número de póliza debe ser texto');
  } else if (data.numeroPoliza.length < 5) {
    errors.push('El número de póliza debe tener al menos 5 caracteres');
  } else if (data.numeroPoliza.length > 15) {
    errors.push('El número de póliza no puede exceder los 15 caracteres');
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

/**
 * Valida los datos de un vehículo
 */
const validateVehiculoData = (data) => {
  const errors = [];
  
  // Validar chasis
  if (!data.chasis) {
    errors.push('El número de chasis es obligatorio');
  } else if (typeof data.chasis !== 'string') {
    errors.push('El número de chasis debe ser texto');
  } else if (data.chasis.length !== 17) {
    errors.push('El número de chasis debe tener exactamente 17 caracteres');
  }
  
  // Validar tipo de uso
  if (!data.tipoUso) {
    errors.push('El tipo de uso es obligatorio');
  } else if (typeof data.tipoUso !== 'string') {
    errors.push('El tipo de uso debe ser texto');
  } else if (!['Personal', 'Recreativo', 'Transporte', 'Deportivo', 'Empresarial'].includes(data.tipoUso)) {
    errors.push('El tipo de uso debe ser "Personal", "Recreativo", "Transporte", "Deportivo" o "Empresarial"');
  }
  
  // Validar ID del modelo
  if (!data.idModelo) {
    errors.push('El ID del modelo es obligatorio');
  } else if (isNaN(parseInt(data.idModelo))) {
    errors.push('El ID del modelo debe ser un número');
  } else if (parseInt(data.idModelo) <= 0) {
    errors.push('El ID del modelo debe ser un número positivo');
  }
  
  // Validar ID del propietario
  if (!data.idPropietario) {
    errors.push('El ID del propietario es obligatorio');
  } else if (isNaN(parseInt(data.idPropietario))) {
    errors.push('El ID del propietario debe ser un número');
  } else if (parseInt(data.idPropietario) <= 0) {
    errors.push('El ID del propietario debe ser un número positivo');
  }
  
  // Validar ID del tipo de vehículo
  if (!data.idTipoVehiculo) {
    errors.push('El ID del tipo de vehículo es obligatorio');
  } else if (isNaN(parseInt(data.idTipoVehiculo))) {
    errors.push('El ID del tipo de vehículo debe ser un número');
  } else if (parseInt(data.idTipoVehiculo) <= 0) {
    errors.push('El ID del tipo de vehículo debe ser un número positivo');
  }
  
  // Validar ID del seguro
  if (!data.idSeguro) {
    errors.push('El ID del seguro es obligatorio');
  } else if (isNaN(parseInt(data.idSeguro))) {
    errors.push('El ID del seguro debe ser un número');
  } else if (parseInt(data.idSeguro) <= 0) {
    errors.push('El ID del seguro debe ser un número positivo');
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

const extractAndValidatePersonalData = (userData) => {
  // Extraer datos del objeto principal
  const {
    cedula, 
    fechaNacimiento, 
    estadoCivil, 
    sexo, 
    telefono,
    direccion,
    idMunicipio,
    idProvincia,
    idUbicacion,
    idTipoPersona,
    idPersona,
    datosPersonales: datosPersonalesObj
  } = userData;

  // Recopilar datos personales del objeto principal
  const datosDirectos = {
    cedula,
    fechaNacimiento,
    estadoCivil,
    sexo,
    telefono,
    direccion,
    idMunicipio,
    idProvincia,
    idUbicacion,
    idTipoPersona,
    idPersona
  };
  
  // Filtrar solo los campos con valores definidos
  const datosDirectosFiltrados = Object.fromEntries(
    Object.entries(datosDirectos).filter(([_, v]) => v !== undefined)
  );
  
  // Combinar datos, priorizando los del objeto raíz sobre los del objeto anidado
  const datosPersonalesCombinados = {
    ...(datosPersonalesObj || {}),
    ...datosDirectosFiltrados
  };

  // Validar campos básicos de usuario
  const errors = [];
  
  // Validar datos comunes para creación y actualización
  if (userData.correo && !validateEmail(userData.correo)) {
    errors.push('El formato del correo electrónico no es válido');
  }
  
  if (userData.contrasena && !validatePassword(userData.contrasena)) {
    errors.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
  }

  // Validar campos de datos personales
  if (datosPersonalesCombinados.cedula && !/^[0-9]{11}$/.test(datosPersonalesCombinados.cedula)) {
    errors.push('La cédula debe tener 11 dígitos numéricos');
  }
  
  if (datosPersonalesCombinados.telefono && !/^[0-9]{10}$/.test(datosPersonalesCombinados.telefono)) {
    errors.push('El teléfono debe tener 10 dígitos numéricos');
  }
  
  if (datosPersonalesCombinados.estadoCivil && 
      !['soltero', 'casado', 'divorciado', 'viudo'].includes(datosPersonalesCombinados.estadoCivil)) {
    errors.push('El estado civil debe ser: soltero, casado, divorciado o viudo');
  }
  
  if (datosPersonalesCombinados.sexo && !['M', 'F'].includes(datosPersonalesCombinados.sexo)) {
    errors.push('El sexo debe ser M o F');
  }
  
  if (datosPersonalesCombinados.fechaNacimiento) {
    const fecha = new Date(datosPersonalesCombinados.fechaNacimiento);
    if (isNaN(fecha.getTime())) {
      errors.push('La fecha de nacimiento debe tener formato YYYY-MM-DD');
    }
  }
  
  return {
    datosPersonalesCombinados,
    hasPersonalData: Object.keys(datosPersonalesCombinados).length > 0,
    isValid: errors.length === 0,
    errors
  };
};

const validateUserCreationData = (userData, isEmployee = false) => {
  const errors = [];
  
  // Validar campos obligatorios generales
  if (!userData.nombres) errors.push('El nombre es obligatorio');
  if (!userData.apellidos) errors.push('Los apellidos son obligatorios');
  if (!userData.correo) errors.push('El correo es obligatorio');
  if (!userData.contrasena) errors.push('La contraseña es obligatoria');
  
  // Validar correo y contraseña
  if (userData.correo && !validateEmail(userData.correo)) {
    errors.push('El formato del correo electrónico no es válido');
  }
  
  if (userData.contrasena && !validatePassword(userData.contrasena)) {
    errors.push('La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
  }
  
  // Extraer y validar datos personales
  const { datosPersonalesCombinados, errors: personalDataErrors } = extractAndValidatePersonalData(userData);
  
  // Añadir errores de validación de datos personales
  errors.push(...personalDataErrors);
  
  // Validaciones adicionales para empleados
  if (isEmployee) {
    const { cedula, sexo, estadoCivil, telefono, fechaNacimiento, direccion, idTipoPersona, idMunicipio } = datosPersonalesCombinados;
    
    if (!cedula) errors.push('La cédula es obligatoria para empleados');
    if (!sexo) errors.push('El sexo es obligatorio para empleados');
    if (!estadoCivil) errors.push('El estado civil es obligatorio para empleados');
    if (!telefono) errors.push('El teléfono es obligatorio para empleados');
    if (!fechaNacimiento) errors.push('La fecha de nacimiento es obligatoria para empleados');
    if (!direccion) errors.push('La dirección es obligatoria para empleados');
    if (!idMunicipio) errors.push('El ID del municipio es obligatorio para empleados');
    if (!idTipoPersona) errors.push('El ID del tipo de persona es obligatorio para empleados');
  }
  
  return {
    datosPersonalesCombinados,
    isValid: errors.length === 0,
    errors
  };
};

const validateUserUpdateData = (userData, isEmployee = false) => {
  const errors = [];
  
  // Verificar que el ID del usuario esté presente
  if (!userData.idUsuario && !userData.id) {
    errors.push('El ID del usuario es obligatorio');
  }
  
  // Extraer y validar datos personales
  const { datosPersonalesCombinados, errors: personalDataErrors } = extractAndValidatePersonalData(userData);
  
  // Añadir errores de validación de datos personales
  errors.push(...personalDataErrors);
  
  // Verificar que haya al menos un campo para actualizar
  const hasUserData = userData.nombres || userData.apellidos || userData.correo || 
                      userData.contrasena || userData.estado || userData.idTipoUsuario;
  
  if (!hasUserData && Object.keys(datosPersonalesCombinados).length === 0) {
    errors.push('No se proporcionaron datos para actualizar');
  }
  
  // Validaciones adicionales si se trata de un empleado
  if (isEmployee) {
    // Si se están actualizando datos personales pero no incluye tipo de persona
    const isTryingToUpdatePersonalData = Object.keys(datosPersonalesCombinados).length > 0;
    const hasTipoPersonaInfo = datosPersonalesCombinados.idTipoPersona || userData.idTipoPersona;
    
    if (isTryingToUpdatePersonalData && !hasTipoPersonaInfo) {
      errors.push('El ID del tipo de persona es obligatorio al actualizar datos de empleados');
    }
  }
  
  return {
    datosPersonalesCombinados,
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
  validateTipoPersonaUpdate,
  validateMarcaData,
  validateModeloData,
  validateTipoVehiculoData,
  validateSeguroData,
  validateVehiculoData,
  extractAndValidatePersonalData,
  validateUserCreationData,
  validateUserUpdateData
}; 