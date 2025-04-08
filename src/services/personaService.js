const { pool } = require('../db');

const getAllPersonas = async (filtros = {}) => {
  const {
    nombres,
    apellidos,
    cedula,
    tipoPersona,
    estado,
    limit = 100,
    offset = 0
  } = filtros;
  
  let query = `
    SELECT p.*, tp.nombre as tipoPersonaNombre, u.direccion, m.nombreMunicipio, pr.nombreProvincia
    FROM Persona p
    LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
    LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
    LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
    LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
    WHERE 1=1
  `;
  
  const queryParams = [];
  let paramCount = 1;
  
  if (nombres) {
    query += ` AND p.nombres ILIKE $${paramCount}`;
    queryParams.push(`%${nombres}%`);
    paramCount++;
  }
  
  if (apellidos) {
    query += ` AND p.apellidos ILIKE $${paramCount}`;
    queryParams.push(`%${apellidos}%`);
    paramCount++;
  }
  
  if (cedula) {
    query += ` AND p.cedula ILIKE $${paramCount}`;
    queryParams.push(`%${cedula}%`);
    paramCount++;
  }
  
  if (tipoPersona) {
    query += ` AND tp.nombre = $${paramCount}`;
    queryParams.push(tipoPersona);
    paramCount++;
  }
  
  if (estado) {
    query += ` AND p.estado = $${paramCount}`;
    queryParams.push(estado);
    paramCount++;
  } else {
    query += ` AND p.estado != 'deshabilitado'`;
  }
  
  query += ` ORDER BY p.idPersona`;
  
  if (limit !== null && offset !== null) {
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
  }
  
  const result = await pool.query(query, queryParams);
  return result.rows;
};

const getEmpleado = async (filtros = {}) => {
  const {
    nombres,
    apellidos,
    cedula,
    tipoPersona = 'Empleado' || 'empleado', // Por defecto filtra por tipo "Empleado"
    estado,
    limit = 100,
    offset = 0
  } = filtros;
  
  let query = `
    SELECT p.*, tp.nombre as tipoPersonaNombre, u.direccion, m.nombreMunicipio, pr.nombreProvincia
    FROM Persona p
    LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
    LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
    LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
    LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
    WHERE tp.nombre = 'empleado'
  `;
  
  const queryParams = [];
  let paramCount = 1;
  
  if (nombres) {
    query += ` AND p.nombres ILIKE $${paramCount}`;
    queryParams.push(`%${nombres}%`);
    paramCount++;
  }
  
  if (apellidos) {
    query += ` AND p.apellidos ILIKE $${paramCount}`;
    queryParams.push(`%${apellidos}%`);
    paramCount++;
  }
  
  if (cedula) {
    query += ` AND p.cedula ILIKE $${paramCount}`;
    queryParams.push(`%${cedula}%`);
    paramCount++;
  }
  
  if (estado) {
    query += ` AND p.estado = $${paramCount}`;
    queryParams.push(estado);
    paramCount++;
  } else {
    query += ` AND p.estado != 'deshabilitado'`;
  }
  
  query += ` ORDER BY p.idPersona`;
  
  if (limit !== null && offset !== null) {
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));
  }
  
  const result = await pool.query(query, queryParams);
  return result.rows;
};

