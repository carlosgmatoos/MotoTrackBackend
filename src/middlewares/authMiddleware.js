const jwtService = require('../services/jwtService');
const config = require('../config');
const { handleError } = require('../utils/errorHandler');
const { validateLoginData } = require('../utils/validators');
const userService = require('../services/userService');

/**
 * Middleware para verificar que el usuario esté autenticado
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Obtener el token del header de autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verificar y decodificar el token
    try {
      const decoded = jwtService.verifyToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Token inválido o expirado'
        });
      }
      
      // Obtener información del usuario desde la base de datos
      const user = await userService.getUsers({ 
        idUsuario: decoded.id,
        includePermisos: true
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Usuario no encontrado o inactivo'
        });
      }
      
      // Agregar información del usuario al objeto de solicitud
      req.user = user;
      next();
    } catch (error) {
      console.error('Error de verificación de token:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error de autenticación',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar que el usuario tiene rol de administrador
 */
const isAdmin = (req, res, next) => {
  try {
    // Verificar que el usuario tiene rol de administrador
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: información de usuario incompleta'
      });
    }

    // Corregido para usar operador lógico correcto
    if (
      req.user.role === 'administrador' || 
      req.user.tipoUsuario?.nombre?.toLowerCase() === 'administrador' ||
      req.user.tipoUsuario?.id === 1
    ) { 
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: se requiere rol de administrador'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware para verificar que el usuario tiene rol de empleado o administrador
 */
const isEmpleado = (req, res, next) => {
  try {
    // Verificar que el usuario tiene rol de empleado o administrador
    if (!req.user) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: información de usuario incompleta'
      });
    }

    // Corregido para usar lógica correcta
    if (
      req.user.role === 'empleado' || 
      req.user.role === 'administrador' || 
      req.user.tipoUsuario?.nombre?.toLowerCase() === 'empleado' ||
      req.user.tipoUsuario?.nombre?.toLowerCase() === 'administrador' ||
      req.user.tipoUsuario?.id === 2 || // (asumiendo que 2 es empleado)
      req.user.tipoUsuario?.id === 1    // (asumiendo que 1 es administrador)
    ) {
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: se requiere rol de empleado o administrador'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al verificar permisos',
      error: error.message
    });
  }
};

/**
 * Middleware para validar datos de inicio de sesión
 */
const validateLogin = (req, res, next) => {
  const { error } = validateLoginData(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Datos inválidos',
      message: error.details[0].message
    });
  }
  
  next();
};

/**
 * Middleware para validar datos de registro
 */
const validateRegister = (req, res, next) => {
  // Implementar validación específica para registro
  // (Esto se implementará en userValidationMiddleware)
  next();
};

/**
 * Middleware para validar refresh token
 */
const validateRefreshToken = (req, res, next) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: 'Token requerido',
      message: 'Se requiere un token de actualización'
    });
  }
  
  next();
};

module.exports = {  
  authMiddleware,
  isAdmin,
  isEmpleado,
  validateLogin,
  validateRegister,
  validateRefreshToken
};