const personaService = require('../services/personaService');
const { handleError } = require('../utils/errorHandler');

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
    // Si el usuario ya está autenticado, usamos los datos de la sesión
    const userData = req.user; // Suponiendo que tienes middleware que agrega el usuario a req
    const personaData = {
      ...req.body,
      nombres: userData.nombres || req.body.nombres,
      apellidos: userData.apellidos || req.body.apellidos
    };
    
    const newPersona = await personaService.createPersona(personaData);
    return res.status(201).json({
      success: true,
      message: 'Persona creada exitosamente',
      data: newPersona
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updatePersona = async (req, res) => {
  try {
    const id = req.body.idPersona || req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la persona'
      });
    }
    
    const personaData = req.body;
    const updatedPersona = await personaService.updatePersona(id, personaData);
    return res.status(200).json({
      success: true,
      message: 'Persona actualizada exitosamente',
      data: updatedPersona
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deletePersona = async (req, res) => {
  try {
    const id = req.body.idPersona || req.body.id;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere el ID de la persona'
      });
    }
    
    await personaService.deletePersona(id);
    return res.status(200).json({
      success: true,
      message: 'Persona eliminada exitosamente'
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const getEmpleados = async (req, res) => {
  try {
    // Utilizamos directamente la función getEmpleado del servicio
    const filtros = req.query;
    
    const empleados = await personaService.getEmpleado(filtros);
    
    return res.status(200).json({
      success: true,
      data: empleados,
      count: empleados.length,
      message: 'Lista de empleados obtenida con éxito'
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  getEmpleados
}; 