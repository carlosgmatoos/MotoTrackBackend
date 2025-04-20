# MotoTrack - Backend API

Sistema de Registro y Control de Motocicletas para Santo Domingo Este.

## Requisitos

- Node.js (v14 o superior)
- PostgreSQL
- Cuenta de Supabase (para almacenamiento de archivos)

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```
   npm install
   ```
3. Configurar el archivo `.env` a partir del `.env.example`
4. Iniciar el servidor:
   ```
   npm start
   ```

## Estructura

El proyecto sigue una arquitectura basada en servicios:

- **Controllers**: Manejan las solicitudes HTTP
- **Services**: Contienen la lógica de negocio
- **Routes**: Definen las rutas de la API
- **Middlewares**: Proporcionan funcionalidad adicional (autenticación, etc.)
- **Utils**: Funciones de utilidad

## Sistema de Notificaciones por Correo

El sistema incluye la capacidad de enviar notificaciones por correo electrónico en puntos clave del flujo de trabajo:

1. **Creación de solicitudes**: Cuando un ciudadano crea una nueva solicitud
2. **Asignación a empleado**: Cuando se asigna una solicitud a un empleado
3. **Procesamiento de solicitudes**: Cuando se aprueba o rechaza una solicitud

### Configuración del servicio de correo

Para habilitar las notificaciones por correo, configura las siguientes variables en tu archivo `.env`:

```
EMAIL_USER=tu_correo@gmail.com
EMAIL_PASSWORD=tu_contraseña_de_aplicacion
```

**Nota importante**: Si utilizas Gmail, debes generar una "Contraseña de aplicación" desde la configuración de seguridad de tu cuenta, no uses tu contraseña normal.

### Características del sistema de correo

- **Independiente de los procesos principales**: No interfiere con el funcionamiento normal del sistema
- **Manejo de errores robusto**: Los fallos en el envío de correos no afectan la funcionalidad principal
- **Diseño adaptado a la interfaz**: Las plantillas de correo reflejan el estilo visual de la interfaz
- **Adaptable a diferentes tipos de notificaciones**: Incluye plantillas específicas para cada tipo de notificación

### Personalización

El sistema de correo puede personalizarse modificando los siguientes archivos:

- `src/services/emailService.js`: Plantillas y configuración de correo
- `src/utils/emailHelper.js`: Integración con el sistema principal

## Endpoints principales

La documentación completa de la API está disponible en `/api/docs` cuando el servidor está en ejecución.

## Licencia

Software propietario - Dirección General de Transporte Terrestre de Santo Domingo Este. 