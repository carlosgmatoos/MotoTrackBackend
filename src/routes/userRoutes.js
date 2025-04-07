const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authMiddleware, validateLogin, validateRegister, validateRefreshToken, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');
const userValidationMiddleware = require('../middlewares/userValidationMiddleware');
const userRouter = express.Router();

// ===== RUTAS PÚBLICAS (sin autenticación) =====

userRouter.post('/register', validateRegister, userValidationMiddleware.validateUserCreation, authController.register);
userRouter.post('/login', validateLogin, authController.login);
userRouter.post('/refresh-token', validateRefreshToken, authController.refreshToken);

// ===== RUTAS PARA EMPLEADOS Y ADMINISTRADORES =====

// Obtener listado de usuarios (con filtros)
userRouter.get('/user', [authMiddleware, isEmpleado], userController.getUsers);

// ===== RUTAS SOLO PARA ADMINISTRADORES =====

userRouter.post('/user', [authMiddleware, isAdmin], userValidationMiddleware.validateUserCreation, userController.createUser);
userRouter.put('/user', [authMiddleware, isAdmin], userValidationMiddleware.validateUserUpdate, userController.updateUser);
userRouter.delete('/user', [authMiddleware, isAdmin], userController.deleteUser);

module.exports = userRouter; 