const createPersona = async (personaData) => {
  // Verificar si ya existe una persona con esa cédula
  const checkQuery = `
    SELECT * FROM Persona
    WHERE cedula = $1 AND estado != 'deshabilitado'
  `;
  
  const checkResult = await pool.query(checkQuery, [personaData.cedula]);
  if (checkResult.rows.length > 0) {
    throw new Error('Ya existe una persona registrada con esta cédula');
  }
  
  const {
    nombres,
    apellidos,
    cedula,
    fechaNacimiento,
    estadoCivil,
    sexo,
    telefono,
    idUbicacion,
    idTipoPersona,
    idUsuario,
    estado = 'activo'
  } = personaData;
  
  const query = `
    INSERT INTO Persona (
      nombres, apellidos, cedula, fechaNacimiento, 
      estadoCivil, sexo, telefono, estado, 
      idUbicacion, idTipoPersona, idUsuario
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;
  
  const values = [
    nombres,
    apellidos,
    cedula,
    fechaNacimiento,
    estadoCivil,
    sexo,
    telefono,
    estado,
    idUbicacion,
    idTipoPersona,
    idUsuario
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

const updatePersona = async (id, personaData) => {
  // Verificar que la persona existe
  const checkQuery = `
    SELECT * FROM Persona
    WHERE idPersona = $1 AND estado != 'deshabilitado'
  `;
  
  const checkResult = await pool.query(checkQuery, [id]);
  
  if (checkResult.rows.length === 0) {
    throw new Error('Persona no encontrada');
  }
  
  // Si se está actualizando la cédula, verificar que no exista otra persona con esa cédula
  if (personaData.cedula) {
    const cedulaCheckQuery = `
      SELECT * FROM Persona
      WHERE cedula = $1 AND idPersona != $2 AND estado != 'deshabilitado'
    `;
    
    const cedulaCheckResult = await pool.query(cedulaCheckQuery, [personaData.cedula, id]);
    if (cedulaCheckResult.rows.length > 0) {
      throw new Error('Ya existe otra persona registrada con esta cédula');
    }
  }
  
  const {
    nombres,
    apellidos,
    cedula,
    fechaNacimiento,
    estadoCivil,
    sexo,
    telefono,
    idUbicacion,
    idTipoPersona,
    idUsuario,
    estado
  } = personaData;
  
  let updateFields = [];
  let queryParams = [];
  let paramCount = 1;
  
  if (nombres) {
    updateFields.push(`nombres = $${paramCount}`);
    queryParams.push(nombres);
    paramCount++;
  }
  
  if (apellidos) {
    updateFields.push(`apellidos = $${paramCount}`);
    queryParams.push(apellidos);
    paramCount++;
  }
  
  if (cedula) {
    updateFields.push(`cedula = $${paramCount}`);
    queryParams.push(cedula);
    paramCount++;
  }
  
  if (fechaNacimiento) {
    updateFields.push(`"fechaNacimiento" = $${paramCount}`);
    queryParams.push(fechaNacimiento);
    paramCount++;
  }
  
  if (estadoCivil) {
    updateFields.push(`"estadoCivil" = $${paramCount}`);
    queryParams.push(estadoCivil);
    paramCount++;
  }
  
  if (sexo) {
    updateFields.push(`sexo = $${paramCount}`);
    queryParams.push(sexo);
    paramCount++;
  }
  
  if (telefono) {
    updateFields.push(`telefono = $${paramCount}`);
    queryParams.push(telefono);
    paramCount++;
  }
  
  if (idUbicacion) {
    updateFields.push(`"idUbicacion" = $${paramCount}`);
    queryParams.push(idUbicacion);
    paramCount++;
  }
  
  if (idTipoPersona) {
    updateFields.push(`"idTipoPersona" = $${paramCount}`);
    queryParams.push(idTipoPersona);
    paramCount++;
  }
  
  if (idUsuario) {
    updateFields.push(`"idUsuario" = $${paramCount}`);
    queryParams.push(idUsuario);
    paramCount++;
  }
  
  if (estado) {
    updateFields.push(`estado = $${paramCount}`);
    queryParams.push(estado);
    paramCount++;
  }
  
  if (updateFields.length === 0) {
    throw new Error('No se proporcionaron campos para actualizar');
  }
  
  queryParams.push(id);
  
  const query = `
    UPDATE Persona
    SET ${updateFields.join(', ')}
    WHERE idPersona = $${paramCount}
    RETURNING *
  `;
  
  const result = await pool.query(query, queryParams);
  return result.rows[0];
};

const deletePersona = async (id) => {
  // Marcar como deshabilitado en lugar de eliminar
  const query = `
    UPDATE Persona
    SET estado = 'deshabilitado'
    WHERE idPersona = $1
    RETURNING *
  `;
  
  const result = await pool.query(query, [id]);
  
  if (result.rows.length === 0) {
    throw new Error('Persona no encontrada');
  }
  
  return result.rows[0];
};

module.exports = {
  getAllPersonas,
  getEmpleado,
  createPersona,
  updatePersona,
  deletePersona
}; 