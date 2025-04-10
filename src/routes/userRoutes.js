const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authMiddleware, validateLogin, validateRegister, validateRefreshToken, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');
const userValidationMiddleware = require('../middlewares/userValidationMiddleware');
const userRouter = express.Router();

// ===== RUTAS PÚBLICAS =====

userRouter.post('/register', validateRegister, userValidationMiddleware.validateUserCreation, authController.register);
userRouter.post('/login', validateLogin, authController.login);
userRouter.post('/refresh-token', validateRefreshToken, authController.refreshToken);
// ===== RUTAS PARA EMPLEADOS Y ADMINISTRADORES =====

// Obtener listado de usuarios (con filtros)
userRouter.get('/user', [authMiddleware, isEmpleado], userController.getUsers);

// Obtener listado de usuarios administradores y empleados
userRouter.get('/adminEmployees', [authMiddleware, isEmpleado], userController.getAdminAndEmployeeUsers);

// ===== RUTAS PARA USUARIO AUTENTICADO (ciudadano) =====

userRouter.put('/profile', authMiddleware, userController.updateProfile);
userRouter.put('/profilePicture', authMiddleware, userController.updateProfilePicture);
userRouter.put('/changePassword', authMiddleware, userController.changePassword);
userRouter.get('/profileToken', authMiddleware, userController.getProfileFromToken);

// ===== RUTAS SOLO PARA ADMINISTRADORES =====

userRouter.post('/user', [authMiddleware, isAdmin], userValidationMiddleware.validateUserCreation, userController.createUser);
userRouter.put('/user', [authMiddleware, isAdmin], userValidationMiddleware.validateUserUpdate, userController.updateUser);
userRouter.delete('/user', [authMiddleware, isAdmin], userController.deleteUser);

module.exports = userRouter; 