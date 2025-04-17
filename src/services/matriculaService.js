const { pool } = require('../db');

/**
 * Obtener una matrícula por ID
 */
const obtenerMatriculaPorId = async (idMatricula) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Matricula WHERE idMatricula = $1',
      [idMatricula]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error al obtener matrícula por ID:', error);
    throw error;
  }
};

/**
 * Obtener una matrícula por número
 */
const obtenerMatriculaPorNumero = async (numeroMatricula) => {
  try {
    const result = await pool.query(
      'SELECT * FROM Matricula WHERE matriculaGenerada = $1',
      [numeroMatricula]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error al obtener matrícula por número:', error);
    throw error;
  }
};

/**
 * Verificar si una matrícula ya existe
 */
const existeMatricula = async (numeroMatricula) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM Matricula WHERE matriculaGenerada = $1',
      [numeroMatricula]
    );
    
    return parseInt(result.rows[0].count) > 0;
  } catch (error) {
    console.error('Error al verificar si existe matrícula:', error);
    throw error;
  }
};

/**
 * Generar una matrícula aleatoria única
 */
const generarMatriculaUnica = async () => {
  const client = await pool.connect();
  
  try {
    // Intentar hasta 10 veces
    for (let intento = 0; intento < 10; intento++) {
      // Generar un número aleatorio de 6 dígitos
      const numeroRandom = Math.floor(100000 + Math.random() * 900000);
      const matricula = `K${numeroRandom.toString().padStart(6, '0')}`;
      
      // Verificar si ya existe
      const existe = await existeMatricula(matricula);
      
      if (!existe) {
        return matricula;
      }
    }
    
    // Si después de 10 intentos no se pudo generar, usar timestamp
    const timestamp = Date.now().toString().slice(-6);
    return `K${timestamp.padStart(6, '0')}`;
  } catch (error) {
    console.error('Error al generar matrícula única:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Crear una matrícula con estado pendiente
 */
const crearMatriculaPendiente = async () => {
  try {
    const result = await pool.query(
      'INSERT INTO Matricula (matriculaGenerada, estado, fechaEmisionMatricula) VALUES ($1, $2, CURRENT_DATE) RETURNING *',
      ['PENDIENTE', 'Pendiente']
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al crear matrícula pendiente:', error);
    throw error;
  }
};

/**
 * Activar una matrícula (generar número y fecha)
 */
const activarMatricula = async (idMatricula) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Generar número de matrícula único
    const matriculaGenerada = await generarMatriculaUnica();
    
    // Actualizar la matrícula
    const result = await client.query(
      'UPDATE Matricula SET matriculaGenerada = $1, estado = $2, fechaEmisionMatricula = CURRENT_DATE WHERE idMatricula = $3 RETURNING *',
      [matriculaGenerada, 'Generada', idMatricula]
    );
    
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al activar matrícula:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cancelar una matrícula
 */
const cancelarMatricula = async (idMatricula) => {
  try {
    const result = await pool.query(
      'UPDATE Matricula SET estado = $1 WHERE idMatricula = $2 RETURNING *',
      ['Cancelada', idMatricula]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error al cancelar matrícula:', error);
    throw error;
  }
};

/**
 * Obtener todas las matrículas activas
 */
const obtenerMatriculasActivas = async (filtros = {}) => {
  try {
    let query = `
      SELECT m.*, v.chasis, p.nombres, p.apellidos, p.cedula
      FROM Matricula m
      JOIN Vehiculo v ON m.idMatricula = v.idMatricula
      JOIN Persona p ON v.idPropietario = p.idPersona
      WHERE m.estado = 'Generada'
    `;
    
    const queryParams = ['Generada'];
    let paramCount = 2;
    
    // Aplicar filtro por ID si existe
    if (filtros.id) {
      query = query.replace('WHERE m.estado = ', 'WHERE m.idMatricula = $' + paramCount + ' AND m.estado = ');
      queryParams.unshift(filtros.id);
      paramCount++;
    }
    
    query += ` ORDER BY m.fechaEmisionMatricula DESC`;
    
    const result = await pool.query(query, queryParams);
    
    return result.rows;
  } catch (error) {
    console.error('Error al obtener matrículas activas:', error);
    throw error;
  }
};

/**
 * Obtener todas las matrículas con información completa
 * (propietario, vehículo, modelo, marca)
 */
const obtenerMatriculasConInformacionRelacionada = async (filtros = {}) => {
  try {
    let query = `
      SELECT 
        m.idMatricula, 
        m.matriculaGenerada, 
        m.estado as estadoMatricula, 
        m.fechaEmisionMatricula,
        v.idVehiculo, 
        v.chasis, 
        v.tipoUso,
        p.idPersona as idPropietario, 
        p.nombres as nombrePropietario, 
        p.apellidos as apellidoPropietario, 
        p.cedula as cedulaPropietario,
        mo.idModelo, 
        mo.nombre as nombreModelo, 
        mo.año as añoModelo,
        ma.idMarca, 
        ma.nombre as nombreMarca
      FROM Matricula m
      JOIN Vehiculo v ON m.idMatricula = v.idMatricula
      JOIN Persona p ON v.idPropietario = p.idPersona
      JOIN Modelo mo ON v.idModelo = mo.idModelo
      JOIN Marca ma ON mo.idMarca = ma.idMarca
    `;
    
    const queryParams = [];
    let paramCount = 1;
    
    // Aplicar filtro por ID si existe
    if (filtros.id) {
      query += ` WHERE m.idMatricula = $${paramCount}`;
      queryParams.push(filtros.id);
      paramCount++;
    }
    
    query += ` ORDER BY m.fechaEmisionMatricula DESC`;
    
    const result = await pool.query(query, queryParams);
    
    return result.rows;
  } catch (error) {
    console.error('Error al obtener matrículas con información relacionada:', error);
    throw error;
  }
};

/**
 * Obtener una matrícula por ID con información completa
 */
const obtenerMatriculaPorIdCompleta = async (idMatricula) => {
  try {
    const result = await pool.query(
      `SELECT 
        m.idMatricula, 
        m.matriculaGenerada, 
        m.estado as estadoMatricula, 
        m.fechaEmisionMatricula,
        v.idVehiculo, 
        v.chasis, 
        v.tipoUso,
        p.idPersona as idPropietario, 
        p.nombres as nombrePropietario, 
        p.apellidos as apellidoPropietario, 
        p.cedula as cedulaPropietario,
        mo.idModelo, 
        mo.nombre as nombreModelo, 
        mo.año as añoModelo,
        ma.idMarca, 
        ma.nombre as nombreMarca
      FROM Matricula m
      JOIN Vehiculo v ON m.idMatricula = v.idMatricula
      JOIN Persona p ON v.idPropietario = p.idPersona
      JOIN Modelo mo ON v.idModelo = mo.idModelo
      JOIN Marca ma ON mo.idMarca = ma.idMarca
      WHERE m.idMatricula = $1`,
      [idMatricula]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error al obtener matrícula por ID con información completa:', error);
    throw error;
  }
};

/**
 * Obtener matrículas por ID de propietario con información completa
 */
const obtenerMatriculasPorPropietarioCompleta = async (idPropietario) => {
  try {
    const result = await pool.query(
      `SELECT 
        m.idMatricula, 
        m.matriculaGenerada, 
        m.estado as estadoMatricula, 
        m.fechaEmisionMatricula,
        v.idVehiculo, 
        v.chasis, 
        v.tipoUso,
        p.idPersona as idPropietario, 
        p.nombres as nombrePropietario, 
        p.apellidos as apellidoPropietario, 
        p.cedula as cedulaPropietario,
        mo.idModelo, 
        mo.nombre as nombreModelo, 
        mo.año as añoModelo,
        ma.idMarca, 
        ma.nombre as nombreMarca
      FROM Matricula m
      JOIN Vehiculo v ON m.idMatricula = v.idMatricula
      JOIN Persona p ON v.idPropietario = p.idPersona
      JOIN Modelo mo ON v.idModelo = mo.idModelo
      JOIN Marca ma ON mo.idMarca = ma.idMarca
      WHERE p.idPersona = $1
      ORDER BY m.fechaEmisionMatricula DESC`,
      [idPropietario]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error al obtener matrículas por propietario:', error);
    throw error;
  }
};

module.exports = {
  obtenerMatriculaPorId,
  obtenerMatriculaPorNumero,
  existeMatricula,
  generarMatriculaUnica,
  crearMatriculaPendiente,
  activarMatricula,
  cancelarMatricula,
  obtenerMatriculasActivas,
  obtenerMatriculasConInformacionRelacionada,
  obtenerMatriculaPorIdCompleta,
  obtenerMatriculasPorPropietarioCompleta
}; 