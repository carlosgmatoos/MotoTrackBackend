const userService = require('../services/userService');
const jwtService = require('../services/jwtService');
const { handleError } = require('../utils/errorHandler');

const register = async (req, res) => {
  try {
    const { nombres, apellidos, correo, contrasena, cedula } = req.body;
    
    // Si el registro incluye cédula, verificamos que no exista una persona con esa cédula
    if (cedula) {
      const personaService = require('../services/personaService');
      const personaExistente = await personaService.getPersonaByCedula(cedula);
      
      if (personaExistente) {
        return res.status(400).json({
          success: false,
          error: 'Cédula en uso',
          message: 'Esta cédula ya está registrada'
        });
      }
    }
    
    // Verificar si el correo ya existe
    const existingUser = await userService.getUsers({ 
      correo, 
      exactMatch: true 
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Correo en uso',
        message: 'Este correo electrónico ya está registrado'
      });
    }
    
    // Por defecto, los usuarios registrados son clientes
    const idTipoUsuario = 3; // Cliente
    
    // Crear el usuario
    const newUser = await userService.createUser({
      nombres,
      apellidos,
      correo,
      contrasena,
      idTipoUsuario
    });
    
    // Si se proporcionó cédula, crear también el registro en Persona
    if (cedula) {
      const personaService = require('../services/personaService');
      await personaService.createPersona({
        nombres,
        apellidos,
        cedula,
        fechaNacimiento: req.body.fechaNacimiento || new Date(),
        estadoCivil: req.body.estadoCivil,
        sexo: req.body.sexo,
        telefono: req.body.telefono,
        idUbicacion: req.body.idUbicacion,
        idTipoPersona: 1, // Ciudadano (ajustar según tus datos)
        idUsuario: newUser.idusuario
      });
    }
    
    // Obtener usuario completo con permisos
    const user = await userService.getUsers({ 
      idUsuario: newUser.idusuario, 
      includePermisos: true 
    });
    
    // Generar tokens
    const tokens = jwtService.createAuthTokens(user);
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: user.id,
          nombres: user.nombres,
          apellidos: user.apellidos,
          correo: user.correo,
          role: user.role
        },
        ...tokens
      }
    });
  } catch (error) {
    handleError(res, error, 'Error al registrar usuario');
  }
};

const login = async (req, res) => {
  try {
    const { correo, contrasena } = req.body;
    
    // Autenticar usuario
    const user = await userService.authenticateUser(correo, contrasena);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas',
        message: 'Correo o contraseña incorrectos'
      });
    }
    
    // Generar tokens
    const tokens = jwtService.createAuthTokens(user);
    
    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      data: {
        user: {
          id: user.id,
          nombres: user.nombres,
          apellidos: user.apellidos,
          correo: user.correo,
          role: user.role,
          permisos: user.permisos
        },
        ...tokens
      }
    });
  } catch (error) {
    handleError(res, error, 'Error al iniciar sesión');
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Refrescar token
    const tokens = await jwtService.refreshTokens(refreshToken);
    
    if (!tokens) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido',
        message: 'El token de actualización es inválido o ha expirado'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Token actualizado exitosamente',
      data: tokens
    });
  } catch (error) {
    handleError(res, error, 'Error al refrescar token');
  }
};

module.exports = {
  register,
  login,
  refreshToken
}; 

