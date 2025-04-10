const { pool } = require('../db');
const bcrypt = require('bcryptjs');

const getUsers = async (filters = {}) => {
  try {
    let query = `
      SELECT u.*, t.nombre as tipo_usuario_nombre 
      FROM Usuario u
      LEFT JOIN TipoUsuario t ON u.idTipoUsuario = t.idTipoUsuario
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    // Aplicar filtros si existen
    if (filters.nombres) {
      query += ` AND u.nombres ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombres}%`);
      paramCounter++;
    }
    
    if (filters.apellidos) {
      query += ` AND u.apellidos ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.apellidos}%`);
      paramCounter++;
    }
    
    if (filters.correo) {
      if (filters.exactMatch) {
        query += ` AND u.correo = $${paramCounter}`;
        queryParams.push(filters.correo);
      } else {
        query += ` AND u.correo ILIKE $${paramCounter}`;
        queryParams.push(`%${filters.correo}%`);
      }
      paramCounter++;
    }
   
    
    if (filters.estado !== undefined) {
      query += ` AND u.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    if (filters.idTipoUsuario) {
      query += ` AND u.idTipoUsuario = $${paramCounter}`;
      queryParams.push(filters.idTipoUsuario);
      paramCounter++;
    }
    
    if (filters.idUsuario) {
      query += ` AND u.idUsuario = $${paramCounter}`;
      queryParams.push(filters.idUsuario);
      paramCounter++;
    }
    
    // Ordenar y limitar resultados
    query += ` ORDER BY u.idUsuario ASC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramCounter}`;
      queryParams.push(filters.limit);
    }
    
    const result = await pool.query(query, queryParams);
    
    // Mapear resultados para formato consistente
    const users = result.rows.map(user => ({
      id: user.idusuario,
      nombres: user.nombres,
      apellidos: user.apellidos,
      correo: user.correo,
      estado: user.estado,
      fechaCreacion: user.fechacreacion,
      ftPerfil: user.ftperfil,
      tipoUsuario: {
        id: user.idtipousuario,
        nombre: user.tipo_usuario_nombre
      },
      // Campos originales para uso interno
      idUsuario: user.idusuario,
      contrasena: user.contrasena
    }));
    
    // Si se busca un usuario específico y se encuentra
    if ((filters.idUsuario || (filters.correo && filters.exactMatch)) && users.length > 0) {
      const user = users[0];
      
      // Incluir datos de persona si se solicitan
      if (filters.includePersonaData) {
        const personaResult = await pool.query(
          `SELECT p.*, tp.nombre as tipo_persona_nombre,
           u.direccion, m.nombreMunicipio, pr.nombreProvincia
           FROM Persona p
           LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
           LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
           LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
           LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
           WHERE p.idUsuario = $1`,
          [user.id]
        );
        
        if (personaResult.rows.length > 0) {
          const persona = personaResult.rows[0];
          user.datosPersonales = {
            idPersona: persona.idpersona,
            cedula: persona.cedula,
            fechaNacimiento: persona.fechanacimiento,
            estadoCivil: persona.estadocivil,
            sexo: persona.sexo,
            telefono: persona.telefono,
            tipoPersona: {
              id: persona.idtipopersona,
              nombre: persona.tipo_persona_nombre,
              cargo: persona.tipo_persona_nombre // El nombre ahora representa el cargo/rol
            },
            ubicacion: persona.direccion ? {
              id: persona.idubicacion,
              direccion: persona.direccion,
              sector: persona.sector,
              municipio: persona.nombremunicipio,
              provincia: persona.nombreprovincia
            } : null
          };
        }
      }
      
      // Incluir permisos si se solicitan
      if (filters.includePermisos) {
        const tipoResult = await pool.query(
          'SELECT * FROM TipoUsuario WHERE idTipoUsuario = $1',
          [user.tipoUsuario.id]
        );
        
        const tipoUsuario = tipoResult.rows[0];
        
        if (tipoUsuario) {
          user.permisos = {
            crear: tipoUsuario.podercrear,
            editar: tipoUsuario.podereditar,
            eliminar: tipoUsuario.podereliminar
          };
          user.role = tipoUsuario.nombre.toLowerCase();
        } else {
          user.permisos = { crear: false, editar: false, eliminar: false };
          user.role = 'invitado';
        }
      }
      
      return user;
    }
    
    // Si se estaba buscando un usuario específico por correo exacto pero no se encontró, retornar null
    if (filters.correo && filters.exactMatch && users.length === 0) {
      return null;
    }
    
    return users;
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    throw error;
  }
};

const authenticateUser = async (email, password) => {
  try {
    // Buscar usuario por correo exacto
    const user = await getUsers({ 
      correo: email, 
      exactMatch: true 
    });
    
    if (!user || user.estado !== 'activo') {
      return null;
    }
    
    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.contrasena);
    
    if (!isPasswordValid) {
      return null;
    }
    
    // Obtener usuario con permisos y datos personales
    return await getUsers({ 
      idUsuario: user.id, 
      includePermisos: true,
      includePersonaData: true 
    });
  } catch (error) {
    console.error('Error al autenticar usuario:', error);
    throw error;
  }
};

