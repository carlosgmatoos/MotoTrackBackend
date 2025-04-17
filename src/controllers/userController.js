const userService = require('../services/userService');
const { handleError } = require('../utils/errorHandler');
const { validateEmail, validatePassword, validateUserCreationData, validateUserUpdateData } = require('../utils/validators');

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
    // Verificar si el usuario es administrador (para crear empleados)
    const isAdmin = req.user && req.user.tipoUsuario && req.user.tipoUsuario.nombre === 'Administrador';
    const isCreatingEmployee = req.body.idTipoUsuario === 2; // Asumiendo que 2 es el ID para Empleado
    
    // Solo administradores pueden crear empleados
    if (isCreatingEmployee && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'Solo los administradores pueden crear empleados'
      });
    }
    
    // Validar datos de usuario usando el validador mejorado
    const { isValid, errors, datosPersonalesCombinados } = validateUserCreationData(req.body, isCreatingEmployee);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: errors.join(', ')
      });
    }
    
    // Extraer datos básicos del usuario
    const { 
      nombres, 
      apellidos, 
      correo, 
      contrasena, 
      idTipoUsuario,
      estado = 'activo'
    } = req.body;
    
    // Preparar los datos del usuario
    const userData = {
      nombres,
      apellidos,
      correo,
      contrasena,
      idTipoUsuario,
      estado
    };
    
    // Procesar datos de ubicación si se proporcionaron
    try {
      const { direccion, idMunicipio } = datosPersonalesCombinados;
      
      // Si tenemos dirección y municipio, crear ubicación
      if (direccion && idMunicipio) {
        const ubicacionService = require('../services/ubicacionService');
        const newUbicacion = await ubicacionService.createUbicacion({
          direccion,
          idMunicipio
        });
        
        if (newUbicacion) {
          datosPersonalesCombinados.idUbicacion = newUbicacion.id;
        }
      }
    } catch (error) {
      console.error('Error al procesar ubicación:', error);
    }
    
    // Usar idTipoPersona directamente si está en el body
    if (!datosPersonalesCombinados.idTipoPersona && req.body.idTipoPersona) {
      datosPersonalesCombinados.idTipoPersona = req.body.idTipoPersona;
    }
    
    // Asignar tipo de persona por defecto según el tipo de usuario si no se proporcionó
    if (!datosPersonalesCombinados.idTipoPersona) {
      try {
        const tipoPersonaService = require('../services/tipoPersonaService');
        let tipoPersonaNombre = 'Ciudadano';
        
        if (idTipoUsuario === 2) { // Empleado
          tipoPersonaNombre = 'Oficial';
        } else if (idTipoUsuario === 1) { // Administrador
          tipoPersonaNombre = 'Director';
        }
        
        const tipoPersona = await tipoPersonaService.getTipoPersonaByNombre(tipoPersonaNombre);
        if (tipoPersona) {
          datosPersonalesCombinados.idTipoPersona = tipoPersona.idtipopersona;
        }
      } catch (error) {
        console.error('Error al obtener tipo de persona:', error);
      }
    }
    
    // Añadir datos personales al usuario
    if (Object.keys(datosPersonalesCombinados).length > 0) {
      userData.datosPersonales = datosPersonalesCombinados;
    }
    
    // Crear el usuario (y la persona asociada)
    const newUser = await userService.createUser(userData);
    
    res.status(201).json({
      success: true,
      message: isCreatingEmployee ? 'Empleado creado exitosamente' : 'Usuario creado exitosamente',
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
    
    // Verificar si el usuario es empleado para aplicar validaciones adicionales
    let isUpdatingEmployee = false;
    if (req.body.idTipoUsuario === 2) {
      isUpdatingEmployee = true;
    } else {
      try {
        // Obtener el usuario actual para verificar su tipo
        const currentUser = await userService.getUserById(userId);
        isUpdatingEmployee = currentUser && currentUser.tipoUsuario && currentUser.tipoUsuario.id === 2;
      } catch (error) {
        console.error('Error al verificar tipo de usuario:', error);
      }
    }
    
    // Validar datos usando el validador mejorado
    const { isValid, errors, datosPersonalesCombinados } = validateUserUpdateData(req.body, isUpdatingEmployee);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Datos inválidos',
        message: errors.join(', ')
      });
    }
    
    // Extraer datos básicos del usuario
    const { 
      nombres, 
      apellidos, 
      correo, 
      contrasena, 
      estado,
      idTipoUsuario
    } = req.body;

    // Preparar los datos del usuario
    const userData = {};
    if (nombres) userData.nombres = nombres;
    if (apellidos) userData.apellidos = apellidos;
    if (correo) userData.correo = correo;
    if (contrasena) userData.contrasena = contrasena;
    if (estado) userData.estado = estado;
    if (idTipoUsuario) userData.idTipoUsuario = idTipoUsuario;
    
    // Procesar ubicación si es necesario
    try {
      const { direccion, idMunicipio } = datosPersonalesCombinados;
      
      // Si tenemos dirección y municipio, crear ubicación
      if (direccion && idMunicipio) {
        const ubicacionService = require('../services/ubicacionService');
        const newUbicacion = await ubicacionService.createUbicacion({
          direccion,
          idMunicipio
        });
        
        if (newUbicacion) {
          datosPersonalesCombinados.idUbicacion = newUbicacion.id;
        }
      }
    } catch (error) {
      console.error('Error al procesar ubicación:', error);
    }
    
    // Usar idTipoPersona directamente si está en el body
    if (!datosPersonalesCombinados.idTipoPersona && req.body.idTipoPersona) {
      datosPersonalesCombinados.idTipoPersona = req.body.idTipoPersona;
    }
    
    // Si se proporcionó un cargo pero no un ID de tipo persona, buscar el tipo por nombre
    if (req.body.cargo && !datosPersonalesCombinados.idTipoPersona) {
      try {
        const tipoPersonaService = require('../services/tipoPersonaService');
        const tipoPersona = await tipoPersonaService.getTipoPersonaByNombre(req.body.cargo);
        
        if (tipoPersona) {
          datosPersonalesCombinados.idTipoPersona = tipoPersona.idtipopersona;
        }
      } catch (error) {
        console.error('Error al obtener tipo de persona por cargo:', error);
      }
    }

    // Añadir datos personales al usuario
    if (Object.keys(datosPersonalesCombinados).length > 0) {
      userData.datosPersonales = datosPersonalesCombinados;
    }
    
    const updatedUser = await userService.updateUser(userId, userData);
    
    if (!updatedUser) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'No se pudo actualizar el usuario o el usuario no existe'
      });
    }
    
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
    
    // Restricción para que solo se puedan actualizar estos campos específicos
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
    
    // Preparar los datos del usuario (limitado a estos campos específicos)
    const userData = {};
    if (nombres) userData.nombres = nombres;
    if (apellidos) userData.apellidos = apellidos;
    if (correo) userData.correo = correo;
    if (ftPerfil) userData.ftPerfil = ftPerfil;
    
    // Si no hay campos para actualizar, retornar error
    if (Object.keys(userData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'No se proporcionaron datos para actualizar'
      });
    }
    
    const updatedProfile = await userService.updateUserProfile(userId, userData);
    
    if (!updatedProfile) {
      return res.status(400).json({
        success: false,
        error: 'Error al actualizar',
        message: 'No se pudo actualizar el perfil del usuario'
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
    const { id, nombres, apellidos, cedula, cargo, estado } = req.query;
    
    // Construir objeto de filtros
    const filters = {};
    if (id) filters.id = parseInt(id, 10);
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
