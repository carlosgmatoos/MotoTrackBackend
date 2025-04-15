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
    let personaId = req.body.idPersona || req.body.id;
    
    // Si no se proporciona ID, usar el del usuario autenticado
    if (!personaId && req.user) {
      // Buscar la persona asociada con el usuario autenticado
      const personaUsuario = await personaService.getPersonaByUsuarioId(req.user.id);
      if (personaUsuario) {
        personaId = personaUsuario.idpersona;
      } else {
        return res.status(404).json({
          success: false,
          error: 'Perfil no encontrado',
          message: 'No tienes un perfil personal asociado a tu cuenta'
        });
      }
    } else if (!personaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Se requiere el ID de la persona o estar autenticado'
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
    
    // Verificar permisos según el rol del usuario
    let isOwnProfile = false;
    let isAdmin = false;
    
    if (req.user) {
      isOwnProfile = persona.idusuario === req.user.id;
      isAdmin = req.user.tipoUsuario?.nombre === 'Administrador';
    }
    
    // Un administrador puede actualizar perfiles de empleados
    let canEditAsAdmin = false;
    if (isAdmin && !isOwnProfile) {
      // Verificar si la persona es un empleado
      if (persona && persona.idtipopersona) {
        const empleadoProfile = await personaService.getPersonaById(persona.idpersona);
        const usuarioEmpleado = empleadoProfile.idusuario ? 
          await userService.getUserById(empleadoProfile.idusuario) : null;
        
        if (usuarioEmpleado && usuarioEmpleado.tipoUsuario && 
            usuarioEmpleado.tipoUsuario.nombre === 'Empleado') {
          canEditAsAdmin = true;
        }
      }
    }
      
    // Solo permitir actualizar si es el propio perfil o si es admin actualizando a un empleado
    if (!isOwnProfile && !canEditAsAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'No tienes permiso para actualizar este perfil'
      });
    }
    
    // No permitir cambiar el usuario asociado
    const personaData = { ...req.body };
    delete personaData.idUsuario; // Evitar cambios en la relación usuario-persona
    
    // Extraer datos específicos para actualización
    const { 
      nombres, 
      apellidos, 
      cedula,
      fechaNacimiento,
      estadoCivil,
      sexo,
      telefono,
      // Datos de ubicación
      direccion,
      idMunicipio,
      municipio,
      idProvincia,
      provincia
    } = req.body;
    
    // Verificar si hay que actualizar también el usuario asociado
    if (persona.idusuario && (nombres || apellidos)) {
      // Actualizar el usuario asociado con nombres y apellidos
      const userData = {};
      if (nombres) userData.nombres = nombres;
      if (apellidos) userData.apellidos = apellidos;
      
      if (Object.keys(userData).length > 0) {
        const updatedUser = await userService.updateUser(persona.idusuario, userData);
        
        if (!updatedUser) {
          return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado',
            message: 'No se pudo actualizar el usuario asociado'
          });
        }
      }
    }
    
    // Manejar la actualización de ubicación (municipio y provincia)
    let ubicacionId = personaData.idUbicacion;
    
    try {
      // Si se proporciona información de ubicación, procesar la ubicación
      if (direccion || idMunicipio || municipio || idProvincia || provincia) {
        const ubicacionService = require('../services/ubicacionService');
        const municipioService = require('../services/municipioService');
        
        // Determinar el municipio a usar
        let municipioId = idMunicipio;
        
        // Si se proporciona nombre de municipio, buscar su ID
        if (!municipioId && municipio) {
          const municipios = await municipioService.getAllMunicipios({
            nombreMunicipio: municipio,
            idProvincia
          });
          
          if (municipios && municipios.length > 0) {
            municipioId = municipios[0].id;
          }
        }
        
        // Si se proporciona provincia pero no municipio, obtener un municipio de esa provincia
        if (!municipioId && idProvincia) {
          const municipios = await municipioService.getAllMunicipios({
            idProvincia,
            limit: 1
          });
          
          if (municipios && municipios.length > 0) {
            municipioId = municipios[0].id;
          }
        }
        
        // Si tenemos dirección y municipio, actualizar o crear ubicación
        if (direccion && municipioId) {
          // Si ya tiene ubicación, actualizarla
          if (persona.idubicacion) {
            const updatedUbicacion = await ubicacionService.updateUbicacion(
              persona.idubicacion,
              {
                direccion,
                idMunicipio: municipioId
              }
            );
            
            if (updatedUbicacion) {
              ubicacionId = updatedUbicacion.id;
            }
          } else {
            // Crear nueva ubicación
            const newUbicacion = await ubicacionService.createUbicacion({
              direccion,
              idMunicipio: municipioId
            });
            
            if (newUbicacion) {
              ubicacionId = newUbicacion.id;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error al procesar ubicación:', error);
    }
    
    // Actualizar la ubicación en los datos de la persona
    if (ubicacionId) {
      personaData.idUbicacion = ubicacionId;
    }
    
    // Actualizar persona
    const updatedPersona = await personaService.updatePersona(personaId, personaData);
    
    // Obtener los datos actualizados incluyendo la relación con ubicación
    const personaActualizada = await personaService.getPersonaById(personaId);
    
    return res.status(200).json({
      success: true,
      message: 'Perfil personal actualizado exitosamente',
      data: personaActualizada
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