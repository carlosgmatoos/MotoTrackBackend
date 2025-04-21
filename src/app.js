process.removeAllListeners('warning');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { connectDB } = require('./db');
const config = require('./config');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const fs = require('fs');

// Importar rutas
const userRouter = require('./routes/userRoutes');
const tipoUsuarioRouter = require('./routes/tipoUsuarioRoutes');
const provinciaRouter = require('./routes/provinciaRoutes');
const municipioRouter = require('./routes/municipioRoutes');
const ubicacionRouter = require('./routes/ubicacionRoutes');
const personaRouter = require('./routes/personaRoutes');
const tipoPersonaRouter = require('./routes/tipoPersonaRoutes');
const marcaRouter = require('./routes/marcaRoutes');
const modeloRouter = require('./routes/modeloRoutes');
const tipoVehiculoRouter = require('./routes/tipoVehiculoRoutes');
const seguroRouter = require('./routes/seguroRoutes');
const vehiculoRouter = require('./routes/vehiculoRoutes');
const solicitudRouter = require('./routes/solicitudRoutes');
const matriculaRouter = require('./routes/matriculaRoutes');
const statisticsRouter = require('./routes/statisticsRoutes');
const contactRouter = require('./routes/contactRoutes');

// Cargar archivo swagger.yml
const swaggerFilePath = path.resolve(__dirname, 'swagger.yml');
let swaggerDocument;

try {
  const file = fs.readFileSync(swaggerFilePath, 'utf8');
  swaggerDocument = YAML.parse(file);
} catch (error) {
  console.error('Error al cargar el archivo swagger.yml:', error);
  swaggerDocument = {
    openapi: '3.0.0',
    info: {
      title: 'API MotoTrack',
      description: 'Api de Registro y Control de Motocicletas en Santo Domingo Este',
      version: '0.1.9'
    },
    paths: {}
  };
}

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration
const corsOptions = {
  origin: config.CORS_ORIGINS.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

connectDB();

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'API de MotoTrack funcionando correctamente' 
  });
});

// Rutas
app.use('/api', [
  userRouter,
  tipoUsuarioRouter,
  provinciaRouter,
  municipioRouter,
  ubicacionRouter,
  personaRouter,
  tipoPersonaRouter,
  marcaRouter,
  modeloRouter,
  tipoVehiculoRouter,
  seguroRouter,
  vehiculoRouter,
  solicitudRouter,
  matriculaRouter,
  statisticsRouter,
  contactRouter
]);

// Middleware para manejar rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'No encontrado', 
    message: 'La ruta solicitada no existe' 
  });
});

app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ 
    success: false,
    error: 'Error del servidor', 
    message: 'Ocurrió un error interno en el servidor' 
  });
});

const PORT = config.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

module.exports = app;
