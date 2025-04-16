const { pool } = require('../db');

/**
 * Crear una nueva solicitud de matrícula
 */
const crearSolicitud = async (dataSolicitud) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { idCiudadano, vehiculo, seguro, documentos, persona } = dataSolicitud;
    
    // Verificar si ya existe un vehículo con ese chasis
    const existingVehiculo = await client.query(
      'SELECT * FROM Vehiculo WHERE chasis = $1',
      [vehiculo.chasis]
    );
    
    if (existingVehiculo.rows.length > 0) {
      throw new Error('Ya existe un vehículo con ese número de chasis');
    }
    
    // Si se incluye seguro, usar existente o crear nuevo
    let idSeguro = null;
    if (seguro) {
      if (seguro.idSeguro) {
        // Si se proporciona un idSeguro, lo usamos directamente
        idSeguro = seguro.idSeguro;
        
        // Verificamos que el seguro exista y actualizamos el número de póliza si es necesario
        const seguroExistente = await client.query(
          'SELECT * FROM Seguro WHERE idSeguro = $1',
          [idSeguro]
        );
        
        if (seguroExistente.rows.length === 0) {
          throw new Error('El seguro especificado no existe');
        }
        
        // Actualizar el número de póliza si es diferente
        if (seguroExistente.rows[0].numeropoliza !== seguro.numeroPoliza) {
          await client.query(
            'UPDATE Seguro SET numeroPoliza = $1 WHERE idSeguro = $2',
            [seguro.numeroPoliza, idSeguro]
          );
        }
      } else if (seguro.proveedor) {
        // Si se proporciona proveedor, creamos un nuevo seguro
        const seguroResult = await client.query(
          'INSERT INTO Seguro (proveedor, numeroPoliza, estado, fechaCreacion) VALUES ($1, $2, $3, CURRENT_DATE) RETURNING idSeguro',
          [seguro.proveedor, seguro.numeroPoliza, 'activo']
        );
        idSeguro = seguroResult.rows[0].idSeguro;
      } else {
        throw new Error('Debe proporcionar proveedor o idSeguro para el seguro');
      }
    }
    
    // Crear una matrícula en estado pendiente
    const matriculaResult = await client.query(
      'INSERT INTO Matricula (matriculaGenerada, estado, fechaEmisionMatricula) VALUES ($1, $2, $3) RETURNING idMatricula',
      ['PEND', 'Pendiente', new Date()]
    );
    const idMatricula = matriculaResult.rows[0].idmatricula;
    
    console.log(`Matrícula creada con ID: ${idMatricula}`);
    
    if (!idMatricula) {
      throw new Error('No se pudo crear la matrícula. Intente de nuevo.');
    }
    
    // Verificar que idCiudadano (idPersona) existe
    if (!idCiudadano) {
      throw new Error('No se pudo identificar al ciudadano. Contacte al administrador.');
    }
    
    // Verificar empleados ANTES de crear el vehículo para evitar crear recursos innecesarios si no hay empleados
    // Verificar si hay empleados en el sistema
    const existenEmpleadosResult = await client.query(
      `SELECT COUNT(*) as total 
       FROM Persona p 
       JOIN Usuario u ON p.idUsuario = u.idUsuario
       WHERE u.idTipoUsuario = 2`
    );
    
    console.log('Verificando empleados en el sistema:', existenEmpleadosResult.rows[0]);
    
    // Primero, buscar un empleado disponible con menos de 5 solicitudes pendientes
    const empleadosResult = await client.query(
      `SELECT p.idPersona, p.nombres, p.apellidos, COALESCE(s.solicitudes_pendientes, 0) as pendientes, u.idUsuario
       FROM Persona p
       JOIN Usuario u ON p.idUsuario = u.idUsuario
       LEFT JOIN (
         SELECT idEmpleado, COUNT(*) as solicitudes_pendientes
         FROM Solicitud
         WHERE estadoDecision = 'Pendiente'
         GROUP BY idEmpleado
       ) s ON p.idPersona = s.idEmpleado
       WHERE u.idTipoUsuario = 2 AND p.estado = 'activo'
       ORDER BY COALESCE(s.solicitudes_pendientes, 0) ASC
       LIMIT 1`
    );
    
    console.log('Búsqueda de empleados activos con menos solicitudes:', empleadosResult.rows);
    
    let idEmpleado = null;
    let enCola = false;
    
    if (empleadosResult.rows.length > 0) {
      idEmpleado = empleadosResult.rows[0].idpersona;
      const pendientes = parseInt(empleadosResult.rows[0].pendientes, 10);
      
      console.log(`Empleado encontrado: ${idEmpleado} (${empleadosResult.rows[0].nombres} ${empleadosResult.rows[0].apellidos}) con ${pendientes} solicitudes pendientes`);
      
      // Si el empleado ya tiene 5 o más solicitudes pendientes, la solicitud quedará en cola
      if (pendientes >= 5) {
        enCola = true;
        console.log(`El empleado ${idEmpleado} ya tiene ${pendientes} solicitudes pendientes. Solicitud quedará en cola.`);
      }
    }
    
    // Si no hay empleados disponibles con menos de 5 solicitudes, buscar cualquier empleado activo
    if (!idEmpleado) {
      const cualquierEmpleadoResult = await client.query(
        `SELECT p.idPersona, p.nombres, p.apellidos
         FROM Persona p
         JOIN Usuario u ON p.idUsuario = u.idUsuario
         WHERE u.idTipoUsuario = 2 AND p.estado = 'activo'
         LIMIT 1`
      );
      
      console.log('Búsqueda de cualquier empleado activo:', cualquierEmpleadoResult.rows);
      
      if (cualquierEmpleadoResult.rows.length > 0) {
        idEmpleado = cualquierEmpleadoResult.rows[0].idpersona;
        enCola = true; // Marcar como en cola ya que todos los empleados tienen 5+ solicitudes
        console.log(`Todos los empleados tienen 5+ solicitudes. Asignando al empleado ${idEmpleado} (${cualquierEmpleadoResult.rows[0].nombres} ${cualquierEmpleadoResult.rows[0].apellidos}) en cola.`);
      }
    }
    
    // Si aún no hay empleados disponibles, buscar cualquier empleado aunque esté inactivo
    if (!idEmpleado) {
      const empleadoInactivoResult = await client.query(
        `SELECT p.idPersona, p.nombres, p.apellidos
         FROM Persona p
         JOIN Usuario u ON p.idUsuario = u.idUsuario
         WHERE u.idTipoUsuario = 2
         LIMIT 1`
      );
      
      console.log('Búsqueda de empleados inactivos:', empleadoInactivoResult.rows);
      
      if (empleadoInactivoResult.rows.length > 0) {
        idEmpleado = empleadoInactivoResult.rows[0].idpersona;
        enCola = true;
        console.log(`No hay empleados activos. Asignando al empleado inactivo ${idEmpleado} (${empleadoInactivoResult.rows[0].nombres} ${empleadoInactivoResult.rows[0].apellidos}) en cola.`);
      } else {
        // Como último recurso, usar un empleado por defecto (ID 1 o el primer administrador)
        console.log('No se encontraron empleados. Buscando administrador o empleado con ID 1');
        
        const empleadoPorDefectoResult = await client.query(
          `SELECT p.idPersona, p.nombres, p.apellidos
           FROM Persona p
           JOIN Usuario u ON p.idUsuario = u.idUsuario
           WHERE p.idPersona = 1 OR u.idTipoUsuario = 1
           LIMIT 1`
        );
        
        if (empleadoPorDefectoResult.rows.length > 0) {
          idEmpleado = empleadoPorDefectoResult.rows[0].idpersona;
          enCola = true;
          console.log(`Usando empleado por defecto ${idEmpleado} (${empleadoPorDefectoResult.rows[0].nombres} ${empleadoPorDefectoResult.rows[0].apellidos})`);
        } else {
          throw new Error('No se encontró ningún empleado disponible en el sistema. Contacte al administrador.');
        }
      }
    }
    
    // Asegurarnos que tengamos un empleado válido
    if (!idEmpleado) {
      throw new Error('No se pudo asignar un empleado a la solicitud. Contacte al administrador.');
    }
    
    console.log(`Empleado final asignado: ${idEmpleado}, enCola: ${enCola}`);
    
    // Ahora que tenemos un empleado, continuamos creando el vehículo
    // Verificar si es necesario actualizar el modelo con información adicional
    if (vehiculo.color || vehiculo.cilindraje || vehiculo.año) {
      // Construir los campos a actualizar
      const updateFields = [];
      const updateParams = [];
      
      if (vehiculo.color) {
        updateFields.push('color = $' + (updateParams.length + 1));
        updateParams.push(vehiculo.color);
      }
      
      if (vehiculo.cilindraje) {
        updateFields.push('cilindraje = $' + (updateParams.length + 1));
        updateParams.push(vehiculo.cilindraje);
      }
      
      if (vehiculo.año) {
        updateFields.push('año = $' + (updateParams.length + 1));
        updateParams.push(vehiculo.año);
      }
      
      if (updateFields.length > 0) {
        // Añadir el ID del modelo como último parámetro
        updateParams.push(vehiculo.idModelo);
        
        // Ejecutar la actualización
        await client.query(
          `UPDATE Modelo SET ${updateFields.join(', ')} WHERE idModelo = $${updateParams.length}`,
          updateParams
        );
      }
    }
    
    // Crear el vehículo pero sin asignarlo a una persona aún
    const vehiculoResult = await client.query(
      `INSERT INTO Vehiculo 
       (chasis, tipoUso, estado, fechaCreacion, idModelo, idPropietario, idMatricula, idTipoVehiculo, idSeguro) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8) 
       RETURNING idVehiculo`,
      [
        vehiculo.chasis, 
        vehiculo.tipoUso, 
        'inactivo', // El vehículo está inactivo hasta que se apruebe
        vehiculo.idModelo,
        null, // No se asigna propietario aún
        idMatricula,
        vehiculo.idTipoVehiculo || 1, // Valor por defecto si no se proporciona
        idSeguro
      ]
    );
    const idVehiculo = vehiculoResult.rows[0].idvehiculo;
    
    console.log(`Vehículo creado con ID: ${idVehiculo}`);
    
    if (!idVehiculo) {
      throw new Error('No se pudo crear el vehículo. Intente de nuevo.');
    }
    
    // Ahora podemos crear la solicitud con el empleado asignado
    console.log(`Creando solicitud con: idCiudadano=${idCiudadano}, idEmpleado=${idEmpleado}, idMatricula=${idMatricula}, idVehiculo=${idVehiculo}`);
    
    // Verificar que tenemos todos los campos de la clave primaria antes de insertar
    if (!idCiudadano || !idEmpleado || !idMatricula || !idVehiculo) {
      console.error(`Error: Faltan campos para clave primaria - idCiudadano: ${idCiudadano}, idEmpleado: ${idEmpleado}, idMatricula: ${idMatricula}, idVehiculo: ${idVehiculo}`);
      throw new Error('Faltan campos obligatorios para crear la solicitud. Contacte al administrador.');
    }
    
    const solicitudResult = await client.query(
      `INSERT INTO Solicitud
       (idPersona, idEmpleado, idMatricula, idVehiculo, docCedula, docLicencia, docSeguro, docFacturaVehiculo, 
       estadoDecision, motivoRechazo, notaRevision, detalleRechazo, fechaRegistro, fechaProcesada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, CURRENT_DATE, NULL)
       RETURNING *`,
      [
        idCiudadano,
        idEmpleado,
        idMatricula,
        idVehiculo,
        documentos.docCedula,
        documentos.docLicencia,
        documentos.docSeguro || null,
        documentos.docFacturaVehiculo,
        'Pendiente'
      ]
    );
    
    // Verificar si con esta nueva solicitud el empleado llega a 5 solicitudes pendientes
    const solicitudesPendientesResult = await client.query(
      `SELECT COUNT(*) as total
       FROM Solicitud
       WHERE idEmpleado = $1 AND estadoDecision = 'Pendiente'`,
      [idEmpleado]
    );
    
    const totalSolicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total, 10);
    
    // Si con esta nueva solicitud llega a 5, cambiar el estado del empleado a inactivo
    if (totalSolicitudesPendientes >= 5) {
      console.log(`El empleado ${idEmpleado} ha alcanzado ${totalSolicitudesPendientes} solicitudes pendientes. Cambiando estado a inactivo.`);
      
      await client.query(
        'UPDATE Persona SET estado = $1 WHERE idPersona = $2',
        ['inactivo', idEmpleado]
      );
      
      // También actualizar el usuario asociado a inactivo
      const idUsuario = await obtenerIdUsuario(client, idEmpleado);
      if (idUsuario) {
        await client.query(
          'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2',
          ['inactivo', idUsuario]
        );
      }
      
      // Marcar que esta solicitud está en cola o alcanzó el límite
      enCola = true;
    } else {
      // Asegurarse de que el empleado esté marcado como activo si tiene menos de 5 solicitudes
      console.log(`El empleado ${idEmpleado} tiene ${totalSolicitudesPendientes} solicitudes pendientes. Confirmando estado activo.`);
      
      await client.query(
        'UPDATE Persona SET estado = $1 WHERE idPersona = $2',
        ['activo', idEmpleado]
      );
      
      // También actualizar el usuario asociado a activo
      const idUsuario = await obtenerIdUsuario(client, idEmpleado);
      if (idUsuario) {
        await client.query(
          'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2',
          ['activo', idUsuario]
        );
      }
    }
    
    await client.query('COMMIT');
    
    try {
      console.log('Solicitud creada con éxito:', solicitudResult.rows[0]);
      
      // La solicitud recién creada tiene idVehiculo y idSolicitud
      // Preferimos usar idSolicitud si está disponible, sino idVehiculo
      const idSolicitudCreada = solicitudResult.rows[0].idsolicitud || solicitudResult.rows[0].idvehiculo;
      
      // Devolver la solicitud creada con datos completos
      const solicitudCreada = await obtenerSolicitudPorId(idSolicitudCreada);
    
      // Si no se pudo obtener la solicitud completa, devolver al menos la básica
      if (!solicitudCreada) {
        console.log(`No se pudo obtener la solicitud completa, devolviendo datos básicos`);
        const resultado = {
          idSolicitud: idSolicitudCreada,
          idVehiculo: idVehiculo,
          idMatricula: idMatricula,
          idEmpleado: idEmpleado,
          idPersona: idCiudadano,
          estadoDecision: 'Pendiente',
          enCola: enCola
        };
        return resultado;
      }
    
      // Agregar indicador de si la solicitud está en cola
      if (enCola) {
        solicitudCreada.enCola = true;
      }
    
      return solicitudCreada;
    } catch (error) {
      console.error('Error al obtener la solicitud creada:', error);
      // Si hay un error al obtener la solicitud completa, devolver al menos los datos básicos
      return {
        idSolicitud: solicitudResult.rows[0].idsolicitud,
        idVehiculo: idVehiculo,
        idMatricula: idMatricula,
        idEmpleado: idEmpleado,
        idPersona: idCiudadano,
        estadoDecision: 'Pendiente',
        enCola: enCola
      };
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en crearSolicitud:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener ID de usuario asociado a una persona
 */
const obtenerIdUsuario = async (client, idPersona) => {
  try {
    const userResult = await client.query(
      'SELECT idUsuario FROM Persona WHERE idPersona = $1',
      [idPersona]
    );
    
    // Los nombres de columnas son devueltos en minúsculas por PostgreSQL
    return userResult.rows.length > 0 ? userResult.rows[0].idusuario : null;
  } catch (error) {
    console.error(`Error al obtener idUsuario para persona ${idPersona}:`, error);
    return null;
  }
};

/**
 * Obtener las solicitudes de un ciudadano
 */
const obtenerSolicitudesPorCiudadano = async (idCiudadano) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
        v.chasis, v.tipoUso,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.nombre as marcaNombre,
        mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        e.nombres as empleadoNombres, e.apellidos as empleadoApellidos
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      WHERE s.idPersona = $1
      ORDER BY s.fechaRegistro DESC`,
      [idCiudadano]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error en obtenerSolicitudesPorCiudadano:', error);
    throw error;
  }
};

/**
 * Obtener una solicitud específica por ID
 */
const obtenerSolicitudPorId = async (idSolicitud) => {
  try {
    console.log(`Obteniendo solicitud con ID: ${idSolicitud}`);
    
    // Primero verificar si la solicitud existe 
    const verificacionResult = await pool.query(
      'SELECT * FROM Solicitud WHERE idVehiculo = $1',
      [idSolicitud]
    );
    
    if (verificacionResult.rows.length === 0) {
      console.log(`No se encontró solicitud con idVehiculo=${idSolicitud}`);
      return null;
    }
    
    console.log(`Solicitud básica encontrada, obteniendo detalles completos`);
    
    // Si existe, obtener los detalles completos
    const result = await pool.query(
      `SELECT 
        s.idVehiculo, s.idPersona, s.idEmpleado, s.idMatricula, 
        s.fechaRegistro, s.fechaProcesada, s.estadoDecision, 
        s.notaRevision, s.motivoRechazo, s.detalleRechazo,
        v.chasis, v.tipoUso, v.estado as estadoVehiculo,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.nombre as marcaNombre, ma.idMarca,
        mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos, c.cedula as ciudadanoCedula,
        e.nombres as empleadoNombres, e.apellidos as empleadoApellidos,
        e.idPersona as idEmpleado,
        seg.proveedor as seguroProveedor, seg.numeroPoliza
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN Persona c ON s.idPersona = c.idPersona
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      LEFT JOIN Seguro seg ON v.idSeguro = seg.idSeguro
      WHERE s.idVehiculo = $1`,
      [idSolicitud]
    );
    
    if (result.rows.length === 0) {
      // Si llegamos aquí, la solicitud existe pero hubo problemas con los joins
      console.log(`Solicitud existe pero no se pudieron obtener detalles completos`);
      
      // Devolver al menos la solicitud básica
      return verificacionResult.rows[0];
    }
    
    console.log(`Solicitud completa encontrada con éxito`);
    return result.rows[0];
  } catch (error) {
    console.error(`Error en obtenerSolicitudPorId (${idSolicitud}):`, error);
    throw error;
  }
};

/**
 * Obtener las solicitudes asignadas a un empleado
 */
const obtenerSolicitudesPorEmpleado = async (idEmpleado) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
        v.chasis, v.tipoUso,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.nombre as marcaNombre,
        mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN Persona c ON s.idPersona = c.idPersona
      WHERE s.idEmpleado = $1
      ORDER BY 
        CASE WHEN s.estadoDecision = 'Pendiente' THEN 0 ELSE 1 END,
        s.fechaRegistro ASC`,
      [idEmpleado]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error en obtenerSolicitudesPorEmpleado:', error);
    throw error;
  }
};

