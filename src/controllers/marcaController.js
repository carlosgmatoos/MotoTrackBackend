const marcaService = require('../services/marcaService');
const { handleError } = require('../utils/errorHandler');

const getAllMarcas = async (req, res) => {
  try {
    const { id, nombre, estado } = req.query;
    
    // Build filters object
    const filters = {};
    if (id) filters.idMarca = parseInt(id, 10);
    if (nombre) filters.nombre = nombre;
    if (estado) filters.estado = estado;
    
    const marcas = await marcaService.getAllMarcas(filters);
    
    if (id && marcas.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Marca no encontrada',
        message: `No se encontró la marca con ID ${id}`
      });
    }
    
    if (id && marcas.length > 0) {
      return res.status(200).json({
        success: true,
        data: marcas[0]
      });
    }
    
    res.status(200).json({
      success: true,
      count: marcas.length,
      data: marcas
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener marcas');
  }
};

const createMarca = async (req, res) => {
  try {
    const { nombre } = req.body;
    
    // Validate data
    if (!nombre) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El nombre de la marca es obligatorio'
      });
    }
    
    const newMarca = await marcaService.createMarca({
      nombre
    });
    
    res.status(201).json({
      success: true,
      message: 'Marca creada exitosamente',
      data: newMarca
    });
  } catch (error) {
    handleError(res, error, 'Error al crear marca');
  }
};

const updateMarca = async (req, res) => {
  try {
    const marcaId = parseInt(req.body.idMarca || req.body.id);
    
    if (!marcaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la marca es obligatorio'
      });
    }
    
    const { nombre, estado } = req.body;
    
    const updatedMarca = await marcaService.updateMarca(marcaId, {
      nombre,
      estado
    });
    
    if (!updatedMarca) {
      return res.status(404).json({
        success: false,
        error: 'Marca no encontrada',
        message: `No se encontró la marca con ID ${marcaId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Marca actualizada exitosamente',
      data: updatedMarca
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar marca');
  }
};

const deleteMarca = async (req, res) => {
  try {
    const marcaId = parseInt(req.body.idMarca || req.body.id);
    
    if (!marcaId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID de la marca es obligatorio'
      });
    }
    
    const result = await marcaService.deleteMarca(marcaId);
    
    if (!result.success) {
      if (result.message === 'Marca en uso') {
        return res.status(400).json({
          success: false,
          error: 'Marca en uso',
          message: 'No se puede eliminar esta marca porque hay modelos asociados a ella'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Marca no encontrada',
        message: `No se encontró la marca con ID ${marcaId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Marca eliminada exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al eliminar marca');
  }
};

module.exports = {
  getAllMarcas,
  createMarca,
  updateMarca,
  deleteMarca
}; 