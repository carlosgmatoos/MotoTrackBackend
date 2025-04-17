const matriculaService = require('../services/matriculaService');
const { handleError } = require('../utils/errorHandler');
const personaService = require('../services/personaService');

/**
 * Obtener todas las matrículas con información relacionada
 */
const obtenerMatriculasCompletas = async (req, res) => {
  try {
    const filtros = req.query;
    const matriculas = await matriculaService.obtenerMatriculasConInformacionRelacionada(filtros);
    
    res.status(200).json({
      success: true,
      count: matriculas.length,
      data: matriculas
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener matrículas');
  }
};

/**
 * Obtener una matrícula por ID con información relacionada
 */
const obtenerMatriculaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID inválido',
        message: 'Debe proporcionar el ID de la matrícula'
      });
    }
    
    const matricula = await matriculaService.obtenerMatriculaPorIdCompleta(id);
    
    if (!matricula) {
      return res.status(404).json({
        success: false,
        error: 'Matrícula no encontrada',
        message: `No se encontró la matrícula con ID ${id}`
      });
    }
    
    res.status(200).json({
      success: true,
      data: matricula
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener matrícula');
  }
};

/**
 * Obtener matrículas del usuario autenticado
 */
const obtenerMatriculasUsuario = async (req, res) => {
  try {
    // Obtener ID de la persona del usuario autenticado
    let idPersona = req.user.idPersona;
    
    // Si no se encuentra directamente, intentar buscar en los datos personales
    if (!idPersona && req.user.datosPersonales) {
      idPersona = req.user.datosPersonales.idPersona;
    }
    
    // Si todavía no se encuentra, buscar por el ID de usuario
    if (!idPersona) {
      const idUsuario = req.user.idUsuario || req.user.id;
      
      if (idUsuario) {
        try {
          const persona = await personaService.getPersonaByUsuarioId(idUsuario);
          if (persona) {
            idPersona = persona.idpersona;
          }
        } catch (error) {
          console.error('Error al buscar persona por usuario:', error);
        }
      }
    }
    
    if (!idPersona) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    const matriculas = await matriculaService.obtenerMatriculasPorPropietarioCompleta(idPersona);
    
    res.status(200).json({
      success: true,
      count: matriculas.length,
      data: matriculas
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener matrículas');
  }
};

/**
 * Obtener matrículas activas
 */
const obtenerMatriculasActivas = async (req, res) => {
  try {
    const filtros = req.query;
    const matriculas = await matriculaService.obtenerMatriculasActivas(filtros);
    
    res.status(200).json({
      success: true,
      count: matriculas.length,
      data: matriculas
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener matrículas activas');
  }
};

module.exports = {
  obtenerMatriculasCompletas,
  obtenerMatriculaPorId,
  obtenerMatriculasActivas,
  obtenerMatriculasUsuario
}; 