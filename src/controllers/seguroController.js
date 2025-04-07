const seguroService = require('../services/seguroService');
const { handleError } = require('../utils/errorHandler');

const getAllSeguros = async (req, res) => {
  try {
    const { id, proveedor, numeroPoliza, estado } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idSeguro = parseInt(id, 10);
    if (proveedor) filters.proveedor = proveedor;
    if (numeroPoliza) filters.numeroPoliza = numeroPoliza;
    if (estado) filters.estado = estado;
    
    const seguros = await seguroService.getAllSeguros(filters);
    
    if (id && seguros.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Seguro no encontrado',
        message: `No se encontró el seguro con ID ${id}`
      });
    }
    
    if (id && seguros.length > 0) {
      return res.status(200).json({
        success: true,
        data: seguros[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: seguros.length,
      data: seguros
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener seguros');
  }
};

const createSeguro = async (req, res) => {
  try {
    const { proveedor, numeroPoliza } = req.body;
    
    // Validate data
    if (!proveedor || !numeroPoliza) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El proveedor y número de póliza son obligatorios'
      });
    }
    
    const newSeguro = await seguroService.createSeguro({
      proveedor,
      numeroPoliza
    });
    
    res.status(201).json({
      success: true,
      message: 'Seguro creado exitosamente',
      data: newSeguro
    });
  } catch (error) {
    if (error.message === 'Ya existe un seguro con ese número de póliza') {
      return res.status(400).json({
        success: false,
        error: 'Número de póliza duplicado',
        message: error.message
      });
    }
    handleError(res, error, 'Error al crear seguro');
  }
};

const updateSeguro = async (req, res) => {
  try {
    const seguroId = parseInt(req.body.idSeguro || req.body.id);
    
    if (!seguroId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del seguro es obligatorio'
      });
    }
    
    const { proveedor, numeroPoliza, estado } = req.body;
    
    const updatedSeguro = await seguroService.updateSeguro(seguroId, {
      proveedor,
      numeroPoliza,
      estado
    });
    
    if (!updatedSeguro) {
      return res.status(404).json({
        success: false,
        error: 'Seguro no encontrado',
        message: `No se encontró el seguro con ID ${seguroId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Seguro actualizado exitosamente',
      data: updatedSeguro
    });
  } catch (error) {
    if (error.message === 'Ya existe otro seguro con ese número de póliza') {
      return res.status(400).json({
        success: false,
        error: 'Número de póliza duplicado',
        message: error.message
      });
    }
    handleError(res, error, 'Error al actualizar seguro');
  }
};

const deleteSeguro = async (req, res) => {
  try {
    const seguroId = parseInt(req.body.idSeguro || req.body.id);
    
    if (!seguroId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del seguro es obligatorio'
      });
    }
    
    const result = await seguroService.deleteSeguro(seguroId);
    
    if (!result.success) {
      if (result.message === 'Seguro en uso') {
        return res.status(400).json({
          success: false,
          error: 'Seguro en uso',
          message: 'No se puede eliminar este seguro porque hay vehículos asociados a él'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Seguro no encontrado',
        message: `No se encontró el seguro con ID ${seguroId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Seguro eliminado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar seguro');
  }
};

module.exports = {
  getAllSeguros,
  createSeguro,
  updateSeguro,
  deleteSeguro
}; 