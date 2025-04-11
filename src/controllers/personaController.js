const personaService = require('../services/personaService');
const userService = require('../services/userService');
const { handleError } = require('../utils/errorHandler');
const tipoPersonaService = require('../services/tipoPersonaService');

const getPersonas = async (req, res) => {
  try {
    const filtros = req.query;
    const personas = await personaService.getAllPersonas(filtros);
    return res.status(200).json({
      success: true,
      data: personas
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const createPersona = async (req, res) => {
  try {
    // Verificar si se proporcionó idUsuario o se quiere crear un nuevo usuario
    const { idUsuario, crearUsuario, datosUsuario } = req.body;
    
    let personaData = { ...req.body };
    
    if (crearUsuario === true && datosUsuario) {
      // Crear un nuevo usuario y luego la persona asociada
      const { correo, contrasena, idTipoUsuario } = datosUsuario;
      
      if (!correo || !contrasena || !idTipoUsuario) {
        return res.status(400).json({
          success: false,
          error: 'Datos incompletos',
          message: 'Para crear un usuario se requiere correo, contraseña y tipo de usuario'
        });
      }
      
      // Crear nuevo usuario
      const userData = {
        nombres: personaData.nombres,
        apellidos: personaData.apellidos,
        correo,
        contrasena,
        idTipoUsuario
      };
      
      const newUser = await userService.createUser(userData);
      
      // Asignar el ID del nuevo usuario a la persona
      personaData.idUsuario = newUser.idusuario;
    } else if (idUsuario) {
      // Asociar a un usuario existente
      // Verificar que el usuario existe
      const usuario = await userService.getUserById(idUsuario);
      
      if (!usuario) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
          message: 'El usuario al que intenta asociar no existe'
        });
      }
      
      // Verificar si ya existe un perfil para este usuario
      const existingProfile = await personaService.getPersonaByUsuarioId(idUsuario);
      
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          error: 'Perfil existente',
          message: 'Ya existe un perfil personal asociado a ese usuario',
          data: existingProfile
        });
      }
      
      // Usar los nombres y apellidos del usuario para mantener consistencia
      personaData.nombres = usuario.nombres;
      personaData.apellidos = usuario.apellidos;
    } else if (req.user && req.user.id) {
      // Asociar con el usuario autenticado
      personaData.idUsuario = req.user.id;
      personaData.nombres = req.user.nombres;
      personaData.apellidos = req.user.apellidos;
      
      // Verificar si ya existe un perfil para este usuario
      const existingProfile = await personaService.getPersonaByUsuarioId(req.user.id);
      
      if (existingProfile) {
        return res.status(400).json({
          success: false,
          error: 'Perfil existente',
          message: 'Ya existe un perfil personal asociado a tu cuenta',
          data: existingProfile
        });
      }
    }
    
    // Si no se proporciona el idTipoPersona, obtener uno por defecto según el tipo de usuario
    if (!personaData.idTipoPersona) {
      let cargoNombre = 'Ciudadano';
      
      // Si hay un usuario asociado o autenticado, usar su tipo
      const usuarioId = personaData.idUsuario || (req.user && req.user.id);
      
      if (usuarioId) {
        const usuario = await userService.getUserById(usuarioId);
        
        if (usuario && usuario.tipoUsuario) {
          if (usuario.tipoUsuario.nombre === 'Empleado') {
            cargoNombre = req.body.cargo || 'Oficial';
          } else if (usuario.tipoUsuario.nombre === 'Administrador') {
            cargoNombre = req.body.cargo || 'Director';
          }
        }
      }
      
      const tipoPersona = await tipoPersonaService.getTipoPersonaByNombre(cargoNombre);
      
      if (tipoPersona) {
        personaData.idTipoPersona = tipoPersona.idtipopersona;
      }
    }
    
    // Crear la persona
    const newPersona = await personaService.createPersona(personaData);
    
    return res.status(201).json({
      success: true,
      message: 'Perfil personal creado exitosamente',
      data: newPersona
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePersona = async (req, res) => {
  try {
    const personaId = req.body.idPersona || req.body.id;
    
    if (!personaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Se requiere el ID de la persona'
      });
    }
    
    // Obtener la persona para verificar permisos y si tiene usuario asociado
    const persona = await personaService.getPersonaById(personaId);
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'No encontrado',
        message: 'El perfil personal no existe'
      });
    }
    
    // Verificar permisos: solo puede actualizar su propio perfil o ser admin/empleado
    let isOwnProfile = false;
    let isAdminOrEmployee = false;
    
    if (req.user) {
      isOwnProfile = persona.idusuario === req.user.id;
      isAdminOrEmployee = 
        req.user.tipoUsuario?.nombre === 'Administrador' || 
        req.user.tipoUsuario?.nombre === 'Empleado';
    }
      
    if (!isOwnProfile && !isAdminOrEmployee) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'No tienes permiso para actualizar este perfil'
      });
    }
    
    // No permitir cambiar el usuario asociado
    const personaData = { ...req.body };
    delete personaData.idUsuario; // Evitar cambios en la relación usuario-persona
    
    // Verificar si hay que actualizar también el usuario asociado
    const { actualizarUsuario, nombres, apellidos } = req.body;
    
    // Iniciar transacción: actualizar persona y usuario asociado si es necesario
    let updatedPersona = null;
    let updatedUser = null;
    
    if (persona.idusuario && actualizarUsuario === true && (nombres || apellidos)) {
      // Crear objeto con datos de usuario a actualizar
      const userData = {};
      
      if (nombres) userData.nombres = nombres;
      if (apellidos) userData.apellidos = apellidos;
      
      // Actualizar el usuario asociado
      updatedUser = await userService.updateUser(persona.idusuario, userData);
      
      if (!updatedUser) {
        return res.status(404).json({
          success: false,
          error: 'Usuario no encontrado',
          message: 'No se pudo actualizar el usuario asociado'
        });
      }
      
    } else {
      // Si es un administrador o empleado, permitir actualizar nombres/apellidos en la persona
      if (!isAdminOrEmployee) {
        delete personaData.nombres;
        delete personaData.apellidos;
      }
    }
    
    // Actualizar persona
    updatedPersona = await personaService.updatePersona(personaId, personaData);
    
    return res.status(200).json({
      success: true,
      message: 'Perfil personal actualizado exitosamente',
      data: {
        persona: updatedPersona,
        usuario: updatedUser
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePersona = async (req, res) => {
  try {
    // Solo administradores pueden ejecutar este endpoint (verificado en routes)
    const personaId = req.body.idPersona || req.body.id;
    
    if (!personaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Se requiere el ID de la persona'
      });
    }
    
    // Obtener la persona para verificar si está asociada a un usuario
    const persona = await personaService.getPersonaById(personaId);
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'No encontrado',
        message: 'El perfil personal no existe'
      });
    }
    
    // Verificar si se debe deshabilitar también el usuario asociado
    const { deshabilitarUsuario = true } = req.body;
    
    // Si hay un usuario asociado y se solicita deshabilitarlo
    if (persona.idusuario && deshabilitarUsuario) {
      try {
        // Deshabilitar tanto la persona como el usuario asociado
        await userService.deleteUser(persona.idusuario);
        
        return res.status(200).json({
          success: true,
          message: 'Perfil personal y usuario asociado deshabilitados exitosamente'
        });
      } catch (error) {
        console.error('Error al deshabilitar usuario asociado:', error);
        return handleError(res, error, 'Error al deshabilitar usuario asociado');
      }
    } else {
      // Deshabilitar solo la persona sin afectar al usuario
      await personaService.deletePersona(personaId);
      
      return res.status(200).json({
        success: true,
        message: 'Perfil personal deshabilitado exitosamente'
      });
    }
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPersonas,
  createPersona,
  updatePersona,
  deletePersona
}; 