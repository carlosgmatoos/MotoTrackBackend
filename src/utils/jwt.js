const jwt = require('jsonwebtoken');
const config = require('../config');

const generateToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRATION
  });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET);
  } catch (error) {
    console.error('Error al verificar token JWT:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
}; 