const jwt = require('jsonwebtoken');
const config = require('../config');
const userService = require('./userService');

const createToken = (payload, expiresIn = config.JWT_EXPIRATION) => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    console.error('Error al verificar token JWT:', error.message);
    return null;
  }
};

const createAuthTokens = (user) => {
  const payload = {
    id: user.id,
    nombre: `${user.nombres} ${user.apellidos}`,
    correo: user.correo,
    role: user.role,
    permisos: user.permisos
  };
  
  const accessToken = createToken(payload);
  const refreshToken = createToken({ id: user.id }, '7d');
  
  return { accessToken, refreshToken };
};

const refreshTokens = async (refreshToken) => {
  const decoded = verifyToken(refreshToken);
  
  if (!decoded || !decoded.id) {
    return null;
  }
  
  const user = await userService.getUsers({ 
    idUsuario: decoded.id,
    includePermisos: true 
  });
  
  if (!user) {
    return null;
  }
  
  return createAuthTokens(user);
};

module.exports = {
  createToken,
  verifyToken,
  createAuthTokens,
  refreshTokens
}; 