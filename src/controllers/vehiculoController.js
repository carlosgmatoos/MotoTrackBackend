const vehiculoService = require('../services/vehiculoService');
const { handleError } = require('../utils/errorHandler');

const getAllVehiculos = async (req, res) => {
  try {
    const { 
      id, chasis, tipoUso, idModelo, idPropietario, 
      idTipoVehiculo, idSeguro, idMatricula, estado 
    } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idVehiculo = parseInt(id, 10);
    if (chasis) filters.chasis = chasis;
    if (tipoUso) filters.tipoUso = tipoUso;
    if (idModelo) filters.idModelo = parseInt(idModelo, 10);
    if (idPropietario) filters.idPropietario = parseInt(idPropietario, 10);
    if (idTipoVehiculo) filters.idTipoVehiculo = parseInt(idTipoVehiculo, 10);
    if (idSeguro) filters.idSeguro = parseInt(idSeguro, 10);
    if (idMatricula) filters.idMatricula = parseInt(idMatricula, 10);
    if (estado) filters.estado = estado;
    
    const vehiculos = await vehiculoService.getAllVehiculos(filters);
    
    if (id && vehiculos.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado',
        message: `No se encontró el vehículo con ID ${id}`
      });
    }
    
    if (id && vehiculos.length > 0) {
      return res.status(200).json({
        success: true,
        data: vehiculos[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: vehiculos.length,
      data: vehiculos
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener vehículos');
  }
};

const createVehiculo = async (req, res) => {
  try {
    const { 
      chasis, tipoUso, idModelo, idPropietario, 
      idTipoVehiculo, idSeguro, idMatricula 
    } = req.body;
    
    // Validate data
    if (!chasis || !tipoUso || !idModelo || !idPropietario || !idTipoVehiculo || !idSeguro) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'Chasis, tipo de uso, modelo, propietario, tipo de vehículo y seguro son obligatorios'
      });
    }
    
    const newVehiculo = await vehiculoService.createVehiculo({
      chasis,
      tipoUso,
      idModelo,
      idPropietario,
      idTipoVehiculo,
      idSeguro,
      idMatricula
    });
    
    res.status(201).json({
      success: true,
      message: 'Vehículo creado exitosamente',
      data: newVehiculo
    });
  } catch (error) {
    if (error.message === 'Ya existe un vehículo con ese número de chasis') {
      return res.status(400).json({
        success: false,
        error: 'Chasis duplicado',
        message: error.message
      });
    }
    handleError(res, error, 'Error al crear vehículo');
  }
};

const updateVehiculo = async (req, res) => {
  try {
    const vehiculoId = parseInt(req.body.idVehiculo || req.body.id);
    
    if (!vehiculoId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del vehículo es obligatorio'
      });
    }
    
    const { 
      chasis, tipoUso, idModelo, idPropietario, 
      idTipoVehiculo, idSeguro, idMatricula, estado 
    } = req.body;
    
    const updatedVehiculo = await vehiculoService.updateVehiculo(vehiculoId, {
      chasis,
      tipoUso,
      idModelo,
      idPropietario,
      idTipoVehiculo,
      idSeguro,
      idMatricula,
      estado
    });
    
    if (!updatedVehiculo) {
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado',
        message: `No se encontró el vehículo con ID ${vehiculoId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Vehículo actualizado exitosamente',
      data: updatedVehiculo
    });
  } catch (error) {
    if (error.message === 'Ya existe otro vehículo con ese número de chasis') {
      return res.status(400).json({
        success: false,
        error: 'Chasis duplicado',
        message: error.message
      });
    }
    handleError(res, error, 'Error al actualizar vehículo');
  }
};

const deleteVehiculo = async (req, res) => {
  try {
    const vehiculoId = parseInt(req.body.idVehiculo || req.body.id);
    
    if (!vehiculoId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del vehículo es obligatorio'
      });
    }
    
    const result = await vehiculoService.deleteVehiculo(vehiculoId);
    
    if (!result.success) {
      if (result.message === 'Vehículo en uso') {
        return res.status(400).json({
          success: false,
          error: 'Vehículo en uso',
          message: 'No se puede eliminar este vehículo porque hay solicitudes asociadas a él'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Vehículo no encontrado',
        message: `No se encontró el vehículo con ID ${vehiculoId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Vehículo eliminado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar vehículo');
  }
};

module.exports = {
  getAllVehiculos,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo
}; 