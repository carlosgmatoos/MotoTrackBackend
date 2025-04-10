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
  try {
    // Start a transaction to ensure both operations succeed or fail together
    await pool.query('BEGIN');
    
    try {
      // First, check if the persona record exists and get its user ID
      const personaResult = await pool.query(
        'SELECT idUsuario FROM Persona WHERE idPersona = $1',
        [id]
      );
      
      if (personaResult.rows.length === 0) {
        throw new Error('Persona no encontrada');
      }
      
      // Disable the persona record
      const result = await pool.query(
        `UPDATE Persona
         SET estado = 'deshabilitado'
         WHERE idPersona = $1
         RETURNING *`,
        [id]
      );
      
      // If there's an associated User, mark it as disabled too
      const idUsuario = personaResult.rows[0].idusuario;
      if (idUsuario) {
        await pool.query(
          'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2',
          ['deshabilitado', idUsuario]
        );
      }
      
      // Commit the transaction if everything succeeded
      await pool.query('COMMIT');
      
      return result.rows[0];
    } catch (error) {
      // If there's any error, roll back the transaction
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al deshabilitar persona:', error);
    throw error;
  }
};

const getPersonaByCedula = async (cedula) => {
  const query = `
    SELECT * FROM Persona
    WHERE cedula = $1 AND estado != 'deshabilitado'
  `;
  
  const result = await pool.query(query, [cedula]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const getPersonaByUsuarioId = async (usuarioId) => {
  try {
    const query = `
      SELECT p.*, tp.nombre as tipoPersonaNombre, u.direccion, m.nombreMunicipio, pr.nombreProvincia
      FROM Persona p
      LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
      LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
      WHERE p.idUsuario = $1 AND p.estado != 'deshabilitado'
    `;
    
    const result = await pool.query(query, [usuarioId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error al obtener persona por ID de usuario ${usuarioId}:`, error);
    throw error;
  }
};

const getPersonaById = async (personaId) => {
  try {
    const query = `
      SELECT p.*, tp.nombre as tipoPersonaNombre, u.direccion, m.nombreMunicipio, pr.nombreProvincia
      FROM Persona p
      LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
      LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
      WHERE p.idPersona = $1 AND p.estado != 'deshabilitado'
    `;
    
    const result = await pool.query(query, [personaId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error(`Error al obtener persona por ID ${personaId}:`, error);
    throw error;
  }
};

module.exports = {
  getAllPersonas,
  createPersona,
  updatePersona,
  deletePersona,
  getPersonaByCedula,
  getPersonaByUsuarioId,
  getPersonaById
}; 