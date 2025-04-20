const express = require('express');
const multer = require('multer');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { authMiddleware, validateLogin, validateRegister, validateRefreshToken, isAdmin, isEmpleado } = require('../middlewares/authMiddleware');
const userValidationMiddleware = require('../middlewares/userValidationMiddleware');
const { validateFileUpload } = require('../middlewares/uploadValidationMiddleware');
const uploadController = require('../controllers/uploadController');
const userRouter = express.Router();

// ===== RUTAS PÚBLICAS =====

userRouter.post('/register', validateRegister, userValidationMiddleware.validateUserCreation, authController.register);
userRouter.post('/login', validateLogin, authController.login);
userRouter.post('/refresh-token', validateRefreshToken, authController.refreshToken);

// Obtener listado de usuarios (con filtros)
userRouter.get('/user', [authMiddleware, isAdmin], userController.getUsers);

// Obtener listado de usuarios administradores y empleados
userRouter.get('/adminEmployees', [authMiddleware, isAdmin], userController.getAdminAndEmployeeUsers);

// Obtener listado de empleados disponibles para asignar solicitudes
userRouter.get('/availableEmployees', [authMiddleware, isAdmin], userController.getAvailableEmployees);

// ===== RUTAS PARA USUARIO AUTENTICADO (ciudadano) =====

// Configuración de multer para manejo de archivos
const upload = multer({
storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB límite
  }
});

// Rutas protegidas con autenticación y validación
userRouter.post('/profilePicture', authMiddleware, upload.single('file'), validateFileUpload, uploadController.uploadToSupabase);
userRouter.put('/profile', authMiddleware, userController.updateProfile);
userRouter.put('/changePassword', authMiddleware, userController.changePassword);
userRouter.get('/profileToken', authMiddleware, userController.getProfileFromToken);

// ===== RUTAS SOLO PARA ADMINISTRADORES =====

userRouter.post('/user', [authMiddleware, isAdmin], userValidationMiddleware.validateUserCreation, userController.createUser);
userRouter.put('/user', [authMiddleware, isAdmin], userValidationMiddleware.validateUserUpdate, userController.updateUser);
userRouter.delete('/user', [authMiddleware, isAdmin], userController.deleteUser);

module.exports = userRouter; 