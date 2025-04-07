const Joi = require('joi');

/**
 * Esquema de validación para creación de tipos de usuario
 */
const tipoUsuarioSchema = Joi.object({
  nombre: Joi.string().min(2).max(50).required()
    .messages({
      'string.empty': 'El nombre es obligatorio',
      'string.min': 'El nombre debe tener al menos {#limit} caracteres',
      'string.max': 'El nombre no puede exceder los {#limit} caracteres'
    }),
  descripcion: Joi.string().max(200)
    .messages({
      'string.max': 'La descripción no puede exceder los {#limit} caracteres'
    }),
  poderCrear: Joi.boolean()
    .messages({
      'boolean.base': 'El permiso de crear debe ser un valor booleano'
    }),
  poderEditar: Joi.boolean()
    .messages({
      'boolean.base': 'El permiso de editar debe ser un valor booleano'
    }),
  poderEliminar: Joi.boolean()
    .messages({
      'boolean.base': 'El permiso de eliminar debe ser un valor booleano'
    })
});

/**
 * Esquema de validación para actualización de tipos de usuario
 */
const tipoUsuarioUpdateSchema = Joi.object({
  id: Joi.number().integer().required()
    .messages({
      'number.base': 'El ID debe ser un número',
      'any.required': 'El ID del tipo de usuario es obligatorio'
    }),
  nombre: Joi.string().min(2).max(50)
    .messages({
      'string.min': 'El nombre debe tener al menos {#limit} caracteres',
      'string.max': 'El nombre no puede exceder los {#limit} caracteres'
    }),
  descripcion: Joi.string().max(200)
    .messages({
      'string.max': 'La descripción no puede exceder los {#limit} caracteres'
    }),
  poderCrear: Joi.boolean()
    .messages({
      'boolean.base': 'El permiso de crear debe ser un valor booleano'
    }),
  poderEditar: Joi.boolean()
    .messages({
      'boolean.base': 'El permiso de editar debe ser un valor booleano'
    }),
  poderEliminar: Joi.boolean()
    .messages({
      'boolean.base': 'El permiso de eliminar debe ser un valor booleano'
    })
}).min(1).messages({
  'object.min': 'Debe proporcionar al menos un campo para actualizar'
});

/**
 * Middleware para validar creación de tipos de usuario
 */
const validateTipoUsuarioCreation = (req, res, next) => {
  const { error } = tipoUsuarioSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: errorMessage
    });
  }
  
  next();
};

/**
 * Middleware para validar actualización de tipos de usuario
 */
const validateTipoUsuarioUpdate = (req, res, next) => {
  const { error } = tipoUsuarioUpdateSchema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: errorMessage
    });
  }
  
  next();
};

module.exports = {
  validateTipoUsuarioCreation,
  validateTipoUsuarioUpdate
}; 