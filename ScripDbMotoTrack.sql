CREATE TABLE Marca (
    idMarca SERIAL PRIMARY KEY,
    nombre VARCHAR(75) NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Modelo (
    idModelo SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    año INT NOT NULL,
    color VARCHAR(30),
    cilindraje VARCHAR(25),
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idMarca INT REFERENCES Marca(idMarca)
);

CREATE TABLE TipoVehiculo (
    idTipoVehiculo SERIAL PRIMARY KEY,
    nombre VARCHAR(75) NOT NULL,
    capacidad INT,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Seguro (
    idSeguro SERIAL PRIMARY KEY,
    proveedor VARCHAR(100) NOT NULL,
    numeroPoliza VARCHAR(15) NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Matricula (
    idMatricula SERIAL PRIMARY KEY,
    matriculaGenerada VARCHAR(8) NOT NULL,
	estado VARCHAR(15) CHECK (estado IN ('Generada', 'Pendiente', 'Cancelada', 'Transferida')),
    fechaEmisionMatricula DATE NOT NULL
);

CREATE TABLE TipoPersona (
    idTipoPersona SERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
	fechaCreacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Provincia (
    idProvincia SERIAL PRIMARY KEY,
    nombreProvincia VARCHAR(75) NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Municipio (
    idMunicipio SERIAL PRIMARY KEY,
    nombreMunicipio VARCHAR(75) NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idProvincia INT REFERENCES Provincia(idProvincia)
);

CREATE TABLE Ubicacion (
    idUbicacion SERIAL PRIMARY KEY,
    direccion TEXT NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idMunicipio INT REFERENCES Municipio(idMunicipio)
);

CREATE TABLE TipoUsuario (
    idTipoUsuario SERIAL PRIMARY KEY,
    nombre VARCHAR(15) CHECK (nombre IN ('Ciudadano', 'Empleado', 'Administrador')),
    poderCrear BOOLEAN,
    poderEditar BOOLEAN,
    poderEliminar BOOLEAN,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE Usuario (
    idUsuario SERIAL PRIMARY KEY,
    nombres VARCHAR(50) NOT NULL,
    apellidos VARCHAR(50) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    contrasena TEXT NOT NULL,
    ftPerfil TEXT,
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idTipoUsuario INT REFERENCES TipoUsuario(idTipoUsuario)
);

CREATE TABLE Persona (
    idPersona SERIAL PRIMARY KEY,
    nombres VARCHAR(50) NOT NULL,
    apellidos VARCHAR(50) NOT NULL,
    cedula VARCHAR(13) UNIQUE,
    fechaNacimiento DATE,
    estadoCivil VARCHAR(25),
    sexo VARCHAR(1) CHECK (sexo IN ('M', 'F')),
    telefono VARCHAR(15),
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idUbicacion INT REFERENCES Ubicacion(idUbicacion),
    idTipoPersona INT REFERENCES TipoPersona(idTipoPersona),
    idUsuario INT REFERENCES Usuario(idUsuario)
);

CREATE TABLE Vehiculo (
    idVehiculo SERIAL PRIMARY KEY,
    chasis VARCHAR(17) NOT NULL,
    tipoUso VARCHAR(15) NOT NULL CHECK (tipoUso IN ('Personal', 'Recreativo', 'Transporte', 'Deportivo', 'Empresarial')),
    estado VARCHAR(15) CHECK (estado IN ('activo', 'inactivo', 'deshabilitado')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idModelo INT REFERENCES Modelo(idModelo),
    idPropietario INT REFERENCES Persona(idPersona), 
    idMatricula INT REFERENCES Matricula(idMatricula),
    idTipoVehiculo INT REFERENCES TipoVehiculo(idTipoVehiculo),
    idSeguro INT REFERENCES Seguro(idSeguro)
);

CREATE TABLE Solicitud (
    idPersona INT REFERENCES Persona(idPersona),
    idEmpleado INT REFERENCES Persona(idPersona),
    idMatricula INT REFERENCES Matricula(idMatricula),
    idVehiculo INT REFERENCES Vehiculo(idVehiculo),
    docCedula TEXT,
    docLicencia TEXT,
    docSeguro TEXT,
    docFacturaVehiculo TEXT,
    estadoDecision VARCHAR(15) CHECK (estadoDecision IN ('Pendiente', 'Aprobada', 'Rechazada')),
    motivoRechazo TEXT,
    notaRevision TEXT,
    detalleRechazo TEXT,
    fechaRegistro DATE DEFAULT CURRENT_DATE,
    fechaProcesada TIMESTAMP,
    PRIMARY KEY (idPersona, idEmpleado, idVehiculo, idMatricula)
);

CREATE TABLE Notificaciones (
    idNotificacion SERIAL PRIMARY KEY,
    mensaje TEXT NOT NULL,
    titulo VARCHAR(75) NOT NULL,
    estado VARCHAR(15) CHECK (estado IN ('Pendiente', 'Enviada', 'Leida', 'Confirmada', 'Cancelada', 'Error')),
    fechaCreacion DATE DEFAULT CURRENT_DATE,
    idUsuario INT REFERENCES Usuario(idUsuario)
);