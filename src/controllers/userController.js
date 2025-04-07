const userService = require('../services/userService');
const { handleError } = require('../utils/errorHandler');
const { validateEmail, validatePassword } = require('../utils/validators');

const getUsers = async (req, res) => {
  try {
    // Extraer filtros de la consulta
    const { nombres, apellidos, correo, estado, idTipoUsuario } = req.query;
    
    // Construir objeto de filtros
    const filters = {};
    if (nombres) filters.nombres = nombres;
    if (apellidos) filters.apellidos = apellidos;
    if (correo) filters.correo = correo;
    if (estado) filters.estado = estado;
    if (idTipoUsuario) filters.idTipoUsuario = parseInt(idTipoUsuario, 10);
    
    const users = await userService.getUsers(filters);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    handleError(res, error, 'Error al obtener usuarios');
  }
};

const createUser = async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: newUser
    });
  } catch (error) {
    handleError(res, error, 'Error al crear usuario');
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.body.idUsuario || req.body.id);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del usuario es obligatorio'
      });
    }
    
    const updatedUser = await userService.updateUser(userId, req.body);
    
    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: updatedUser
    });
  } catch (error) {
    handleError(res, error, 'Error al actualizar usuario');
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.body.idUsuario || req.body.id);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Datos incompletos',
        message: 'El ID del usuario es obligatorio'
      });
    }
    
    const result = await userService.deleteUser(userId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado',
        message: 'No se encontró un usuario con el ID proporcionado'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Usuario deshabilitado exitosamente'
    });
  } catch (error) {
    handleError(res, error, 'Error al deshabilitar usuario');
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
}; 
