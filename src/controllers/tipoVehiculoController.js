const tipoVehiculoService = require('../services/tipoVehiculoService');
const { handleError } = require('../utils/errorHandler');

const getAllTiposVehiculo = async (req, res) => {
  try {
    const { id, nombre, capacidad, estado } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idTipoVehiculo = parseInt(id, 10);
    if (nombre) filters.nombre = nombre;
    if (capacidad) filters.capacidad = parseInt(capacidad, 10);
    if (estado) filters.estado = estado;
    
    const tiposVehiculo = await tipoVehiculoService.getAllTiposVehiculo(filters);
    
    if (id && tiposVehiculo.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de vehículo no encontrado',
        message: `No se encontró el tipo de vehículo con ID ${id}`
      });
    }
    
    if (id && tiposVehiculo.length > 0) {
      return res.status(200).json({
        success: true,
        data: tiposVehiculo[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: tiposVehiculo.length,
      data: tiposVehiculo
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener tipos de vehículo');
  }
};

const createTipoVehiculo = async (req, res) => {
  try {
    const { nombre, capacidad } = req.body;
    
    // Validate data
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El nombre del tipo de vehículo es obligatorio'
      });
    }
    
    const newTipoVehiculo = await tipoVehiculoService.createTipoVehiculo({
      nombre,
      capacidad
    });
    
    res.status(201).json({
      success: true,
      message: 'Tipo de vehículo creado exitosamente',
      data: newTipoVehiculo
    });
  } catch (error) {
    handleError(res, error, 'Error al crear tipo de vehículo');
  }
};

const updateTipoVehiculo = async (req, res) => {
  try {
    const tipoVehiculoId = parseInt(req.body.idTipoVehiculo || req.body.id);
    
    if (!tipoVehiculoId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del tipo de vehículo es obligatorio'
      });
    }
    
    const { nombre, capacidad, estado } = req.body;
    
    const updatedTipoVehiculo = await tipoVehiculoService.updateTipoVehiculo(tipoVehiculoId, {
      nombre,
      capacidad,
      estado
    });
    
    if (!updatedTipoVehiculo) {
      return res.status(404).json({
        success: false,
        error: 'Tipo de vehículo no encontrado',
        message: `No se encontró el tipo de vehículo con ID ${tipoVehiculoId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Tipo de vehículo actualizado exitosamente',
      data: updatedTipoVehiculo
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar tipo de vehículo');
  }
};

const deleteTipoVehiculo = async (req, res) => {
  try {
    const tipoVehiculoId = parseInt(req.body.idTipoVehiculo || req.body.id);
    
    if (!tipoVehiculoId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del tipo de vehículo es obligatorio'
      });
    }
    
    const result = await tipoVehiculoService.deleteTipoVehiculo(tipoVehiculoId);
    
    if (!result.success) {
      if (result.message === 'Tipo de vehículo en uso') {
        return res.status(400).json({
          success: false,
          error: 'Tipo de vehículo en uso',
          message: 'No se puede eliminar este tipo de vehículo porque hay vehículos asociados a él'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Tipo de vehículo no encontrado',
        message: `No se encontró el tipo de vehículo con ID ${tipoVehiculoId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Tipo de vehículo eliminado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar tipo de vehículo');
  }
};

module.exports = {
  getAllTiposVehiculo,
  createTipoVehiculo,
  updateTipoVehiculo,
  deleteTipoVehiculo
}; 