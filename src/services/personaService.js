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
      nombres, apellidos, cedula, fechanacimiento, 
      estadocivil, sexo, telefono, estado, 
      idubicacion, idtipopersona, idusuario
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
  try {
    // Start a transaction
    await pool.query('BEGIN');
    
    try {
      // Verificar que la persona existe
      const checkQuery = `
        SELECT p.* 
        FROM Persona p
        WHERE p.idPersona = $1 AND p.estado != 'deshabilitado'
      `;
      
      const checkResult = await pool.query(checkQuery, [id]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Persona no encontrada');
      }
      
      const personaExistente = checkResult.rows[0];
      
      // Si se está actualizando la cédula, verificar que no exista otra persona con esa cédula
      if (personaData.cedula) {
        const cedulaCheckQuery = `
          SELECT * FROM Persona
          WHERE cedula = $1 AND idPersona != $2 AND estado != 'deshabilitado'
        `;
        
        const cedulaCheckResult = await pool.query(cedulaCheckQuery, [personaData.cedula, id]);
        if (cedulaCheckResult.rows.length > 0) {
          await pool.query('ROLLBACK');
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
        estado,
        // Datos de ubicación para crear/actualizar
        direccion,
        idMunicipio,
        idProvincia
      } = personaData;
      
      // Verificar si necesitamos crear o actualizar una ubicación
      let ubicacionIdToUse = idUbicacion;
      
      if ((direccion || idMunicipio) && !idUbicacion) {
        // Necesitamos crear o actualizar una ubicación
        // Primero verificar si ya tiene una ubicación asociada que podemos actualizar
        const currentUbicacionId = personaExistente.idubicacion;
        
        if (currentUbicacionId) {
          // Actualizar la ubicación existente
          const ubicacionUpdateData = {};
          
          if (direccion) ubicacionUpdateData.direccion = direccion;
          if (idMunicipio) ubicacionUpdateData.idMunicipio = idMunicipio;
          
          // Si tenemos datos para actualizar, hacerlo
          if (Object.keys(ubicacionUpdateData).length > 0) {
            const ubicacionService = require('./ubicacionService');
            const updatedUbicacion = await ubicacionService.updateUbicacion(
              currentUbicacionId, 
              ubicacionUpdateData
            );
            
            if (updatedUbicacion) {
              ubicacionIdToUse = updatedUbicacion.id;
            }
          } else {
            ubicacionIdToUse = currentUbicacionId;
          }
        } else if (direccion && idMunicipio) {
          // Crear una nueva ubicación
          const ubicacionService = require('./ubicacionService');
          const newUbicacion = await ubicacionService.createUbicacion({
            direccion,
            idMunicipio
          });
          
          if (newUbicacion) {
            ubicacionIdToUse = newUbicacion.id;
          }
        }
      }
      
      // Actualizar los datos de la persona
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
        updateFields.push(`fechanacimiento = $${paramCount}`);
        queryParams.push(fechaNacimiento);
        paramCount++;
      }
      
      if (estadoCivil) {
        updateFields.push(`estadocivil = $${paramCount}`);
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
      
      if (ubicacionIdToUse) {
        updateFields.push(`idubicacion = $${paramCount}`);
        queryParams.push(ubicacionIdToUse);
        paramCount++;
      }
      
      if (idTipoPersona) {
        updateFields.push(`idtipopersona = $${paramCount}`);
        queryParams.push(idTipoPersona);
        paramCount++;
      }
      
      if (idUsuario) {
        updateFields.push(`idusuario = $${paramCount}`);
        queryParams.push(idUsuario);
        paramCount++;
      }
      
      if (estado) {
        updateFields.push(`estado = $${paramCount}`);
        queryParams.push(estado);
        paramCount++;
      }
      
      if (updateFields.length === 0) {
        await pool.query('ROLLBACK');
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
      const updatedPersona = result.rows[0];
      
      // Si la persona tiene un usuario asociado y se actualizó el nombre o apellido,
      // actualizar también el usuario para mantener la sincronización
      if (personaExistente.idusuario && (nombres || apellidos)) {
        const userUpdateData = {};
        
        if (nombres) userUpdateData.nombres = nombres;
        if (apellidos) userUpdateData.apellidos = apellidos;
        
        if (Object.keys(userUpdateData).length > 0) {
          await pool.query(
            `UPDATE Usuario 
             SET nombres = COALESCE($1, nombres), 
                 apellidos = COALESCE($2, apellidos)
             WHERE idUsuario = $3`,
            [userUpdateData.nombres, userUpdateData.apellidos, personaExistente.idusuario]
          );
        }
      }
      
      await pool.query('COMMIT');
      return updatedPersona;
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al actualizar persona:', error);
    throw error;
  }
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