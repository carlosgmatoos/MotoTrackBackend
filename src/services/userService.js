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
      tipoUsuario: {
        id: user.idtipousuario,
        nombre: user.tipo_usuario_nombre
      },
      // Campos originales para uso interno
      idUsuario: user.idusuario,
      contrasena: user.contrasena
    }));
    
    // Si se busca un usuario específico
    if ((filters.idUsuario || (filters.correo && filters.exactMatch))) {
      if (users.length === 0) {
        return null; // Retornar null cuando no se encuentra el usuario
      }
      
      const user = users[0];
      
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
    
    // Obtener usuario con permisos
    return await getUsers({ 
      idUsuario: user.id, 
      includePermisos: true 
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
    // En lugar de eliminar, cambiamos el estado a 'deshabilitado'
    const result = await pool.query(
      'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2 RETURNING idUsuario',
      ['deshabilitado', userId]
    );
    
    return result.rows.length > 0;
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

module.exports = {
  getUsers,
  authenticateUser,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  updateUserProfile,
  changePassword
};