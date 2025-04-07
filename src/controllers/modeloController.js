const modeloService = require('../services/modeloService');
const { handleError } = require('../utils/errorHandler');

const getAllModelos = async (req, res) => {
  try {
    const { id, nombre, año, color, cilindraje, idMarca, estado } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idModelo = parseInt(id, 10);
    if (nombre) filters.nombre = nombre;
    if (año) filters.año = parseInt(año, 10);
    if (color) filters.color = color;
    if (cilindraje) filters.cilindraje = cilindraje;
    if (idMarca) filters.idMarca = parseInt(idMarca, 10);
    if (estado) filters.estado = estado;
    
    const modelos = await modeloService.getAllModelos(filters);
    
    if (id && modelos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Modelo no encontrado',
        message: `No se encontró el modelo con ID ${id}`
      });
    }
    
    if (id && modelos.length > 0) {
      return res.status(200).json({
        success: true,
        data: modelos[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: modelos.length,
      data: modelos
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener modelos');
  }
};

const createModelo = async (req, res) => {
  try {
    const { nombre, año, color, cilindraje, idMarca } = req.body;
    
    // Validate data
    if (!nombre || !año || !idMarca) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El nombre, año y ID de marca son obligatorios'
      });
    }
    
    const newModelo = await modeloService.createModelo({
      nombre,
      año,
      color,
      cilindraje,
      idMarca
    });
    
    res.status(201).json({
      success: true,
      message: 'Modelo creado exitosamente',
      data: newModelo
    });
  } catch (error) {
    handleError(res, error, 'Error al crear modelo');
  }
};

const updateModelo = async (req, res) => {
  try {
    const modeloId = parseInt(req.body.idModelo || req.body.id);
    
    if (!modeloId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del modelo es obligatorio'
      });
    }
    
    const { nombre, año, color, cilindraje, idMarca, estado } = req.body;
    
    const updatedModelo = await modeloService.updateModelo(modeloId, {
      nombre,
      año,
      color,
      cilindraje,
      idMarca,
      estado
    });
    
    if (!updatedModelo) {
      return res.status(404).json({
        success: false,
        error: 'Modelo no encontrado',
        message: `No se encontró el modelo con ID ${modeloId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Modelo actualizado exitosamente',
      data: updatedModelo
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar modelo');
  }
};

const deleteModelo = async (req, res) => {
  try {
    const modeloId = parseInt(req.body.idModelo || req.body.id);
    
    if (!modeloId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del modelo es obligatorio'
      });
    }
    
    const result = await modeloService.deleteModelo(modeloId);
    
    if (!result.success) {
      if (result.message === 'Modelo en uso') {
        return res.status(400).json({
          success: false,
          error: 'Modelo en uso',
          message: 'No se puede eliminar este modelo porque hay vehículos asociados a él'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Modelo no encontrado',
        message: `No se encontró el modelo con ID ${modeloId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Modelo eliminado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar modelo');
  }
};

module.exports = {
  getAllModelos,
  createModelo,
  updateModelo,
  deleteModelo
};