const createUser = async (userData) => {
  const { nombres, apellidos, correo, contrasena, idTipoUsuario } = userData;
  
  try {
    // Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contrasena, salt);
    
    // Insertar nuevo usuario
    const result = await pool.query(
      `INSERT INTO Usuario 
       (nombres, apellidos, correo, contrasena, estado, idTipoUsuario) 
       VALUES ($1, $2, $3, $4, 'activo', $5) 
       RETURNING idUsuario, nombres, apellidos, correo`,
      [nombres, apellidos, correo, hashedPassword, idTipoUsuario]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    const { nombres, apellidos, correo, estado, idTipoUsuario, contrasena } = userData;
    
    // Construir la consulta dinámicamente
    let query = 'UPDATE Usuario SET ';
    const queryParams = [];
    const updateFields = [];
    let paramCounter = 1;
    
    if (nombres) {
      updateFields.push(`nombres = $${paramCounter}`);
      queryParams.push(nombres);
      paramCounter++;
    }
    
    if (apellidos) {
      updateFields.push(`apellidos = $${paramCounter}`);
      queryParams.push(apellidos);
      paramCounter++;
    }
    
    if (correo) {
      updateFields.push(`correo = $${paramCounter}`);
      queryParams.push(correo);
      paramCounter++;
    }
    
    if (estado) {
      updateFields.push(`estado = $${paramCounter}`);
      queryParams.push(estado);
      paramCounter++;
    }
    
    if (idTipoUsuario) {
      updateFields.push(`idTipoUsuario = $${paramCounter}`);
      queryParams.push(idTipoUsuario);
      paramCounter++;
    }
    
    // Si se proporciona una nueva contraseña, hashearla
    if (contrasena) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(contrasena, salt);
      updateFields.push(`contrasena = $${paramCounter}`);
      queryParams.push(hashedPassword);
      paramCounter++;
    }
    
    // Si no hay campos para actualizar, retornar null
    if (updateFields.length === 0) {
      return null;
    }
    
    query += updateFields.join(', ');
    query += ` WHERE idUsuario = $${paramCounter} RETURNING idUsuario, nombres, apellidos, correo, estado, idTipoUsuario`;
    queryParams.push(userId);
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    // Start a transaction to ensure both operations succeed or fail together
    await pool.query('BEGIN');
    
    try {
      // First, check if user has an associated Persona record
      const personaResult = await pool.query(
        'SELECT idPersona FROM Persona WHERE idUsuario = $1',
        [userId]
      );
      
      // If there's an associated Persona, mark it as disabled
      if (personaResult.rows.length > 0) {
        const personaId = personaResult.rows[0].idpersona;
        await pool.query(
          'UPDATE Persona SET estado = $1 WHERE idPersona = $2',
          ['deshabilitado', personaId]
        );
      }
      
      // Then mark the user as disabled
      const result = await pool.query(
        'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2 RETURNING idUsuario',
        ['deshabilitado', userId]
      );
      
      // Commit the transaction if everything succeeded
      await pool.query('COMMIT');
      
      return result.rows.length > 0;
    } catch (error) {
      // If there's any error, roll back the transaction
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al deshabilitar usuario:', error);
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    return await getUsers({ 
      idUsuario: userId, 
      includePermisos: true 
    });
  } catch (error) {
    console.error('Error al obtener usuario por ID:', error);
    throw error;
  }
};

const updateUserProfile = async (userId, profileData) => {
  try {
    const { nombres, apellidos, correo, ftPerfil } = profileData;
    
    // Construir la consulta dinámicamente
    let query = 'UPDATE Usuario SET ';
    const queryParams = [];
    const updateFields = [];
    let paramCounter = 1;
    
    if (nombres) {
      updateFields.push(`nombres = $${paramCounter}`);
      queryParams.push(nombres);
      paramCounter++;
    }
    
    if (apellidos) {
      updateFields.push(`apellidos = $${paramCounter}`);
      queryParams.push(apellidos);
      paramCounter++;
    }
    
    if (correo) {
      updateFields.push(`correo = $${paramCounter}`);
      queryParams.push(correo);
      paramCounter++;
    }
    
    if (ftPerfil) {
      updateFields.push(`ftPerfil = $${paramCounter}`);
      queryParams.push(ftPerfil);
      paramCounter++;
    }
    
    // Si no hay campos para actualizar, retornar null
    if (updateFields.length === 0) {
      return null;
    }
    
    query += updateFields.join(', ');
    query += ` WHERE idUsuario = $${paramCounter} RETURNING idUsuario, nombres, apellidos, correo, ftPerfil`;
    queryParams.push(userId);
    
    const result = await pool.query(query, queryParams);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al actualizar perfil de usuario:', error);
    throw error;
  }
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  try {
    // Obtener usuario actual
    const user = await getUsers({ idUsuario: userId });
    
    if (!user) {
      throw new Error('Usuario no encontrado');
    }
    
    // Verificar contraseña actual
    const isPasswordValid = await bcrypt.compare(currentPassword, user.contrasena);
    
    if (!isPasswordValid) {
      throw new Error('La contraseña actual es incorrecta');
    }
    
    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Actualizar contraseña
    const result = await pool.query(
      'UPDATE Usuario SET contrasena = $1 WHERE idUsuario = $2 RETURNING idUsuario',
      [hashedPassword, userId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    throw error;
  }
};

const getAdminAndEmployeeUsers = async (filters = {}) => {
  try {
    // Base query to get admin and employee users (idTipoUsuario 1 = admin, 2 = employee)
    let query = `
      SELECT u.*, t.nombre as tipo_usuario_nombre 
      FROM Usuario u
      LEFT JOIN TipoUsuario t ON u.idTipoUsuario = t.idTipoUsuario
      WHERE u.idTipoUsuario IN (1, 2)
    `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    // Aplicar filtro de estado si existe
    if (filters.estado) {
      query += ` AND u.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    } else {
      // Por defecto solo mostrar usuarios activos
      query += ` AND u.estado = 'activo'`;
    }
    
    // Aplicar filtros de nombre y apellido si existen
    if (filters.nombres) {
      query += ` AND u.nombres ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.nombres}%`);
      paramCounter++;
    }
    
    if (filters.apellidos) {
      query += ` AND u.apellidos ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.apellidos}%`);
      paramCounter++;
    }
    
    // Ordenar resultados
    query += ` ORDER BY u.idTipoUsuario ASC, u.idUsuario ASC`;
    
    const result = await pool.query(query, queryParams);
    
    // Process each user to include their personal information
    const usersPromises = result.rows.map(async user => {
      const userData = {
        id: user.idusuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        estado: user.estado,
        fechaCreacion: user.fechacreacion,
        ftPerfil: user.ftperfil,
        tipoUsuario: {
          id: user.idtipousuario,
          nombre: user.tipo_usuario_nombre
        }
      };
      
      // Get person data associated with the user
      let personaQuery = `
        SELECT p.*, tp.nombre as tipo_persona_nombre,
        u.direccion, u.sector, m.nombreMunicipio, pr.nombreProvincia
        FROM Persona p
        LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
        LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
        LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
        LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
        WHERE p.idUsuario = $1
      `;
      
      const personaParams = [userData.id];
      let personaParamsCounter = 2;
      
      // Aplicar filtro de cédula si existe
      if (filters.cedula) {
        personaQuery += ` AND p.cedula ILIKE $${personaParamsCounter}`;
        personaParams.push(`%${filters.cedula}%`);
        personaParamsCounter++;
      }
      
      // Aplicar filtro de cargo (tipoPersona) si existe
      if (filters.cargo) {
        personaQuery += ` AND tp.nombre ILIKE $${personaParamsCounter}`;
        personaParams.push(`%${filters.cargo}%`);
        personaParamsCounter++;
      }
      
      const personaResult = await pool.query(personaQuery, personaParams);
      
      // Si se aplicaron filtros de cédula o cargo y no hay resultados, omitir este usuario
      if ((filters.cedula || filters.cargo) && personaResult.rows.length === 0) {
        return null;
      }
      
      if (personaResult.rows.length > 0) {
        const persona = personaResult.rows[0];
        userData.datosPersonales = {
          idPersona: persona.idpersona,
          cedula: persona.cedula,
          fechaNacimiento: persona.fechanacimiento,
          estadoCivil: persona.estadocivil,
          sexo: persona.sexo,
          telefono: persona.telefono,
          tipoPersona: {
            id: persona.idtipopersona,
            nombre: persona.tipo_persona_nombre
          },
          ubicacion: persona.direccion ? {
            id: persona.idubicacion,
            direccion: persona.direccion,
            sector: persona.sector,
            municipio: persona.nombremunicipio,
            provincia: persona.nombreprovincia
          } : null
        };
      }
      
      // Get permissions
      const tipoResult = await pool.query(
        'SELECT * FROM TipoUsuario WHERE idTipoUsuario = $1',
        [userData.tipoUsuario.id]
      );
      
      if (tipoResult.rows.length > 0) {
        const tipoUsuario = tipoResult.rows[0];
        userData.permisos = {
          crear: tipoUsuario.podercrear,
          editar: tipoUsuario.podereditar,
          eliminar: tipoUsuario.podereliminar
        };
        userData.role = tipoUsuario.nombre.toLowerCase();
      }
      
      return userData;
    });
    
    // Wait for all promises to resolve
    const users = await Promise.all(usersPromises);
    
    // Filtrar usuarios nulos (aquellos que no pasaron los filtros de cédula o cargo)
    const filteredUsers = users.filter(user => user !== null);
    
    return filteredUsers;
  } catch (error) {
    console.error('Error al obtener usuarios administradores y empleados:', error);
    throw error;
  }
};

module.exports = {
  getUsers,
  authenticateUser,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updateUserProfile,
  changePassword,
  getAdminAndEmployeeUsers
};