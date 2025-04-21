const { pool } = require('../db');
const bcrypt = require('bcryptjs');
const personaService = require('./personaService');

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
           u.direccion, m.nombreMunicipio, m.idMunicipio, pr.nombreProvincia, pr.idProvincia
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
              municipio: {
                id: persona.idmunicipio,
                nombre: persona.nombremunicipio
              },
              provincia: {
                id: persona.idprovincia,
                nombre: persona.nombreprovincia
              }
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
    
    if (!user || user.estado === 'deshabilitado') {
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
  const { nombres, apellidos, correo, contrasena, idTipoUsuario, datosPersonales } = userData;
  
  try {
    // Start a transaction to ensure both operations succeed or fail together
    await pool.query('BEGIN');
    
    try {
      // Hashear la contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(contrasena, salt);
      
      // Insertar nuevo usuario
      const userResult = await pool.query(
        `INSERT INTO Usuario 
         (nombres, apellidos, correo, contrasena, estado, idTipoUsuario) 
         VALUES ($1, $2, $3, $4, 'activo', $5) 
         RETURNING idUsuario, nombres, apellidos, correo`,
        [nombres, apellidos, correo, hashedPassword, idTipoUsuario]
      );
      
      const newUser = userResult.rows[0];
      
      // Siempre crear una persona asociada al usuario
      // Utilizar los datos proporcionados o los mínimos necesarios del usuario
      const personaData = {
        nombres,
        apellidos,
        idUsuario: newUser.idusuario,
        ...(datosPersonales || {}) // Fusionar con datos personales adicionales si existen
      };
      
      // Si no hay un tipo de persona definido, asignar uno predeterminado (Ciudadano)
      if (!personaData.idTipoPersona) {
        const defaultTipoPersonaResult = await pool.query(
          'SELECT idTipoPersona FROM TipoPersona WHERE nombre = $1',
          ['Ciudadano']
        );
        
        if (defaultTipoPersonaResult.rows.length > 0) {
          personaData.idTipoPersona = defaultTipoPersonaResult.rows[0].idtipopersona;
        }
      }
      
      // Crear persona asociada al usuario
      await personaService.createPersona(personaData);
      
      // Commit the transaction if everything succeeded
      await pool.query('COMMIT');
      
      return newUser;
    } catch (error) {
      // If there's any error, roll back the transaction
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error al crear usuario:', error);
    throw error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    // Start a transaction to ensure both operations succeed or fail together
    await pool.query('BEGIN');
    
    try {
      const { nombres, apellidos, correo, estado, idTipoUsuario, contrasena, datosPersonales } = userData;
      
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
        await pool.query('ROLLBACK');
        return null;
      }
      
      query += updateFields.join(', ');
      query += ` WHERE idUsuario = $${paramCounter} RETURNING idUsuario, nombres, apellidos, correo, estado, idTipoUsuario`;
      queryParams.push(userId);
      
      const result = await pool.query(query, queryParams);
      
      if (result.rows.length === 0) {
        await pool.query('ROLLBACK');
        return null;
      }
      
      const updatedUser = result.rows[0];
      
      // Buscar si existe una persona asociada a este usuario
      const personaResult = await pool.query(
        'SELECT idPersona FROM Persona WHERE idUsuario = $1 AND estado != $2',
        [userId, 'deshabilitado']
      );
      
      // Preparar los datos básicos para persona que siempre deben mantenerse sincronizados con el usuario
      const personaBasicData = {};
      if (nombres) personaBasicData.nombres = nombres;
      if (apellidos) personaBasicData.apellidos = apellidos;
      
      // Combinar con datos personales adicionales si existen
      const personaData = {
        ...personaBasicData,
        ...(datosPersonales || {})
      };
      
      if (personaResult.rows.length > 0) {
        // Si existe, actualizar la persona
        const personaId = personaResult.rows[0].idpersona;
        
        // Solo actualizar si hay datos para actualizar
        if (Object.keys(personaData).length > 0) {
          await personaService.updatePersona(personaId, personaData);
        }
      } else if (Object.keys(personaData).length > 0) {
        // Si no existe persona para este usuario, crearla
        const newPersonaData = {
          ...personaData,
          idUsuario: userId
        };
        
        // Si no hay nombres o apellidos en los datos de actualización, obtenerlos del usuario actualizado
        if (!newPersonaData.nombres || !newPersonaData.apellidos) {
          const userInfo = await pool.query(
            'SELECT nombres, apellidos FROM Usuario WHERE idUsuario = $1',
            [userId]
          );
          
          if (userInfo.rows.length > 0) {
            if (!newPersonaData.nombres) newPersonaData.nombres = userInfo.rows[0].nombres;
            if (!newPersonaData.apellidos) newPersonaData.apellidos = userInfo.rows[0].apellidos;
          }
        }
        
        // Si no hay un tipo de persona definido, asignar uno predeterminado (Ciudadano)
        if (!newPersonaData.idTipoPersona) {
          const defaultTipoPersonaResult = await pool.query(
            'SELECT idTipoPersona FROM TipoPersona WHERE nombre = $1',
            ['Ciudadano']
          );
          
          if (defaultTipoPersonaResult.rows.length > 0) {
            newPersonaData.idTipoPersona = defaultTipoPersonaResult.rows[0].idtipopersona;
          }
        }
        
        // Solo crear si tenemos los datos mínimos requeridos
        if (newPersonaData.nombres && newPersonaData.apellidos) {
          await personaService.createPersona(newPersonaData);
        }
      }
      
      // Commit the transaction if everything succeeded
      await pool.query('COMMIT');
      
      return updatedUser;
    } catch (error) {
      // If there's any error, roll back the transaction
      await pool.query('ROLLBACK');
      throw error;
    }
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
    await pool.query('BEGIN');
    
    try {
      const { nombres, apellidos, correo, ftPerfil, datosPersonales } = profileData;
      
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
      if (updateFields.length === 0 && !datosPersonales) {
        await pool.query('ROLLBACK');
        return null;
      }
      
      let updatedUser = null;
      
      // Si hay campos de usuario para actualizar
      if (updateFields.length > 0) {
        query += updateFields.join(', ');
        query += ` WHERE idUsuario = $${paramCounter} RETURNING idUsuario, nombres, apellidos, correo, ftPerfil`;
        queryParams.push(userId);
        
        const result = await pool.query(query, queryParams);
        
        if (result.rows.length === 0) {
          await pool.query('ROLLBACK');
          return null;
        }
        
        updatedUser = result.rows[0];
      } else {
        // Si no hay campos de usuario pero sí de persona, obtener los datos del usuario
        const result = await pool.query(
          'SELECT idUsuario, nombres, apellidos, correo, ftPerfil FROM Usuario WHERE idUsuario = $1',
          [userId]
        );
        
        if (result.rows.length === 0) {
          await pool.query('ROLLBACK');
          return null;
        }
        
        updatedUser = result.rows[0];
      }
      
      // Actualizar también la persona asociada si existe
      const personaResult = await pool.query(
        'SELECT idPersona FROM Persona WHERE idUsuario = $1 AND estado != $2',
        [userId, 'deshabilitado']
      );
      
      if (personaResult.rows.length > 0) {
        const personaId = personaResult.rows[0].idpersona;
        const personaData = {};
        
        // Actualizar nombre y apellido en persona para mantener sincronización
        if (nombres) personaData.nombres = nombres;
        if (apellidos) personaData.apellidos = apellidos;
        
        // Incorporar datos personales adicionales si se proporcionaron
        if (datosPersonales) {
          Object.assign(personaData, datosPersonales);
        }
        
        // Solo actualizar si hay datos para actualizar
        if (Object.keys(personaData).length > 0) {
          await personaService.updatePersona(personaId, personaData);
        }
      } else if ((nombres || apellidos) || datosPersonales) {
        // Si no existe una persona pero se proporcionaron datos personales, crearla
        const personaData = {
          idUsuario: userId,
          nombres: nombres || updatedUser.nombres,
          apellidos: apellidos || updatedUser.apellidos,
          ...(datosPersonales || {})
        };
        
        // Si no hay un tipo de persona definido, asignar uno predeterminado (Ciudadano)
        if (!personaData.idTipoPersona) {
          const defaultTipoPersonaResult = await pool.query(
            'SELECT idTipoPersona FROM TipoPersona WHERE nombre = $1',
            ['Ciudadano']
          );
          
          if (defaultTipoPersonaResult.rows.length > 0) {
            personaData.idTipoPersona = defaultTipoPersonaResult.rows[0].idtipopersona;
          }
        }
        
        // Crear persona asociada al usuario
        await personaService.createPersona(personaData);
      }
      
      await pool.query('COMMIT');
      return updatedUser;
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
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
      WHERE `;
    
    const queryParams = [];
    let paramCounter = 1;
    
    // Filtrar por tipo de usuario si se especifica
    if (filters.tipoUsuario) {
      if (filters.tipoUsuario.toLowerCase() === 'admin' || 
          filters.tipoUsuario.toLowerCase() === 'administrador') {
        query += `u.idTipoUsuario = 1`;
      } else if (filters.tipoUsuario.toLowerCase() === 'empleado') {
        query += `u.idTipoUsuario = 2`;
      } else {
        // Si el valor no coincide exactamente, usar ambos tipos
        query += `u.idTipoUsuario IN (1, 2)`;
      }
    } else {
      // Si no se especifica, mostrar ambos tipos
      query += `u.idTipoUsuario IN (1, 2)`;
    }
    
    // Aplicar filtro de ID si existe
    if (filters.id) {
      query += ` AND u.idUsuario = $${paramCounter}`;
      queryParams.push(filters.id);
      paramCounter++;
    }
    
    // Aplicar filtro de estado si existe
    if (filters.estado) {
      query += ` AND u.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
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
        u.direccion, m.nombreMunicipio, m.idMunicipio, pr.nombreProvincia, pr.idProvincia
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
            municipio: {
              id: persona.idmunicipio,
              nombre: persona.nombremunicipio
            },
            provincia: {
              id: persona.idprovincia,
              nombre: persona.nombreprovincia
            }
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

/**
 * Obtener empleados disponibles para asignarles solicitudes
 */
const getAvailableEmployees = async () => {
  try {
    // Consulta para obtener empleados que están activos y tienen menos de 5 solicitudes pendientes
    const query = `
      SELECT u.*, t.nombre as tipo_usuario_nombre, p.idPersona, p.estado as estadoPersona,
             (SELECT COUNT(*) FROM Solicitud s WHERE s.idEmpleado = p.idPersona AND s.estadoDecision = 'Pendiente') as solicitudesPendientes
      FROM Usuario u
      JOIN TipoUsuario t ON u.idTipoUsuario = t.idTipoUsuario
      JOIN Persona p ON u.idUsuario = p.idUsuario
      WHERE u.idTipoUsuario = 2 -- Solo empleados
            AND u.estado = 'activo' -- Usuario activo
            AND p.estado = 'activo' -- Persona activa
    `;
    
    const result = await pool.query(query);
    
    // Procesar cada usuario para incluir información adicional
    const usersPromises = result.rows.map(async user => {
      const userData = {
        id: user.idusuario,
        nombres: user.nombres,
        apellidos: user.apellidos,
        correo: user.correo,
        estado: user.estado,
        fechaCreacion: user.fechacreacion,
        ftPerfil: user.ftperfil,
        idPersona: user.idpersona,
        solicitudesPendientes: parseInt(user.solicitudespendientes),
        disponible: parseInt(user.solicitudespendientes) < 5,
        tipoUsuario: {
          id: user.idtipousuario,
          nombre: user.tipo_usuario_nombre
        }
      };
      
      // Obtener datos de persona
      let personaQuery = `
        SELECT p.*, tp.nombre as tipo_persona_nombre,
        u.direccion, m.nombreMunicipio, m.idMunicipio, pr.nombreProvincia, pr.idProvincia
        FROM Persona p
        LEFT JOIN TipoPersona tp ON p.idTipoPersona = tp.idTipoPersona
        LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
        LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
        LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
        WHERE p.idPersona = $1
      `;
      
      const personaResult = await pool.query(personaQuery, [userData.idPersona]);
      
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
            municipio: {
              id: persona.idmunicipio,
              nombre: persona.nombremunicipio
            },
            provincia: {
              id: persona.idprovincia,
              nombre: persona.nombreprovincia
            }
          } : null
        };
      }
      
      // Obtener permisos
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
    
    // Esperar a que todas las promesas se resuelvan
    const users = await Promise.all(usersPromises);
    
    return users;
  } catch (error) {
    console.error('Error al obtener empleados disponibles:', error);
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
  getAdminAndEmployeeUsers,
  getAvailableEmployees
};