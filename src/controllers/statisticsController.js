const statisticsService = require('../services/statisticsService');
const { handleError } = require('../utils/errorHandler');
const personaService = require('../services/personaService');

/**
 * Obtener todas las estadísticas del sistema
 * Solo accesible para administradores
 */
const getSystemDashboard = async (req, res) => {
  try {
    // Extraer filtros de la solicitud
    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      idProvincia: req.query.idProvincia ? parseInt(req.query.idProvincia) : null,
      idMunicipio: req.query.idMunicipio ? parseInt(req.query.idMunicipio) : null,
      idMarca: req.query.idMarca ? parseInt(req.query.idMarca) : null,
      idTipoVehiculo: req.query.idTipoVehiculo ? parseInt(req.query.idTipoVehiculo) : null,
      periodo: req.query.periodo || 'mes', // valores posibles: semana, mes, trimestre, año
      vista: req.query.vista || 'completo',  // valores posibles: completo, matriculas, solicitudes, empleados, distribucion, tendencias
      año: req.query.año || new Date().getFullYear() // Asegurar que siempre haya un año disponible
    };
    
    const statistics = await statisticsService.getSystemStatistics(filtros);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener estadísticas del sistema');
  }
};

/**
 * Obtener estadísticas personales del ciudadano autenticado
 */
const getCiudadanoDashboard = async (req, res) => {
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
    
    const statistics = await statisticsService.getCiudadanoStatistics(idPersona);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener estadísticas personales');
  }
};

/**
 * Obtener estadísticas del empleado autenticado
 */
const getEmpleadoDashboard = async (req, res) => {
  try {
    // Añadir cabeceras para evitar caché en el navegador
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Obtener ID de la persona del empleado autenticado
    let idEmpleado = req.user.idPersona;
    
    // Si no se encuentra directamente, intentar buscar en los datos personales
    if (!idEmpleado && req.user.datosPersonales) {
      idEmpleado = req.user.datosPersonales.idPersona;
    }
    
    // Si todavía no se encuentra, buscar por el ID de usuario
    if (!idEmpleado) {
      const idUsuario = req.user.idUsuario || req.user.id;
      
      if (idUsuario) {
        try {
          const persona = await personaService.getPersonaByUsuarioId(idUsuario);
          if (persona) {
            idEmpleado = persona.idpersona;
          }
        } catch (error) {
          console.error('Error al buscar persona por usuario:', error);
        }
      }
    }
    
    if (!idEmpleado) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'No se encontraron datos de persona asociados a su usuario'
      });
    }
    
    // Extraer filtros de la solicitud
    const filtros = {
      fechaDesde: req.query.fechaDesde,
      fechaHasta: req.query.fechaHasta,
      idProvincia: req.query.idProvincia ? parseInt(req.query.idProvincia) : null,
      idMunicipio: req.query.idMunicipio ? parseInt(req.query.idMunicipio) : null,
      idMarca: req.query.idMarca ? parseInt(req.query.idMarca) : null,
      idTipoVehiculo: req.query.idTipoVehiculo ? parseInt(req.query.idTipoVehiculo) : null,
      periodo: req.query.periodo || 'mes', // valores posibles: semana, mes, trimestre, año
      año: req.query.año || new Date().getFullYear() // Asegurar que siempre haya un año disponible
    };
    
    const statistics = await statisticsService.getEmpleadoStatistics(idEmpleado, filtros);
    
    res.status(200).json({
      success: true,
      data: statistics
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener estadísticas del empleado');
  }
};

module.exports = {
  getSystemDashboard,
  getCiudadanoDashboard,
  getEmpleadoDashboard
}; 