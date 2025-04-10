const userService = require('../services/userService');
const { handleError } = require('../utils/errorHandler');
const { validateEmail, validatePassword } = require('../utils/validators');

const getUsers = async (req, res) => {
  try {
    // Extraer filtros de la consulta
    const { nombres, apellidos, correo, estado, idTipoUsuario } = req.query;
    
    // Construir objeto de filtros
    const filters = {};
    if (nombres) filters.nombres = nombres;
    if (apellidos) filters.apellidos = apellidos;
    if (correo) filters.correo = correo;
    if (estado) filters.estado = estado;
    if (idTipoUsuario) filters.idTipoUsuario = parseInt(idTipoUsuario, 10);
    
    const users = await userService.getUsers(filters);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener usuarios');
  }
};

const createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    });
  } catch (error) {
    handleError(res, error, 'Error al crear usuario');
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.body.idUsuario || req.body.id);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del usuario es obligatorio'
      });
    }
    
    const updatedUser = await userService.updateUser(userId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar usuario');
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.body.idUsuario || req.body.id);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del usuario es obligatorio'
      });
    }
    
    const result = await userService.deleteUser(userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'No se encontró un usuario con el ID proporcionado'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Usuario y datos personales deshabilitados exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al deshabilitar usuario');
  }
};

const updateProfile = async (req, res) => {
  try {
    // El ID del usuario lo obtenemos del token
    const userId = req.user.id;
    
    const { nombres, apellidos, correo, ftPerfil } = req.body;
    
    // Validar correo si se proporciona
    if (correo && !validateEmail(correo)) {
      return res.status(400).json({
        success: false,
        error: 'Correo inválido',
        message: 'El formato del correo electrónico no es válido'
      });
    }
    
    // Validar la foto de perfil si se proporciona
    if (ftPerfil && !ftPerfil.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido',
        message: 'La imagen debe estar en formato base64 (data:image/...)'
      });
    }
    
    const updatedProfile = await userService.updateUserProfile(userId, {
      nombres,
      apellidos,
      correo,
      ftPerfil
    });
    
    if (!updatedProfile) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'No se proporcionaron datos para actualizar'
      });
    }
    
    // Obtener los datos completos del usuario actualizado, incluyendo datos personales
    const updatedUser = await userService.getUsers({
      idUsuario: userId,
      includePersonaData: true
    });
    
    res.status(200).json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        id: updatedUser.id,
        nombres: updatedUser.nombres,
        apellidos: updatedUser.apellidos,
        correo: updatedUser.correo,
        ftPerfil: updatedUser.ftPerfil,
        fechaCreacion: updatedUser.fechaCreacion,
        datosPersonales: updatedUser.datosPersonales
      }
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar perfil');
  }
};

const updateProfilePicture = async (req, res) => {
  try {
    // El ID del usuario lo obtenemos del token
    const userId = req.user.id;
    
    const { ftPerfil } = req.body;
    
    if (!ftPerfil) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'La imagen de perfil es obligatoria'
      });
    }
    
    // Validar que la cadena contenga datos de imagen
    if (!ftPerfil.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        error: 'Formato inválido',
        message: 'La imagen debe estar en formato base64 (data:image/...)'
      });
    }
    
    // Actualizar solo la foto de perfil
    const updatedProfile = await userService.updateUserProfile(userId, { ftPerfil });
    
    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'No se encontró el usuario para actualizar su foto de perfil'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Foto de perfil actualizada exitosamente',
      data: {
        ftPerfil: updatedProfile.ftperfil
      }
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar foto de perfil');
  }
};

const changePassword = async (req, res) => {
  try {
    // El ID del usuario lo obtenemos del token
    const userId = req.user.id;
    
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Validar que se proporcionaron todos los campos necesarios
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Todos los campos son obligatorios'
      });
    }
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Contraseñas no coinciden',
        message: 'La nueva contraseña y su confirmación no coinciden'
      });
    }
    
    // Validar formato de la nueva contraseña
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Contraseña inválida',
        message: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'
      });
    }
    
    const result = await userService.changePassword(userId, {
      currentPassword,
      newPassword
    });
    
    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });
  } catch (error) {
    if (error.message === 'La contraseña actual es incorrecta') {
      return res.status(400).json({
        success: false,
        error: 'Contraseña incorrecta',
        message: error.message
      });
    }
    handleError(res, error, 'Error al cambiar contraseña');
  }
};

/**
 * Obtiene la información del perfil del usuario utilizando su token
 */
const getProfileFromToken = async (req, res) => {
  try {
    // El ID del usuario lo obtenemos del token (ya parseado por el middleware de autenticación)
    const userId = req.user.id;
    
    // Obtener información completa del usuario incluyendo datos personales y permisos
    const user = await userService.getUsers({
      idUsuario: userId,
      includePermisos: true,
      includePersonaData: true
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'No se pudo encontrar el usuario asociado al token'
      });
    }
    
    // Preparar respuesta con datos completos
    const profileData = {
      id: user.id,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      ftPerfil: user.ftPerfil,
      fechaCreacion: user.fechaCreacion,
      role: user.role,
      permisos: user.permisos
    };
    
    // Incluir datos personales si existen
    if (user.datosPersonales) {
      profileData.datosPersonales = user.datosPersonales;
    }
    
    res.status(200).json({
      success: true,
      data: profileData
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener perfil del usuario');
  }
};

const getAdminAndEmployeeUsers = async (req, res) => {
  try {
    // Extraer filtros de la consulta
    const { nombres, apellidos, cedula, cargo, estado } = req.query;
    
    // Construir objeto de filtros
    const filters = {};
    if (nombres) filters.nombres = nombres;
    if (apellidos) filters.apellidos = apellidos;
    if (cedula) filters.cedula = cedula;
    if (cargo) filters.cargo = cargo;
    if (estado) filters.estado = estado;
    
    const users = await userService.getAdminAndEmployeeUsers(filters);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener usuarios administradores y empleados');
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  updateProfilePicture,
  changePassword,
  getProfileFromToken,
  getAdminAndEmployeeUsers
}; 