/**
 * Obtener todas las solicitudes (para administradores)
 */
const obtenerTodasSolicitudes = async (filtros = {}, paginacion = { page: 1, limit: 10 }) => {
  const client = await pool.connect();
  
  try {
    let queryParams = [];
    let queryConditions = [];
    let queryValues = [];
    
    // Construir condiciones según filtros
    if (filtros.marca) {
      queryConditions.push(`ma.nombre ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${filtros.marca}%`);
    }
    
    if (filtros.modelo) {
      queryConditions.push(`m.nombre ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${filtros.modelo}%`);
    }
    
    if (filtros.estadoDecision) {
      queryConditions.push(`s.estadoDecision = $${queryParams.length + 1}`);
      queryParams.push(filtros.estadoDecision);
    }
    
    if (filtros.idEmpleado) {
      queryConditions.push(`s.idEmpleado = $${queryParams.length + 1}`);
      queryParams.push(filtros.idEmpleado);
    }
    
    if (filtros.fechaDesde) {
      queryConditions.push(`s.fechaRegistro >= $${queryParams.length + 1}`);
      queryParams.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
      queryConditions.push(`s.fechaRegistro <= $${queryParams.length + 1}`);
      queryParams.push(filtros.fechaHasta);
    }
    
    const whereClause = queryConditions.length > 0 
      ? `WHERE ${queryConditions.join(' AND ')}` 
      : '';
    
    // Contar total de resultados
    const countQuery = `
      SELECT COUNT(*) as total
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Calcular offset
    const offset = (paginacion.page - 1) * paginacion.limit;
    
    // Consulta paginada
    const query = `
      SELECT s.*, 
        v.chasis, v.tipoUso,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.nombre as marcaNombre,
        mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos,
        e.nombres as empleadoNombres, e.apellidos as empleadoApellidos
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN Persona c ON s.idPersona = c.idPersona
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      ${whereClause}
      ORDER BY s.fechaRegistro DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(paginacion.limit, offset);
    
    const result = await client.query(query, queryParams);
    
    return {
      total,
      solicitudes: result.rows
    };
  } catch (error) {
    console.error('Error en obtenerTodasSolicitudes:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Asignar una solicitud a un empleado específico
 */
const asignarSolicitudEmpleado = async (idSolicitud, idEmpleado) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verificar que el empleado existe y es empleado
    const empleadoResult = await client.query(
      `SELECT p.*, u.idUsuario, u.estado as estadoUsuario 
       FROM Persona p 
       JOIN Usuario u ON p.idUsuario = u.idUsuario
       WHERE p.idPersona = $1 AND u.idTipoUsuario = 2`,
      [idEmpleado]
    );
    
    console.log('Empleado encontrado para asignar:', empleadoResult.rows[0]);
    
    if (empleadoResult.rows.length === 0) {
      throw new Error('El empleado no existe o no es un empleado válido');
    }
    
    // Verificar cuántas solicitudes pendientes tiene el empleado
    const solicitudesPendientesResult = await client.query(
      `SELECT COUNT(*) as total
       FROM Solicitud
       WHERE idEmpleado = $1 AND estadoDecision = 'Pendiente'`,
      [idEmpleado]
    );
    
    const totalSolicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total, 10);
    const esInactivo = empleadoResult.rows[0].estado === 'inactivo';
    let enCola = false;
    
    // Si el empleado ya tiene 5 solicitudes pendientes o está inactivo, informar que quedará en cola
    if (totalSolicitudesPendientes >= 5 || esInactivo) {
      enCola = true;
      console.log(`El empleado ${idEmpleado} ya tiene ${totalSolicitudesPendientes} solicitudes pendientes o está inactivo. Solicitud quedará en cola.`);
    }
    
    // Obtener la solicitud actual
    const solicitudResult = await client.query(
      'SELECT * FROM Solicitud WHERE idVehiculo = $1 AND estadoDecision = $2',
      [idSolicitud, 'Pendiente']
    );
    
    if (solicitudResult.rows.length === 0) {
      return null; // No existe o no está pendiente
    }
    
    // Actualizar la solicitud
    await client.query(
      'UPDATE Solicitud SET idEmpleado = $1 WHERE idVehiculo = $2 AND estadoDecision = $3',
      [idEmpleado, idSolicitud, 'Pendiente']
    );
    
    // Si con esta nueva solicitud llega a 5, cambiar el estado del empleado a inactivo
    if (!esInactivo && totalSolicitudesPendientes + 1 >= 5) {
      await client.query(
        'UPDATE Persona SET estado = $1 WHERE idPersona = $2',
        ['inactivo', idEmpleado]
      );
      
      // También actualizar el usuario asociado a inactivo
      const idUsuario = empleadoResult.rows[0].idusuario;
      if (idUsuario) {
        await client.query(
          'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2',
          ['inactivo', idUsuario]
        );
      }
      
      enCola = true;
    }
    
    await client.query('COMMIT');
    
    try {
      // Devolver la solicitud actualizada
      const solicitudActualizada = await obtenerSolicitudPorId(idSolicitud);
      
      // Agregar indicador de si la solicitud está en cola
      if (enCola) {
        solicitudActualizada.enCola = true;
      }
      
      return solicitudActualizada;
    } catch (error) {
      console.error('Error al obtener solicitud actualizada:', error);
      return { 
        idVehiculo: idSolicitud,
        idEmpleado: idEmpleado,
        enCola: enCola
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en asignarSolicitudEmpleado:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Procesar una solicitud (aprobar o rechazar)
 */
const procesarSolicitud = async ({ idSolicitud, idEmpleado, estadoDecision, notaRevision, motivoRechazo, detalleRechazo }) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log(`Iniciando procesamiento de solicitud ${idSolicitud} por empleado ${idEmpleado}`);
    
    // Verificar primero si el empleado existe
    const empleadoPersonaResult = await client.query(
      'SELECT * FROM Persona WHERE idPersona = $1',
      [idEmpleado]
    );
    
    if (empleadoPersonaResult.rows.length === 0) {
      console.error(`Error: No se encontró la persona con ID ${idEmpleado}`);
      throw new Error(`No se encontró la persona con ID ${idEmpleado}`);
    }
    
    console.log(`Persona encontrada: ${JSON.stringify(empleadoPersonaResult.rows[0])}`);
    
    // Verificar que la solicitud existe y está pendiente
    const solicitudResult = await client.query(
      'SELECT * FROM Solicitud WHERE idVehiculo = $1 AND estadoDecision = $2',
      [idSolicitud, 'Pendiente']
    );
    
    if (solicitudResult.rows.length === 0) {
      console.log(`No se encontró una solicitud pendiente con ID ${idSolicitud}`);
      return null; // No existe o no está pendiente
    }
    
    const solicitud = solicitudResult.rows[0];
    console.log('Solicitud a procesar:', solicitud);
    
    // Si la solicitud no está asignada a este empleado, verificar si el empleado es administrador
    // y permitir el procesamiento en ese caso
    if (solicitud.idempleado !== idEmpleado) {
      const esAdminResult = await client.query(
        `SELECT u.idTipoUsuario 
         FROM Usuario u 
         JOIN Persona p ON u.idUsuario = p.idUsuario 
         WHERE p.idPersona = $1`,
        [idEmpleado]
      );
      
      const esAdmin = esAdminResult.rows.length > 0 && esAdminResult.rows[0].idtipousuario === 1;
      
      if (!esAdmin) {
        console.log(`La solicitud ${idSolicitud} no está asignada al empleado ${idEmpleado}`);
        console.log(`Está asignada a: ${solicitud.idempleado}`);
        return null; // No está asignada a este empleado
      } else {
        console.log(`Empleado ${idEmpleado} es administrador, permitiendo procesamiento`);
      }
    }
    
    if (estadoDecision === 'Aprobada') {
      // Generar matrícula
      const matricula = await generarMatricula();
      
      // Actualizar la matrícula
      await client.query(
        'UPDATE Matricula SET matriculaGenerada = $1, estado = $2, fechaEmisionMatricula = CURRENT_DATE WHERE idMatricula = $3',
        [matricula, 'Generada', solicitud.idmatricula]
      );
      
      // Actualizar el vehículo (asignar propietario y activar)
      await client.query(
        'UPDATE Vehiculo SET idPropietario = $1, estado = $2 WHERE idVehiculo = $3',
        [solicitud.idpersona, 'activo', solicitud.idvehiculo]
      );
      
      // Actualizar la solicitud - Corregido para evitar restricción en el WHERE
      await client.query(
        `UPDATE Solicitud 
         SET estadoDecision = $1, notaRevision = $2, fechaProcesada = CURRENT_TIMESTAMP
         WHERE idVehiculo = $3`,
        ['Aprobada', notaRevision, idSolicitud]
      );
      
    } else if (estadoDecision === 'Rechazada') {
      // Actualizar la matrícula a estado cancelada
      await client.query(
        'UPDATE Matricula SET estado = $1 WHERE idMatricula = $2',
        ['Cancelada', solicitud.idmatricula]
      );
      
      // Actualizar la solicitud - Corregido para evitar restricción en el WHERE
      await client.query(
        `UPDATE Solicitud 
         SET estadoDecision = $1, motivoRechazo = $2, detalleRechazo = $3, fechaProcesada = CURRENT_TIMESTAMP
         WHERE idVehiculo = $4`,
        ['Rechazada', motivoRechazo, detalleRechazo, idSolicitud]
      );
    }
    
    // Verificar si el empleado ahora tiene menos de 5 solicitudes pendientes
    // Usamos el empleado asociado a la solicitud, no el que la está procesando
    const idEmpleadoSolicitud = solicitud.idempleado;
    
    console.log(`Verificando solicitudes pendientes del empleado ${idEmpleadoSolicitud}`);
    
    const solicitudesPendientesResult = await client.query(
      `SELECT COUNT(*) as total
       FROM Solicitud
       WHERE idEmpleado = $1 AND estadoDecision = 'Pendiente'`,
      [idEmpleadoSolicitud]
    );
    
    const totalSolicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total, 10);
    console.log(`El empleado ${idEmpleadoSolicitud} tiene ahora ${totalSolicitudesPendientes} solicitudes pendientes después de procesar.`);
    
    // Si el empleado ahora tiene menos de 5 solicitudes pendientes, reactivarlo
    if (totalSolicitudesPendientes < 5) {
      // Obtener información del empleado y su usuario asociado
      const empleadoResult = await client.query(
        `SELECT p.idPersona, p.estado as estadoPersona, u.idUsuario, u.estado as estadoUsuario
         FROM Persona p
         JOIN Usuario u ON p.idUsuario = u.idUsuario
         WHERE p.idPersona = $1`,
        [idEmpleadoSolicitud]
      );
      
      console.log('Datos de empleado para reactivación:', empleadoResult.rows[0]);
      
      // Si está inactivo, activarlo
      if (empleadoResult.rows.length > 0 && empleadoResult.rows[0].estadopersona === 'inactivo') {
        await client.query(
          'UPDATE Persona SET estado = $1 WHERE idPersona = $2',
          ['activo', idEmpleadoSolicitud]
        );
        
        // También actualizar el usuario asociado a activo
        const idUsuario = empleadoResult.rows[0].idusuario;
        if (idUsuario) {
          await client.query(
            'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2',
            ['activo', idUsuario]
          );
        }
        
        console.log(`Empleado ${idEmpleadoSolicitud} reactivado. Ahora tiene ${totalSolicitudesPendientes} solicitudes pendientes.`);
      }
    }
    
    await client.query('COMMIT');
    
    try {
      // Devolver la solicitud actualizada
      const solicitudActualizada = await obtenerSolicitudPorId(idSolicitud);
      console.log(`Solicitud ${idSolicitud} procesada exitosamente como ${estadoDecision}`);
      return solicitudActualizada;
    } catch (error) {
      console.error('Error al obtener solicitud procesada:', error);
      return {
        idVehiculo: idSolicitud,
        estadoDecision: estadoDecision,
        mensaje: estadoDecision === 'Aprobada' 
          ? 'Solicitud aprobada exitosamente' 
          : 'Solicitud rechazada'
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en procesarSolicitud:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Generar un número de matrícula único
 */
const generarMatricula = async () => {
  const client = await pool.connect();
  
  try {
    // Intentar hasta 10 veces para generar una matrícula única
    for (let intento = 0; intento < 10; intento++) {
      // Generar un número aleatorio de 6 dígitos
      const numeroRandom = Math.floor(100000 + Math.random() * 900000);
      const matricula = `K${numeroRandom.toString().slice(-7)}`;
      
      // Verificar si ya existe
      const existeResult = await client.query(
        'SELECT * FROM Matricula WHERE matriculaGenerada = $1',
        [matricula]
      );
      
      // Si no existe, devolver la matrícula generada
      if (existeResult.rows.length === 0) {
        return matricula;
      }
    }
    
    // Si después de 10 intentos no se pudo generar, usar formato con timestamp
    const timestamp = Date.now().toString().slice(-7);
    return `K${timestamp}`;
    
  } catch (error) {
    console.error('Error al generar matrícula:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener las solicitudes asignadas a un empleado con filtros
 */
const obtenerSolicitudesPorEmpleadoFiltradas = async (filtros) => {
  const client = await pool.connect();
  
  try {
    console.log(`Buscando solicitudes para empleado ID: ${filtros.idEmpleado} con filtros: ${JSON.stringify(filtros)}`);
    
    let queryParams = [filtros.idEmpleado];
    let queryConditions = ['s.idEmpleado = $1'];
    
    // Construir condiciones según filtros
    if (filtros.marca) {
      queryConditions.push(`ma.nombre ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${filtros.marca}%`);
    }
    
    if (filtros.modelo) {
      queryConditions.push(`m.nombre ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${filtros.modelo}%`);
    }
    
    if (filtros.estadoDecision) {
      queryConditions.push(`s.estadoDecision = $${queryParams.length + 1}`);
      queryParams.push(filtros.estadoDecision);
    }
    
    if (filtros.fechaDesde) {
      queryConditions.push(`s.fechaRegistro >= $${queryParams.length + 1}`);
      queryParams.push(filtros.fechaDesde);
    }
    
    if (filtros.fechaHasta) {
      queryConditions.push(`s.fechaRegistro <= $${queryParams.length + 1}`);
      queryParams.push(filtros.fechaHasta);
    }
    
    const whereClause = queryConditions.join(' AND ');
    
    // Verificar primero si hay solicitudes para este empleado
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM Solicitud s
      WHERE s.idEmpleado = $1
    `;
    
    const countResult = await client.query(countQuery, [filtros.idEmpleado]);
    const total = parseInt(countResult.rows[0].total);
    
    if (total === 0) {
      console.log(`No se encontraron solicitudes para el empleado ID: ${filtros.idEmpleado}`);
      return [];
    }
    
    const query = `
      SELECT s.*, 
        v.chasis, v.tipoUso,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.idMarca, ma.nombre as marcaNombre,
        mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN Persona c ON s.idPersona = c.idPersona
      WHERE ${whereClause}
      ORDER BY 
        CASE WHEN s.estadoDecision = 'Pendiente' THEN 0 ELSE 1 END,
        s.fechaRegistro ASC
    `;
    
    console.log(`Ejecutando consulta con parámetros: ${JSON.stringify(queryParams)}`);
    const result = await client.query(query, queryParams);
    
    console.log(`Se encontraron ${result.rows.length} solicitudes para el empleado ID: ${filtros.idEmpleado}`);
    return result.rows;
  } catch (error) {
    console.error(`Error en obtenerSolicitudesPorEmpleadoFiltradas para empleado ${filtros.idEmpleado}:`, error);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  crearSolicitud,
  obtenerSolicitudesPorCiudadano,
  obtenerSolicitudPorId,
  obtenerSolicitudesPorEmpleado,
  obtenerTodasSolicitudes,
  asignarSolicitudEmpleado,
  procesarSolicitud,
  obtenerSolicitudesPorEmpleadoFiltradas
}; 
