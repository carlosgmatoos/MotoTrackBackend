const personaService = require('../services/personaService');
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
    // Verificar que hay un usuario autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado',
        message: 'Debe iniciar sesión para crear un perfil personal'
      });
    }
    
    // Construir datos de la persona utilizando información del usuario autenticado
    const personaData = {
      ...req.body,
      nombres: req.user.nombres, // Usar siempre los datos del usuario autenticado
      apellidos: req.user.apellidos,
      idUsuario: req.user.id // Asociar con el usuario autenticado
    };
    
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
    
    // Si no se proporciona el idTipoPersona, obtener uno por defecto según el tipo de usuario
    if (!personaData.idTipoPersona) {
      // Determinar el nombre del cargo basado en el tipo de usuario
      let cargoNombre = 'General';
      
      if (req.user.tipoUsuario) {
        // Si es empleado o admin, usar un cargo específico
        if (req.user.tipoUsuario.nombre === 'Empleado') {
          cargoNombre = req.body.cargo || 'Oficial';
        } else if (req.user.tipoUsuario.nombre === 'Administrador') {
          cargoNombre = req.body.cargo || 'Director';
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
    // Verificar que hay un usuario autenticado
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'No autorizado',
        message: 'Debe iniciar sesión para actualizar un perfil personal'
      });
    }
    
    const personaId = req.body.idPersona || req.body.id;
    
    if (!personaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Se requiere el ID de la persona'
      });
    }
    
    // Obtener la persona para verificar permisos
    const persona = await personaService.getPersonaById(personaId);
    
    if (!persona) {
      return res.status(404).json({
        success: false,
        error: 'No encontrado',
        message: 'El perfil personal no existe'
      });
    }
    
    // Verificar permisos: solo puede actualizar su propio perfil o ser admin/empleado
    const isOwnProfile = persona.idusuario === req.user.id;
    const isAdminOrEmployee = 
      req.user.tipoUsuario?.nombre === 'Administrador' || 
      req.user.tipoUsuario?.nombre === 'Empleado';
      
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
    
    // No permitir cambiar nombres/apellidos a menos que sea admin
    if (!isAdminOrEmployee) {
      delete personaData.nombres;
      delete personaData.apellidos;
    }
    
    const updatedPersona = await personaService.updatePersona(personaId, personaData);
    
    return res.status(200).json({
      success: true,
      message: 'Perfil personal actualizado exitosamente',
      data: updatedPersona
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
    
    // No permitir eliminar perfiles asociados a usuarios activos
    if (persona.idusuario) {
      return res.status(400).json({
        success: false,
        error: 'Operación no permitida',
        message: 'No se puede eliminar un perfil asociado a un usuario activo. Deshabilite el usuario primero.'
      });
    }
    
    await personaService.deletePersona(personaId);
    
    return res.status(200).json({
      success: true,
      message: 'Perfil personal eliminado exitosamente'
    });
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