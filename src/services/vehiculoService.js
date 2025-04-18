const { pool } = require('../db');

/**
 * Obtiene todos los vehículos con filtros opcionales
 */
const getAllVehiculos = async (filters = {}) => {
  try {
    let query = `
      SELECT v.*, 
             m.nombre as nombreModelo,
             ma.nombre as nombreMarca,
             tp.nombres as nombresPropietario,
             tp.apellidos as apellidosPropietario,
             tv.nombre as nombreTipoVehiculo,
             s.proveedor as proveedorSeguro,
             s.numeroPoliza as numeroPoliza
      FROM Vehiculo v
      LEFT JOIN Modelo m ON v.idModelo = m.idModelo
      LEFT JOIN Marca ma ON m.idMarca = ma.idMarca
      LEFT JOIN Persona tp ON v.idPropietario = tp.idPersona
      LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      LEFT JOIN Seguro s ON v.idSeguro = s.idSeguro
      WHERE 1=1`;
    const queryParams = [];
    let paramCounter = 1;
    
    // Apply filters if they exist
    if (filters.idVehiculo) {
      query += ` AND v.idVehiculo = $${paramCounter}`;
      queryParams.push(filters.idVehiculo);
      paramCounter++;
    }
    
    if (filters.chasis) {
      query += ` AND v.chasis ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.chasis}%`);
      paramCounter++;
    }
    
    if (filters.tipoUso) {
      query += ` AND v.tipoUso = $${paramCounter}`;
      queryParams.push(filters.tipoUso);
      paramCounter++;
    }
    
    // Add filters for the new fields
    if (filters.año) {
      query += ` AND v.año = $${paramCounter}`;
      queryParams.push(filters.año);
      paramCounter++;
    }
    
    if (filters.color) {
      query += ` AND v.color ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.color}%`);
      paramCounter++;
    }
    
    if (filters.cilindraje) {
      query += ` AND v.cilindraje ILIKE $${paramCounter}`;
      queryParams.push(`%${filters.cilindraje}%`);
      paramCounter++;
    }
    
    if (filters.idModelo) {
      query += ` AND v.idModelo = $${paramCounter}`;
      queryParams.push(filters.idModelo);
      paramCounter++;
    }
    
    if (filters.idPropietario) {
      query += ` AND v.idPropietario = $${paramCounter}`;
      queryParams.push(filters.idPropietario);
      paramCounter++;
    }
    
    if (filters.idTipoVehiculo) {
      query += ` AND v.idTipoVehiculo = $${paramCounter}`;
      queryParams.push(filters.idTipoVehiculo);
      paramCounter++;
    }
    
    if (filters.idSeguro) {
      query += ` AND v.idSeguro = $${paramCounter}`;
      queryParams.push(filters.idSeguro);
      paramCounter++;
    }
    
    if (filters.idMatricula) {
      query += ` AND v.idMatricula = $${paramCounter}`;
      queryParams.push(filters.idMatricula);
      paramCounter++;
    }
    
    if (filters.estado) {
      query += ` AND v.estado = $${paramCounter}`;
      queryParams.push(filters.estado);
      paramCounter++;
    }
    
    // Order results
    query += ' ORDER BY v.idVehiculo ASC';
    
    const result = await pool.query(query, queryParams);
    
    return result.rows.map(vehiculo => ({
      id: vehiculo.idvehiculo,
      chasis: vehiculo.chasis,
      año: vehiculo.año,
      color: vehiculo.color,
      cilindraje: vehiculo.cilindraje,
      tipoUso: vehiculo.tipouso,
      estado: vehiculo.estado,
      fechaCreacion: vehiculo.fechacreacion,
      idModelo: vehiculo.idmodelo,
      nombreModelo: vehiculo.nombremodelo,
      nombreMarca: vehiculo.nombremarca,
      idPropietario: vehiculo.idpropietario,
      nombrePropietario: `${vehiculo.nombrespropietario} ${vehiculo.apellidospropietario}`,
      idTipoVehiculo: vehiculo.idtipovehiculo,
      nombreTipoVehiculo: vehiculo.nombretipovehiculo,
      idSeguro: vehiculo.idseguro,
      proveedorSeguro: vehiculo.proveedorseguro,
      numeroPoliza: vehiculo.numeropoliza,
      idMatricula: vehiculo.idmatricula
    }));
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    throw error;
  }
};

/**
 * Crea un nuevo vehículo
 */
