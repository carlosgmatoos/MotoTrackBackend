const tipoUsuarioService = require('../services/tipoUsuarioService');
const { handleError } = require('../utils/errorHandler');

const getAllTiposUsuario = async (req, res) => {
  try {
    const tiposUsuario = await tipoUsuarioService.getAllTiposUsuario();
    
    res.status(200).json({
      success: true,
      count: tiposUsuario.length,
      data: tiposUsuario
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener tipos de usuario');
  }
};

const createTipoUsuario = async (req, res) => {
  try {
    const { nombre, descripcion, poderCrear, poderEditar, poderEliminar } = req.body;
    
    // Validar datos
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El nombre del tipo de usuario es obligatorio'
      });
    }
    
    const newTipo = await tipoUsuarioService.createTipoUsuario({
      nombre,
      descripcion,
      poderCrear,
      poderEditar,
      poderEliminar
    });
    
    res.status(201).json({
      success: true,
      message: 'Tipo de usuario creado exitosamente',
      data: newTipo
    });
  } catch (error) {
    handleError(res, error, 'Error al crear tipo de usuario');
  }
};

const updateTipoUsuario = async (req, res) => {
  try {
    const tipoId = parseInt(req.body.idTipoUsuario || req.body.id);
    
    if (!tipoId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del tipo de usuario es obligatorio'
      });
    }
    
    const { nombre, descripcion, poderCrear, poderEditar, poderEliminar } = req.body;
    
    const updatedTipo = await tipoUsuarioService.updateTipoUsuario(tipoId, {
      nombre,
      descripcion,
      poderCrear,
      poderEditar,
      poderEliminar
    });
    
    if (!updatedTipo) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de usuario no encontrado',
        message: `No se encontró el tipo de usuario con ID ${tipoId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Tipo de usuario actualizado exitosamente',
      data: updatedTipo
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar tipo de usuario');
  }
};

const deleteTipoUsuario = async (req, res) => {
  try {
    const tipoId = parseInt(req.body.idTipoUsuario || req.body.id);
    
    if (!tipoId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del tipo de usuario es obligatorio'
      });
    }
    
    const result = await tipoUsuarioService.deleteTipoUsuario(tipoId);
    
    if (!result.success) {
      if (result.message === 'Tipo en uso') {
        return res.status(400).json({
          success: false,
          error: 'Tipo en uso',
          message: 'No se puede eliminar este tipo de usuario porque hay usuarios asociados a él'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Tipo de usuario no encontrado',
        message: `No se encontró el tipo de usuario con ID ${tipoId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Tipo de usuario eliminado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar tipo de usuario');
  }
};

module.exports = {
  getAllTiposUsuario,
  createTipoUsuario,
  updateTipoUsuario,
  deleteTipoUsuario
};

      