const jwt = require('jsonwebtoken');
const config = require('../config');
const userService = require('./userService');

const generateToken = (user) => {
  // Crear payload para el token JWT
  const payload = {
    id: user.id,
    nombre: `${user.nombres} ${user.apellidos}`,
    correo: user.correo,
    role: user.role,
    permisos: user.permisos
  };
  
  // Generar token de acceso
  const accessToken = jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRATION
  });
  
  // Generar refresh token para mayor seguridad
  const refreshToken = jwt.sign(
    { id: user.id }, 
    config.JWT_SECRET, 
    { expiresIn: '7d' }
  );
  
  return {
    accessToken,
    refreshToken
  };
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
    
    if (!decoded || !decoded.id) {
      return null;
    }
    
    // Buscar usuario por ID
    const user = await userService.getUsers({ 
      idUsuario: decoded.id,
      includePermisos: true 
    });
    
    if (!user) {
      return null;
    }
    
    return generateToken(user);
  } catch (error) {
    console.error('Error al refrescar token:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  refreshAccessToken
}; 