const createVehiculo = async (vehiculoData) => {
  try {
    const { 
      chasis, año, color, cilindraje, tipoUso, 
      idModelo, idPropietario, idTipoVehiculo, idSeguro, idMatricula 
    } = vehiculoData;
    
    // Verificar si ya existe un vehículo con ese chasis
    const existente = await pool.query(
      'SELECT * FROM Vehiculo WHERE chasis = $1',
      [chasis]
    );
    
    if (existente.rows.length > 0) {
      throw new Error('Ya existe un vehículo con ese número de chasis');
    }
    
    // Verificar que existan las entidades relacionadas
    const modelo = await pool.query('SELECT * FROM Modelo WHERE idModelo = $1', [idModelo]);
    if (modelo.rows.length === 0) throw new Error('El modelo especificado no existe');
    
    const propietario = await pool.query('SELECT * FROM Persona WHERE idPersona = $1', [idPropietario]);
    if (propietario.rows.length === 0) throw new Error('El propietario especificado no existe');
    
    const tipoVehiculo = await pool.query('SELECT * FROM TipoVehiculo WHERE idTipoVehiculo = $1', [idTipoVehiculo]);
    if (tipoVehiculo.rows.length === 0) throw new Error('El tipo de vehículo especificado no existe');
    
    const seguro = await pool.query('SELECT * FROM Seguro WHERE idSeguro = $1', [idSeguro]);
    if (seguro.rows.length === 0) throw new Error('El seguro especificado no existe');
    
    // La matrícula es opcional
    if (idMatricula) {
      const matricula = await pool.query('SELECT * FROM Matricula WHERE idMatricula = $1', [idMatricula]);
      if (matricula.rows.length === 0) throw new Error('La matrícula especificada no existe');
    }
    
    const result = await pool.query(
      `INSERT INTO Vehiculo (chasis, año, color, cilindraje, tipoUso, estado, idModelo, idPropietario, idTipoVehiculo, idSeguro, idMatricula) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [chasis, año, color, cilindraje, tipoUso, 'activo', idModelo, idPropietario, idTipoVehiculo, idSeguro, idMatricula]
    );
    
    const vehiculo = result.rows[0];
    
    // Obtener información adicional para la respuesta
    const vehiculoCompleto = await getAllVehiculos({ idVehiculo: vehiculo.idvehiculo });
    
    return vehiculoCompleto[0];
  } catch (error) {
    console.error('Error al crear vehículo:', error);
    throw error;
  }
};

/**
 * Actualiza un vehículo existente
 */
const updateVehiculo = async (vehiculoId, vehiculoData) => {
  try {
    const { 
      chasis, año, color, cilindraje, tipoUso, 
      idModelo, idPropietario, idTipoVehiculo, idSeguro, idMatricula, estado 
    } = vehiculoData;
    
    // Verificar si ya existe otro vehículo con ese chasis
    if (chasis) {
      const existente = await pool.query(
        'SELECT * FROM Vehiculo WHERE chasis = $1 AND idVehiculo != $2',
        [chasis, vehiculoId]
      );
      
      if (existente.rows.length > 0) {
        throw new Error('Ya existe otro vehículo con ese número de chasis');
      }
    }
    
    // Verificar que existan las entidades relacionadas si se proporcionan
    if (idModelo) {
      const modelo = await pool.query('SELECT * FROM Modelo WHERE idModelo = $1', [idModelo]);
      if (modelo.rows.length === 0) throw new Error('El modelo especificado no existe');
    }
    
    if (idPropietario) {
      const propietario = await pool.query('SELECT * FROM Persona WHERE idPersona = $1', [idPropietario]);
      if (propietario.rows.length === 0) throw new Error('El propietario especificado no existe');
    }
    
    if (idTipoVehiculo) {
      const tipoVehiculo = await pool.query('SELECT * FROM TipoVehiculo WHERE idTipoVehiculo = $1', [idTipoVehiculo]);
      if (tipoVehiculo.rows.length === 0) throw new Error('El tipo de vehículo especificado no existe');
    }
    
    if (idSeguro) {
      const seguro = await pool.query('SELECT * FROM Seguro WHERE idSeguro = $1', [idSeguro]);
      if (seguro.rows.length === 0) throw new Error('El seguro especificado no existe');
    }
    
    if (idMatricula) {
      const matricula = await pool.query('SELECT * FROM Matricula WHERE idMatricula = $1', [idMatricula]);
      if (matricula.rows.length === 0) throw new Error('La matrícula especificada no existe');
    }
    
    const result = await pool.query(
      `UPDATE Vehiculo 
       SET chasis = COALESCE($1, chasis),
           año = COALESCE($2, año),
           color = COALESCE($3, color),
           cilindraje = COALESCE($4, cilindraje),
           tipoUso = COALESCE($5, tipoUso),
           idModelo = COALESCE($6, idModelo),
           idPropietario = COALESCE($7, idPropietario),
           idTipoVehiculo = COALESCE($8, idTipoVehiculo),
           idSeguro = COALESCE($9, idSeguro),
           idMatricula = COALESCE($10, idMatricula),
           estado = COALESCE($11, estado)
       WHERE idVehiculo = $12
       RETURNING *`,
      [chasis, año, color, cilindraje, tipoUso, idModelo, idPropietario, idTipoVehiculo, idSeguro, idMatricula, estado, vehiculoId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Obtener información completa para la respuesta
    const vehiculoCompleto = await getAllVehiculos({ idVehiculo: vehiculoId });
    
    return vehiculoCompleto[0];
  } catch (error) {
    console.error('Error al actualizar vehículo:', error);
    throw error;
  }
};

/**
 * Elimina un vehículo (cambio de estado a deshabilitado)
 */
const deleteVehiculo = async (vehiculoId) => {
  try {
    // Verificar si hay solicitudes asociadas a este vehículo
    const solicitudes = await pool.query(
      'SELECT COUNT(*) FROM Solicitud WHERE idVehiculo = $1',
      [vehiculoId]
    );
    
    if (parseInt(solicitudes.rows[0].count) > 0) {
      return { 
        success: false,
        message: 'Vehículo en uso'
      };
    }
    
    // Cambiar estado a deshabilitado en lugar de eliminar
    const result = await pool.query(
      'UPDATE Vehiculo SET estado = $1 WHERE idVehiculo = $2 RETURNING *',
      ['deshabilitado', vehiculoId]
    );
    
    return { 
      success: result.rows.length > 0,
      data: result.rows.length > 0 ? result.rows[0] : null
    };
  } catch (error) {
    console.error('Error al deshabilitar vehículo:', error);
    throw error;
  }
};

module.exports = {
  getAllVehiculos,
  createVehiculo,
  updateVehiculo,
  deleteVehiculo
}; 