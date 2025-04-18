const { pool } = require('../db');

/**
 * Crear una nueva solicitud de matrícula
 */
const crearSolicitud = async (datosVehiculo, datosPropietario, seguro, documentos) => {
  const client = await pool.connect();
  
  let idVehiculo = null;
  let idMatricula = null;
  let idCiudadano = null;
  let idSeguro = null;
  let idEmpleado = null;
  let enCola = false;
  
  try {
    await client.query('BEGIN');
    
    // PASO 1: Manejar la persona (propietario)
    // Primero verificar si el usuario ya tiene una persona asociada
    if (datosPropietario.idUsuario) {
      const personaUsuarioResult = await client.query(
        'SELECT idPersona FROM Persona WHERE idUsuario = $1',
        [datosPropietario.idUsuario]
      );
      
      if (personaUsuarioResult.rows.length > 0) {
        // El usuario ya tiene una persona asociada, usamos esa
        idCiudadano = personaUsuarioResult.rows[0].idpersona;
        console.log(`Usuario ${datosPropietario.idUsuario} ya tiene persona asociada: ${idCiudadano}. Actualizando datos.`);
        
        // Verificar límite de vehículos
        const { alcanzadoLimite, cantidadVehiculos } = await verificarLimiteVehiculosCiudadano(idCiudadano);
        
        if (alcanzadoLimite) {
          // No permitir la creación de una nueva solicitud
          throw new Error(`El ciudadano ya tiene ${cantidadVehiculos} vehículos registrados. No puede registrar más vehículos.`);
        }
        
        // Actualizar datos de la persona
        let updateFields = [];
        let updateParams = [idCiudadano]; // El último parámetro será el ID
        let paramIndex = 1;
        
        // Verificar qué campos actualizar (solo los proporcionados)
        if (datosPropietario.cedula) {
          updateFields.push(`cedula = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.cedula);
          console.log(`Actualizando cédula de persona ${idCiudadano} a: ${datosPropietario.cedula}`);
        }
        
        if (datosPropietario.nombres) {
          updateFields.push(`nombres = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.nombres);
        }
        
        if (datosPropietario.apellidos) {
          updateFields.push(`apellidos = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.apellidos);
        }
        
        if (datosPropietario.fechaNacimiento) {
          updateFields.push(`fechaNacimiento = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.fechaNacimiento);
        }
        
        if (datosPropietario.estadoCivil) {
          updateFields.push(`estadoCivil = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.estadoCivil);
        }
        
        if (datosPropietario.sexo) {
          updateFields.push(`sexo = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.sexo);
        }
        
        if (datosPropietario.telefono) {
          updateFields.push(`telefono = $${++paramIndex}`);
          updateParams.splice(paramIndex-1, 0, datosPropietario.telefono);
        }
        
        // Actualizar ubicación si se proporciona
        let idUbicacion = null;
        if (datosPropietario.idMunicipio) {
          const ubicacionResult = await client.query(
            'INSERT INTO Ubicacion (direccion, idMunicipio) VALUES ($1, $2) RETURNING idUbicacion',
            [datosPropietario.direccion || null, datosPropietario.idMunicipio]
          );
          
          if (ubicacionResult.rows.length > 0) {
            idUbicacion = ubicacionResult.rows[0].idubicacion;
            updateFields.push(`idUbicacion = $${++paramIndex}`);
            updateParams.splice(paramIndex-1, 0, idUbicacion);
          }
        }
        
        // Si hay campos para actualizar, ejecutar la actualización
        if (updateFields.length > 0) {
          try {
            const updateQuery = `UPDATE Persona SET ${updateFields.join(', ')} WHERE idPersona = $1`;
            await client.query(updateQuery, updateParams);
            console.log(`Persona ${idCiudadano} actualizada con éxito`);
          } catch (error) {
            // Si hay un error por duplicidad de cédula, manejarlo de forma más amigable
            if (error.code === '23505' && error.constraint.includes('cedula')) {
              console.error(`Error: La cédula ${datosPropietario.cedula} ya está registrada para otra persona`);
              
              // Buscar la persona con esa cédula
              const personaPorCedulaResult = await client.query(
                'SELECT idPersona, idUsuario FROM Persona WHERE cedula = $1',
                [datosPropietario.cedula]
              );
              
              if (personaPorCedulaResult.rows.length > 0) {
                const personaConCedula = personaPorCedulaResult.rows[0];
                console.log(`La cédula ${datosPropietario.cedula} pertenece a la persona ID: ${personaConCedula.idpersona}`);
                
                // Si esa persona no tiene usuario, podríamos vincularla
                if (!personaConCedula.idusuario && datosPropietario.idUsuario) {
                  await verificarRelacionUsuarioPersona(client, datosPropietario.idUsuario, personaConCedula.idpersona);
                  // Usar esta persona en lugar de la original
                  idCiudadano = personaConCedula.idpersona;
                  console.log(`Reasignando solicitud a la persona ID: ${idCiudadano} con la cédula solicitada`);
                }
              }
            } else {
              throw error; // Otros errores se propagan normalmente
            }
          }
        }
      } else {
        // El usuario no tiene persona asociada, buscar por cédula
        const personaByCedulaResult = await client.query(
          'SELECT idPersona, idUsuario FROM Persona WHERE cedula = $1',
          [datosPropietario.cedula]
        );
        
        if (personaByCedulaResult.rows.length > 0) {
          // Existe una persona con esta cédula, vincularla al usuario
          idCiudadano = personaByCedulaResult.rows[0].idpersona;
          
          // Verificar y corregir la relación usuario-persona
          await verificarRelacionUsuarioPersona(client, datosPropietario.idUsuario, idCiudadano);
          
          console.log(`Vinculando usuario ${datosPropietario.idUsuario} con persona existente ${idCiudadano}`);
          
          // Verificar límite de vehículos
          const { alcanzadoLimite, cantidadVehiculos } = await verificarLimiteVehiculosCiudadano(idCiudadano);
          
          if (alcanzadoLimite) {
            // No permitir la creación de una nueva solicitud
            throw new Error(`El ciudadano ya tiene ${cantidadVehiculos} vehículos registrados. No puede registrar más vehículos.`);
          }
          
          // Actualizar otros datos personales si es necesario
          try {
            await client.query(
              `UPDATE Persona 
               SET nombres = COALESCE($1, nombres), 
                   apellidos = COALESCE($2, apellidos), 
                   fechaNacimiento = COALESCE($3, fechaNacimiento), 
                   estadoCivil = COALESCE($4, estadoCivil), 
                   sexo = COALESCE($5, sexo), 
                   telefono = COALESCE($6, telefono),
                   cedula = COALESCE($7, cedula)
               WHERE idPersona = $8`,
              [
                datosPropietario.nombres || null,
                datosPropietario.apellidos || null,
                datosPropietario.fechaNacimiento || null,
                datosPropietario.estadoCivil || null,
                datosPropietario.sexo || null,
                datosPropietario.telefono || null,
                datosPropietario.cedula || null,
                idCiudadano
              ]
            );
            console.log(`Persona ${idCiudadano} actualizada con cédula ${datosPropietario.cedula || 'sin cambios'}`);
          } catch (error) {
            // Si hay un error por duplicidad de cédula, registrarlo pero continuar
            if (error.code === '23505' && error.constraint.includes('cedula')) {
              console.error(`Error: La cédula ${datosPropietario.cedula} ya está registrada para otra persona`);
            } else {
              throw error; // Otros errores se propagan normalmente
            }
          }
        } else {
          // No existe persona con esta cédula, crear una nueva
          console.log(`Creando nueva persona para usuario ${datosPropietario.idUsuario}`);
          
          // Crear ubicación si se proporcionan datos
          let idUbicacion = null;
          if (datosPropietario.idMunicipio) {
            const ubicacionResult = await client.query(
              'INSERT INTO Ubicacion (direccion, idMunicipio) VALUES ($1, $2) RETURNING idUbicacion',
              [datosPropietario.direccion || null, datosPropietario.idMunicipio]
            );
            
            if (ubicacionResult.rows.length > 0) {
              idUbicacion = ubicacionResult.rows[0].idubicacion;
            }
          }
          
          // Crear nueva persona como ciudadano
          const newPersonaResult = await client.query(
            `INSERT INTO Persona 
             (nombres, apellidos, cedula, fechaNacimiento, estadoCivil, sexo, telefono, 
              estado, idTipoPersona, idUsuario, idUbicacion)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING idPersona`,
            [
              datosPropietario.nombres,
              datosPropietario.apellidos,
              datosPropietario.cedula,
              datosPropietario.fechaNacimiento || null,
              datosPropietario.estadoCivil || null,
              datosPropietario.sexo || null,
              datosPropietario.telefono || null,
              'activo',
              3, // Tipo persona ciudadano
              datosPropietario.idUsuario, // Asignar usuario directamente
              idUbicacion
            ]
          );
          
          idCiudadano = newPersonaResult.rows[0].idpersona;
          console.log(`Persona ${idCiudadano} creada y vinculada al usuario ${datosPropietario.idUsuario}`);
        }
      }
    } else {
      // Sin usuario autenticado, buscar o crear por cédula
      const personaResult = await client.query(
        'SELECT idPersona FROM Persona WHERE cedula = $1',
        [datosPropietario.cedula]
      );
      
      if (personaResult.rows.length > 0) {
        // Existe una persona con esta cédula
        idCiudadano = personaResult.rows[0].idpersona;
        console.log(`Usando persona existente con ID ${idCiudadano}`);
        
        // Verificar límite de vehículos
        const { alcanzadoLimite, cantidadVehiculos } = await verificarLimiteVehiculosCiudadano(idCiudadano);
        
        if (alcanzadoLimite) {
          // No permitir la creación de una nueva solicitud
          throw new Error(`El ciudadano ya tiene ${cantidadVehiculos} vehículos registrados. No puede registrar más vehículos.`);
        }
        
        // Actualizar otros datos personales si es necesario
        try {
          await client.query(
            `UPDATE Persona 
             SET nombres = COALESCE($1, nombres), 
                 apellidos = COALESCE($2, apellidos), 
                 fechaNacimiento = COALESCE($3, fechaNacimiento), 
                 estadoCivil = COALESCE($4, estadoCivil), 
                 sexo = COALESCE($5, sexo), 
                 telefono = COALESCE($6, telefono),
                 cedula = COALESCE($7, cedula)
             WHERE idPersona = $8`,
            [
              datosPropietario.nombres || null,
              datosPropietario.apellidos || null,
              datosPropietario.fechaNacimiento || null,
              datosPropietario.estadoCivil || null,
              datosPropietario.sexo || null,
              datosPropietario.telefono || null,
              datosPropietario.cedula || null,
              idCiudadano
            ]
          );
          console.log(`Persona ${idCiudadano} actualizada con cédula ${datosPropietario.cedula || 'sin cambios'}`);
        } catch (error) {
          // Si hay un error por duplicidad de cédula, registrarlo pero continuar
          if (error.code === '23505' && error.constraint.includes('cedula')) {
            console.error(`Error: La cédula ${datosPropietario.cedula} ya está registrada para otra persona`);
          } else {
            throw error; // Otros errores se propagan normalmente
          }
        }
      } else {
        // No existe persona con esta cédula, crear una nueva
        console.log('Creando nueva persona sin usuario asociado');
        
        // Crear ubicación si se proporcionan datos
        let idUbicacion = null;
        if (datosPropietario.idMunicipio) {
          const ubicacionResult = await client.query(
            'INSERT INTO Ubicacion (direccion, idMunicipio) VALUES ($1, $2) RETURNING idUbicacion',
            [datosPropietario.direccion || null, datosPropietario.idMunicipio]
          );
          
          if (ubicacionResult.rows.length > 0) {
            idUbicacion = ubicacionResult.rows[0].idubicacion;
          }
        }
        
        // Crear nueva persona como ciudadano
        const newPersonaResult = await client.query(
          `INSERT INTO Persona 
           (nombres, apellidos, cedula, fechaNacimiento, estadoCivil, sexo, telefono, 
            estado, idTipoPersona, idUsuario, idUbicacion)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING idPersona`,
          [
            datosPropietario.nombres,
            datosPropietario.apellidos,
            datosPropietario.cedula,
            datosPropietario.fechaNacimiento || null,
            datosPropietario.estadoCivil || null,
            datosPropietario.sexo || null,
            datosPropietario.telefono || null,
            'activo',
            3, // Tipo persona ciudadano
            null, // Sin usuario
            idUbicacion
          ]
        );
        
        idCiudadano = newPersonaResult.rows[0].idpersona;
        console.log(`Persona ${idCiudadano} creada sin usuario asociado`);
      }
    }
    
    // PASO 2: Manejar el seguro (continuar con el código existente)
    if (seguro) {
      if (seguro.numeroPoliza && seguro.proveedor) {
        // Crear un nuevo seguro cada vez que se crea una solicitud
        const nuevoSeguroResult = await client.query(
          'INSERT INTO Seguro (proveedor, numeroPoliza, estado) VALUES ($1, $2, $3) RETURNING idSeguro',
          [seguro.proveedor, seguro.numeroPoliza, 'activo']
        );
        
        idSeguro = nuevoSeguroResult.rows[0].idseguro;
      } else {
        // Si falta alguno de los campos requeridos
        idSeguro = null;
      }
    } else {
      idSeguro = null;
    }
    
    // PASO 3: Crear matrícula
    const matriculaResult = await client.query(
      `INSERT INTO Matricula (matriculaGenerada, estado, fechaEmisionMatricula)
       VALUES ($1, $2, CURRENT_DATE)
       RETURNING idMatricula`,
      [
        'TEMP' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
        'Pendiente'
      ]
    );
    
    idMatricula = matriculaResult.rows[0].idmatricula;
    
    // PASO 4: Asignar empleado
    // Asignar un empleado disponible (con menos de 5 solicitudes pendientes)
    const empleadoResult = await client.query(
      `SELECT e.idPersona, COUNT(s.*) as pendientes
       FROM Persona e
       JOIN Usuario u ON e.idUsuario = u.idUsuario
       LEFT JOIN Solicitud s ON e.idPersona = s.idEmpleado AND s.estadoDecision = 'Pendiente'
       WHERE u.idTipoUsuario = 2 AND e.estado = 'activo'
       GROUP BY e.idPersona
       HAVING COUNT(s.*) < 5
       ORDER BY COUNT(s.*) ASC
       LIMIT 1`
    );
    
    if (empleadoResult.rows.length > 0) {
      idEmpleado = empleadoResult.rows[0].idpersona;
    } else {
      // Si no hay empleados disponibles, elegir uno aleatorio
      const randomEmpleadoResult = await client.query(
        `SELECT e.idPersona
         FROM Persona e
         JOIN Usuario u ON e.idUsuario = u.idUsuario
         WHERE u.idTipoUsuario = 2
         ORDER BY RANDOM()
           LIMIT 1`
        );
        
      if (randomEmpleadoResult.rows.length > 0) {
        idEmpleado = randomEmpleadoResult.rows[0].idpersona;
        enCola = true; // Marcar que esta solicitud irá a cola
      } else {
        throw new Error('No hay empleados disponibles para procesar la solicitud');
      }
    }
    
    // PASO 5: Crear vehículo
    const vehiculoResult = await client.query(
      `INSERT INTO Vehiculo 
       (chasis, tipoUso, estado, fechaCreacion, idModelo, idPropietario, idMatricula, idTipoVehiculo, idSeguro) 
       VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8) 
       RETURNING idVehiculo`,
      [
        datosVehiculo.chasis, 
        datosVehiculo.tipoUso, 
        'inactivo', // El vehículo está inactivo hasta que se apruebe
        datosVehiculo.idModelo,
        idCiudadano, // Asignar propietario
        idMatricula,
        datosVehiculo.idTipoVehiculo || 1, // Valor por defecto si no se proporciona
        idSeguro
      ]
    );
    idVehiculo = vehiculoResult.rows[0].idvehiculo;
    
    // PASO 6: Crear solicitud
    const solicitudResult = await client.query(
      `INSERT INTO Solicitud
       (idPersona, idEmpleado, idMatricula, idVehiculo, docCedula, docLicencia, docSeguro, docFacturaVehiculo, 
       estadoDecision, motivoRechazo, notaRevision, detalleRechazo, fechaRegistro, fechaProcesada)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, NULL, NULL, CURRENT_DATE, NULL)
       RETURNING idSolicitud`,
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
    
    // PASO 7: Actualizar estado del empleado si necesario
    const solicitudesPendientesResult = await client.query(
      `SELECT COUNT(*) as total
       FROM Solicitud
       WHERE idEmpleado = $1 AND estadoDecision = 'Pendiente'`,
      [idEmpleado]
    );
    
    const totalSolicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total, 10);
    
    if (totalSolicitudesPendientes >= 5) {
      await client.query(
        'UPDATE Persona SET estado = $1 WHERE idPersona = $2',
        ['inactivo', idEmpleado]
      );
      
      const idUsuario = await obtenerIdUsuario(client, idEmpleado);
      if (idUsuario) {
        await client.query(
          'UPDATE Usuario SET estado = $1 WHERE idUsuario = $2',
          ['inactivo', idUsuario]
        );
      }
      
      enCola = true;
    }
    
    await client.query('COMMIT');
    
    // PASO 8: Obtener la solicitud completa
    try {
      // Marcar el cliente como liberado antes de liberarlo
      client.released = true;
      client.release();
      
      // Devolver la solicitud creada con todos los datos
      const solicitudCompleta = await obtenerSolicitudPorId(solicitudResult.rows[0].idsolicitud);
      
      if (!solicitudCompleta) {
        console.log('No se pudo obtener la solicitud completa en el primer intento, reintentando...');
        await new Promise(resolve => setTimeout(resolve, 500));
        const reintentoSolicitud = await obtenerSolicitudPorId(solicitudResult.rows[0].idsolicitud);
        
        if (!reintentoSolicitud) {
          console.log('No se pudo obtener la solicitud completa después de reintentar');
          return { idVehiculo, idMatricula, enCola };
        }
        
        return reintentoSolicitud;
      }
      
      // Agregar indicador de si la solicitud está en cola
      if (enCola) {
        solicitudCompleta.enCola = true;
      }
      
      return solicitudCompleta;
    } catch (error) {
      console.error('Error al obtener la solicitud completa:', error);
      return { idVehiculo, idMatricula, enCola };
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al crear solicitud:', error);
    throw error;
  } finally {
    // Solo liberar si no se ha liberado previamente
    if (client && !client.released) {
      client.release();
    }
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
    return null;
  }
};

/**
 * Obtener las solicitudes del ciudadano asociado al usuario autenticado
 */
const obtenerSolicitudesPorCiudadano = async (idPersona, idUsuario = null, estado = null) => {
  const client = await pool.connect();
  try {
    console.log(`Iniciando búsqueda de solicitudes - Persona ID: ${idPersona}, Usuario ID: ${idUsuario}, Estado: ${estado || 'Todos'}`);
    
    // Si no tenemos idPersona pero tenemos idUsuario, buscar la persona asociada
    if (!idPersona && idUsuario) {
      const personaResult = await client.query(
        'SELECT idPersona FROM Persona WHERE idUsuario = $1',
        [idUsuario]
      );
      
      if (personaResult.rows.length > 0) {
        idPersona = personaResult.rows[0].idpersona;
        console.log(`Se encontró la persona ID ${idPersona} asociada al usuario ID ${idUsuario}`);
      } else {
        console.log(`No se encontró ninguna persona asociada al usuario ID ${idUsuario}`);
        return []; // No hay persona asociada, no puede tener solicitudes
      }
    }
    
    // Si seguimos sin tener idPersona, no podemos buscar solicitudes
    if (!idPersona) {
      console.log('No se puede buscar solicitudes sin ID de persona');
      return [];
    }
    
    console.log(`Buscando solicitudes para la persona ID ${idPersona}`);
    
    // Preparar parámetros y consulta base
    let queryParams = [idPersona];
    let whereClause = 's.idPersona = $1';
    
    // Agregar filtro por estado si se especifica
    if (estado) {
      whereClause += ' AND s.estadoDecision = $2';
      queryParams.push(estado);
    }
    
    // Buscar solicitudes para esta persona específica con todos los datos relacionados
    const result = await client.query(
      `SELECT s.*, 
        v.chasis, v.tipoUso, v.idTipoVehiculo,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.idMarca, ma.nombre as marcaNombre,
        c.idPersona as ciudadanoId, c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos, 
        c.cedula as ciudadanoCedula, c.fechaNacimiento as ciudadanoFechaNacimiento, 
        c.estadoCivil as ciudadanoEstadoCivil, c.sexo as ciudadanoSexo, 
        c.telefono as ciudadanoTelefono, c.idUbicacion as ciudadanoIdUbicacion,
        mat.idMatricula, mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        e.idPersona as empleadoId, e.nombres as empleadoNombres, e.apellidos as empleadoApellidos,
        tv.nombre as tipoVehiculoNombre, tv.capacidad as tipoVehiculoCapacidad,
        seg.idSeguro, seg.proveedor as seguroProveedor, seg.numeroPoliza as seguroNumeroPoliza, seg.estado as seguroEstado,
        u.direccion as ciudadanoDireccion,
        mun.idMunicipio, mun.nombreMunicipio,
        prov.idProvincia, prov.nombreProvincia,
        uc.correo as ciudadanoCorreo,
        ue.correo as empleadoCorreo
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Persona c ON s.idPersona = c.idPersona
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      LEFT JOIN Seguro seg ON v.idSeguro = seg.idSeguro
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      LEFT JOIN Ubicacion u ON c.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio mun ON u.idMunicipio = mun.idMunicipio
      LEFT JOIN Provincia prov ON mun.idProvincia = prov.idProvincia
      LEFT JOIN Usuario uc ON c.idUsuario = uc.idUsuario
      LEFT JOIN Usuario ue ON e.idUsuario = ue.idUsuario
      WHERE ${whereClause}
      ORDER BY s.fechaRegistro DESC`,
      queryParams
    );
    
    console.log(`Se encontraron ${result.rows.length} solicitudes para la persona ID ${idPersona}`);
    
    // Transformar la respuesta para tener el mismo formato estructurado que obtenerSolicitudPorId
    const solicitudes = result.rows.map(solicitud => {
      const respuesta = {
        solicitud: {
          idSolicitud: solicitud.idsolicitud,
          fechaRegistro: solicitud.fecharegistro,
          fechaProcesada: solicitud.fechaprocesada,
          estadoDecision: solicitud.estadodecision,
          motivoRechazo: solicitud.motivorechazo,
          notaRevision: solicitud.notarevision,
          detalleRechazo: solicitud.detallerechazo,
          documentos: {
            cedula: solicitud.doccedula,
            licencia: solicitud.doclicencia,
            seguro: solicitud.docseguro,
            facturaVehiculo: solicitud.docfacturavehiculo
          }
        },
        vehiculo: {
          idVehiculo: solicitud.idvehiculo,
          chasis: solicitud.chasis,
          tipoUso: solicitud.tipouso,
          modelo: {
            idModelo: solicitud.idmodelo,
            nombre: solicitud.modelonombre,
            año: solicitud.año,
            color: solicitud.color,
            cilindraje: solicitud.cilindraje
          },
          marca: {
            idMarca: solicitud.idmarca,
            nombre: solicitud.marcanombre
          },
          tipoVehiculo: {
            idTipoVehiculo: solicitud.idtipovehiculo,
            nombre: solicitud.tipovehiculonombre,
            capacidad: solicitud.tipovehiculocapacidad
          }
        },
        matricula: {
          idMatricula: solicitud.idmatricula,
          matriculaGenerada: solicitud.matriculagenerada,
          estado: solicitud.estadomatricula,
          fechaEmision: solicitud.fechaemisionmatricula
        },
        ciudadano: {
          idPersona: solicitud.ciudadanoid,
          nombres: solicitud.ciudadanonombres,
          apellidos: solicitud.ciudadanoapellidos,
          cedula: solicitud.ciudadanocedula,
          fechaNacimiento: solicitud.ciudadanofechanacimiento,
          estadoCivil: solicitud.ciudadanoestadocivil,
          sexo: solicitud.ciudadanosexo,
          telefono: solicitud.ciudadanotelefono,
          correo: solicitud.ciudadanocorreo,
          ubicacion: solicitud.ciudadanoidubicacion ? {
            direccion: solicitud.ciudadanodireccion,
            municipio: {
              idMunicipio: solicitud.idmunicipio,
              nombre: solicitud.nombremunicipio
            },
            provincia: {
              idProvincia: solicitud.idprovincia,
              nombre: solicitud.nombreprovincia
            }
          } : null
        },
        empleado: solicitud.empleadoid ? {
          idPersona: solicitud.empleadoid,
          nombres: solicitud.empleadonombres,
          apellidos: solicitud.empleadoapellidos,
          correo: solicitud.empleadocorreo
        } : null
      };
      
      // Add insurance information only if it exists
      if (solicitud.idseguro) {
        respuesta.seguro = {
          idSeguro: solicitud.idseguro,
          proveedor: solicitud.seguroproveedor,
          numeroPoliza: solicitud.seguronumeropoliza,
          estado: solicitud.seguroestado
        };
      }
      
      return respuesta;
    });
    
    return solicitudes;
  } catch (error) {
    console.error('Error al obtener solicitudes por ciudadano:', error);
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Obtener una solicitud específica por ID
 */
const obtenerSolicitudPorId = async (idSolicitud) => {
  try {
    const result = await pool.query(
      `SELECT s.*, 
        v.chasis, v.tipoUso, v.idTipoVehiculo,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.idMarca, ma.nombre as marcaNombre,
        c.idPersona as ciudadanoId, c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos, 
        c.cedula as ciudadanoCedula, c.fechaNacimiento as ciudadanoFechaNacimiento, 
        c.estadoCivil as ciudadanoEstadoCivil, c.sexo as ciudadanoSexo, 
        c.telefono as ciudadanoTelefono, c.idUbicacion as ciudadanoIdUbicacion,
        mat.idMatricula, mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        e.idPersona as empleadoId, e.nombres as empleadoNombres, e.apellidos as empleadoApellidos,
        tv.nombre as tipoVehiculoNombre, tv.capacidad as tipoVehiculoCapacidad,
        seg.idSeguro, seg.proveedor as seguroProveedor, seg.numeroPoliza as seguroNumeroPoliza, seg.estado as seguroEstado,
        u.direccion as ciudadanoDireccion,
        mun.idMunicipio, mun.nombreMunicipio,
        prov.idProvincia, prov.nombreProvincia,
        uc.correo as ciudadanoCorreo,
        ue.correo as empleadoCorreo
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Persona c ON s.idPersona = c.idPersona
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      LEFT JOIN Seguro seg ON v.idSeguro = seg.idSeguro
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      LEFT JOIN Ubicacion u ON c.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio mun ON u.idMunicipio = mun.idMunicipio
      LEFT JOIN Provincia prov ON mun.idProvincia = prov.idProvincia
      LEFT JOIN Usuario uc ON c.idUsuario = uc.idUsuario
      LEFT JOIN Usuario ue ON e.idUsuario = ue.idUsuario
      WHERE s.idSolicitud = $1`,
      [idSolicitud]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Format the response to be more structured and organized
    const solicitud = result.rows[0];
    
    // Create a structured response with all the data
    const respuesta = {
      solicitud: {
        idSolicitud: solicitud.idsolicitud,
        fechaRegistro: solicitud.fecharegistro,
        fechaProcesada: solicitud.fechaprocesada,
        estadoDecision: solicitud.estadodecision,
        motivoRechazo: solicitud.motivorechazo,
        notaRevision: solicitud.notarevision,
        detalleRechazo: solicitud.detallerechazo,
        documentos: {
          cedula: solicitud.doccedula,
          licencia: solicitud.doclicencia,
          seguro: solicitud.docseguro,
          facturaVehiculo: solicitud.docfacturavehiculo
        }
      },
      vehiculo: {
        idVehiculo: solicitud.idvehiculo,
        chasis: solicitud.chasis,
        tipoUso: solicitud.tipouso,
        modelo: {
          idModelo: solicitud.idmodelo,
          nombre: solicitud.modelonombre,
          año: solicitud.año,
          color: solicitud.color,
          cilindraje: solicitud.cilindraje
        },
        marca: {
          idMarca: solicitud.idmarca,
          nombre: solicitud.marcanombre
        },
        tipoVehiculo: {
          idTipoVehiculo: solicitud.idtipovehiculo,
          nombre: solicitud.tipovehiculonombre,
          capacidad: solicitud.tipovehiculocapacidad
        }
      },
      matricula: {
        idMatricula: solicitud.idmatricula,
        matriculaGenerada: solicitud.matriculagenerada,
        estado: solicitud.estadomatricula,
        fechaEmision: solicitud.fechaemisionmatricula
      },
      ciudadano: {
        idPersona: solicitud.ciudadanoid,
        nombres: solicitud.ciudadanonombres,
        apellidos: solicitud.ciudadanoapellidos,
        cedula: solicitud.ciudadanocedula,
        fechaNacimiento: solicitud.ciudadanofechanacimiento,
        estadoCivil: solicitud.ciudadanoestadocivil,
        sexo: solicitud.ciudadanosexo,
        telefono: solicitud.ciudadanotelefono,
        correo: solicitud.ciudadanocorreo,
        ubicacion: solicitud.ciudadanoidubicacion ? {
          direccion: solicitud.ciudadanodireccion,
          municipio: {
            idMunicipio: solicitud.idmunicipio,
            nombre: solicitud.nombremunicipio
          },
          provincia: {
            idProvincia: solicitud.idprovincia,
            nombre: solicitud.nombreprovincia
          }
        } : null
      },
      empleado: solicitud.empleadoid ? {
        idPersona: solicitud.empleadoid,
        nombres: solicitud.empleadonombres,
        apellidos: solicitud.empleadoapellidos,
        correo: solicitud.empleadocorreo
      } : null
    };
    
    // Add insurance information only if it exists
    if (solicitud.idseguro) {
      respuesta.seguro = {
        idSeguro: solicitud.idseguro,
        proveedor: solicitud.seguroproveedor,
        numeroPoliza: solicitud.seguronumeropoliza,
        estado: solicitud.seguroestado
      };
    }
    
    return respuesta;
  } catch (error) {
    console.error('Error al obtener solicitud por ID:', error);
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
        v.chasis, v.tipoUso, v.idTipoVehiculo,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.idMarca, ma.nombre as marcaNombre,
        c.idPersona as ciudadanoId, c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos, 
        c.cedula as ciudadanoCedula, c.fechaNacimiento as ciudadanoFechaNacimiento, 
        c.estadoCivil as ciudadanoEstadoCivil, c.sexo as ciudadanoSexo, 
        c.telefono as ciudadanoTelefono, c.idUbicacion as ciudadanoIdUbicacion,
        mat.idMatricula, mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        e.idPersona as empleadoId, e.nombres as empleadoNombres, e.apellidos as empleadoApellidos,
        tv.nombre as tipoVehiculoNombre, tv.capacidad as tipoVehiculoCapacidad,
        seg.idSeguro, seg.proveedor as seguroProveedor, seg.numeroPoliza as seguroNumeroPoliza, seg.estado as seguroEstado,
        u.direccion as ciudadanoDireccion,
        mun.idMunicipio, mun.nombreMunicipio,
        prov.idProvincia, prov.nombreProvincia,
        uc.correo as ciudadanoCorreo,
        ue.correo as empleadoCorreo
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Persona c ON s.idPersona = c.idPersona
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      LEFT JOIN Seguro seg ON v.idSeguro = seg.idSeguro
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      LEFT JOIN Ubicacion u ON c.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio mun ON u.idMunicipio = mun.idMunicipio
      LEFT JOIN Provincia prov ON mun.idProvincia = prov.idProvincia
      LEFT JOIN Usuario uc ON c.idUsuario = uc.idUsuario
      LEFT JOIN Usuario ue ON e.idUsuario = ue.idUsuario
      WHERE s.idEmpleado = $1
      ORDER BY 
        CASE WHEN s.estadoDecision = 'Pendiente' THEN 0 ELSE 1 END,
        s.fechaRegistro ASC`,
      [idEmpleado]
    );
    
    // Transformar la respuesta para tener el mismo formato estructurado que obtenerSolicitudPorId
    const solicitudes = result.rows.map(solicitud => {
      const respuesta = {
        solicitud: {
          idSolicitud: solicitud.idsolicitud,
          fechaRegistro: solicitud.fecharegistro,
          fechaProcesada: solicitud.fechaprocesada,
          estadoDecision: solicitud.estadodecision,
          motivoRechazo: solicitud.motivorechazo,
          notaRevision: solicitud.notarevision,
          detalleRechazo: solicitud.detallerechazo,
          documentos: {
            cedula: solicitud.doccedula,
            licencia: solicitud.doclicencia,
            seguro: solicitud.docseguro,
            facturaVehiculo: solicitud.docfacturavehiculo
          }
        },
        vehiculo: {
          idVehiculo: solicitud.idvehiculo,
          chasis: solicitud.chasis,
          tipoUso: solicitud.tipouso,
          modelo: {
            idModelo: solicitud.idmodelo,
            nombre: solicitud.modelonombre,
            año: solicitud.año,
            color: solicitud.color,
            cilindraje: solicitud.cilindraje
          },
          marca: {
            idMarca: solicitud.idmarca,
            nombre: solicitud.marcanombre
          },
          tipoVehiculo: {
            idTipoVehiculo: solicitud.idtipovehiculo,
            nombre: solicitud.tipovehiculonombre,
            capacidad: solicitud.tipovehiculocapacidad
          }
        },
        matricula: {
          idMatricula: solicitud.idmatricula,
          matriculaGenerada: solicitud.matriculagenerada,
          estado: solicitud.estadomatricula,
          fechaEmision: solicitud.fechaemisionmatricula
        },
        ciudadano: {
          idPersona: solicitud.ciudadanoid,
          nombres: solicitud.ciudadanonombres,
          apellidos: solicitud.ciudadanoapellidos,
          cedula: solicitud.ciudadanocedula,
          fechaNacimiento: solicitud.ciudadanofechanacimiento,
          estadoCivil: solicitud.ciudadanoestadocivil,
          sexo: solicitud.ciudadanosexo,
          telefono: solicitud.ciudadanotelefono,
          correo: solicitud.ciudadanocorreo,
          ubicacion: solicitud.ciudadanoidubicacion ? {
            direccion: solicitud.ciudadanodireccion,
            municipio: {
              idMunicipio: solicitud.idmunicipio,
              nombre: solicitud.nombremunicipio
            },
            provincia: {
              idProvincia: solicitud.idprovincia,
              nombre: solicitud.nombreprovincia
            }
          } : null
        },
        empleado: solicitud.empleadoid ? {
          idPersona: solicitud.empleadoid,
          nombres: solicitud.empleadonombres,
          apellidos: solicitud.empleadoapellidos,
          correo: solicitud.empleadocorreo
        } : null
      };
      
      // Add insurance information only if it exists
      if (solicitud.idseguro) {
        respuesta.seguro = {
          idSeguro: solicitud.idseguro,
          proveedor: solicitud.seguroproveedor,
          numeroPoliza: solicitud.seguronumeropoliza,
          estado: solicitud.seguroestado
        };
      }
      
      return respuesta;
    });
    
    return solicitudes;
  } catch (error) {
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
    
    // Consulta paginada con todos los datos relacionados
    const query = `
      SELECT s.*, 
        v.chasis, v.tipoUso, v.idTipoVehiculo,
        m.idModelo, m.nombre as modeloNombre, m.año, m.color, m.cilindraje,
        ma.idMarca, ma.nombre as marcaNombre,
        c.idPersona as ciudadanoId, c.nombres as ciudadanoNombres, c.apellidos as ciudadanoApellidos, 
        c.cedula as ciudadanoCedula, c.fechaNacimiento as ciudadanoFechaNacimiento, 
        c.estadoCivil as ciudadanoEstadoCivil, c.sexo as ciudadanoSexo, 
        c.telefono as ciudadanoTelefono, c.idUbicacion as ciudadanoIdUbicacion,
        mat.idMatricula, mat.matriculaGenerada, mat.estado as estadoMatricula, mat.fechaEmisionMatricula,
        e.idPersona as empleadoId, e.nombres as empleadoNombres, e.apellidos as empleadoApellidos,
        tv.nombre as tipoVehiculoNombre, tv.capacidad as tipoVehiculoCapacidad,
        seg.idSeguro, seg.proveedor as seguroProveedor, seg.numeroPoliza as seguroNumeroPoliza, seg.estado as seguroEstado,
        u.direccion as ciudadanoDireccion,
        mun.idMunicipio, mun.nombreMunicipio,
        prov.idProvincia, prov.nombreProvincia,
        uc.correo as ciudadanoCorreo,
        ue.correo as empleadoCorreo
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo m ON v.idModelo = m.idModelo
      JOIN Marca ma ON m.idMarca = ma.idMarca
      JOIN Persona c ON s.idPersona = c.idPersona
      JOIN Matricula mat ON s.idMatricula = mat.idMatricula
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      LEFT JOIN Seguro seg ON v.idSeguro = seg.idSeguro
      LEFT JOIN Persona e ON s.idEmpleado = e.idPersona
      LEFT JOIN Ubicacion u ON c.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio mun ON u.idMunicipio = mun.idMunicipio
      LEFT JOIN Provincia prov ON mun.idProvincia = prov.idProvincia
      LEFT JOIN Usuario uc ON c.idUsuario = uc.idUsuario
      LEFT JOIN Usuario ue ON e.idUsuario = ue.idUsuario
      ${whereClause}
      ORDER BY s.fechaRegistro DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    queryParams.push(paginacion.limit, offset);
    
    const result = await client.query(query, queryParams);
    
    // Transformar la respuesta para tener el mismo formato estructurado que obtenerSolicitudPorId
    const solicitudes = result.rows.map(solicitud => {
      const respuesta = {
        solicitud: {
          idSolicitud: solicitud.idsolicitud,
          fechaRegistro: solicitud.fecharegistro,
          fechaProcesada: solicitud.fechaprocesada,
          estadoDecision: solicitud.estadodecision,
          motivoRechazo: solicitud.motivorechazo,
          notaRevision: solicitud.notarevision,
          detalleRechazo: solicitud.detallerechazo,
          documentos: {
            cedula: solicitud.doccedula,
            licencia: solicitud.doclicencia,
            seguro: solicitud.docseguro,
            facturaVehiculo: solicitud.docfacturavehiculo
          }
        },
        vehiculo: {
          idVehiculo: solicitud.idvehiculo,
          chasis: solicitud.chasis,
          tipoUso: solicitud.tipouso,
          modelo: {
            idModelo: solicitud.idmodelo,
            nombre: solicitud.modelonombre,
            año: solicitud.año,
            color: solicitud.color,
            cilindraje: solicitud.cilindraje
          },
          marca: {
            idMarca: solicitud.idmarca,
            nombre: solicitud.marcanombre
          },
          tipoVehiculo: {
            idTipoVehiculo: solicitud.idtipovehiculo,
            nombre: solicitud.tipovehiculonombre,
            capacidad: solicitud.tipovehiculocapacidad
          }
        },
        matricula: {
          idMatricula: solicitud.idmatricula,
          matriculaGenerada: solicitud.matriculagenerada,
          estado: solicitud.estadomatricula,
          fechaEmision: solicitud.fechaemisionmatricula
        },
        ciudadano: {
          idPersona: solicitud.ciudadanoid,
          nombres: solicitud.ciudadanonombres,
          apellidos: solicitud.ciudadanoapellidos,
          cedula: solicitud.ciudadanocedula,
          fechaNacimiento: solicitud.ciudadanofechanacimiento,
          estadoCivil: solicitud.ciudadanoestadocivil,
          sexo: solicitud.ciudadanosexo,
          telefono: solicitud.ciudadanotelefono,
          correo: solicitud.ciudadanocorreo,
          ubicacion: solicitud.ciudadanoidubicacion ? {
            direccion: solicitud.ciudadanodireccion,
            municipio: {
              idMunicipio: solicitud.idmunicipio,
              nombre: solicitud.nombremunicipio
            },
            provincia: {
              idProvincia: solicitud.idprovincia,
              nombre: solicitud.nombreprovincia
            }
          } : null
        },
        empleado: solicitud.empleadoid ? {
          idPersona: solicitud.empleadoid,
          nombres: solicitud.empleadonombres,
          apellidos: solicitud.empleadoapellidos,
          correo: solicitud.empleadocorreo
        } : null
      };
      
      // Add insurance information only if it exists
      if (solicitud.idseguro) {
        respuesta.seguro = {
          idSeguro: solicitud.idseguro,
          proveedor: solicitud.seguroproveedor,
          numeroPoliza: solicitud.seguronumeropoliza,
          estado: solicitud.seguroestado
        };
      }
      
      return respuesta;
    });
    
    return {
      total,
      solicitudes: solicitudes
    };
  } catch (error) {
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
    }
    
    // Obtener la solicitud actual
    const solicitudResult = await client.query(
      'SELECT * FROM Solicitud WHERE idSolicitud = $1 AND estadoDecision = $2',
      [idSolicitud, 'Pendiente']
    );
    
    if (solicitudResult.rows.length === 0) {
      return null; // No existe o no está pendiente
    }
    
    // Actualizar la solicitud
    await client.query(
      'UPDATE Solicitud SET idEmpleado = $1 WHERE idSolicitud = $2 AND estadoDecision = $3',
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
      return { 
        idSolicitud: idSolicitud,
        idVehiculo: solicitudResult.rows[0].idvehiculo,
        idEmpleado: idEmpleado,
        enCola: enCola
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
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
    
    // Verificar primero si el empleado existe
    const empleadoPersonaResult = await client.query(
      'SELECT * FROM Persona WHERE idPersona = $1',
      [idEmpleado]
    );
    
    if (empleadoPersonaResult.rows.length === 0) {
      throw new Error(`No se encontró la persona con ID ${idEmpleado}`);
    }
    
    // Verificar que la solicitud existe y está pendiente
    const solicitudResult = await client.query(
      'SELECT * FROM Solicitud WHERE idSolicitud = $1 AND estadoDecision = $2',
      [idSolicitud, 'Pendiente']
    );
    
    if (solicitudResult.rows.length === 0) {
      console.log(`No se encontró una solicitud pendiente con ID ${idSolicitud}`);
      return null; // No existe o no está pendiente
    }
    
    const solicitud = solicitudResult.rows[0];
    
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
      
      // Actualizar la solicitud
      await client.query(
        `UPDATE Solicitud 
         SET estadoDecision = $1, notaRevision = $2, fechaProcesada = CURRENT_TIMESTAMP
         WHERE idSolicitud = $3`,
        ['Aprobada', notaRevision, idSolicitud]
      );
      
    } else if (estadoDecision === 'Rechazada') {
      // Actualizar la matrícula a estado cancelada
      await client.query(
        'UPDATE Matricula SET estado = $1 WHERE idMatricula = $2',
        ['Cancelada', solicitud.idmatricula]
      );
      
      // Actualizar la solicitud
      await client.query(
        `UPDATE Solicitud 
         SET estadoDecision = $1, motivoRechazo = $2, detalleRechazo = $3, fechaProcesada = CURRENT_TIMESTAMP
         WHERE idSolicitud = $4`,
        ['Rechazada', motivoRechazo, detalleRechazo, idSolicitud]
      );
    }
    
    // Verificar si el empleado ahora tiene menos de 5 solicitudes pendientes
    // Usamos el empleado asociado a la solicitud, no el que la está procesando
    const idEmpleadoSolicitud = solicitud.idempleado;
    
    const solicitudesPendientesResult = await client.query(
      `SELECT COUNT(*) as total
       FROM Solicitud
       WHERE idEmpleado = $1 AND estadoDecision = 'Pendiente'`,
      [idEmpleadoSolicitud]
    );
    
    const totalSolicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total, 10);
    
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
      }
    }
    
    await client.query('COMMIT');
    
    try {
      // Devolver la solicitud actualizada
      const solicitudActualizada = await obtenerSolicitudPorId(idSolicitud);
      console.log(`Solicitud ${idSolicitud} procesada exitosamente como ${estadoDecision}`);
      return solicitudActualizada;
    } catch (error) {
      return {
        idSolicitud: idSolicitud,
        idVehiculo: solicitud.idvehiculo,
        estadoDecision: estadoDecision,
        mensaje: estadoDecision === 'Aprobada' 
          ? 'Solicitud aprobada exitosamente' 
          : 'Solicitud rechazada'
      };
    }
  } catch (error) {
    await client.query('ROLLBACK');
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
    // Error removed
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
    // Error removed
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Verificar y corregir la relación entre usuario y persona
 * Garantiza que un usuario esté relacionado con exactamente una persona y viceversa
 */
const verificarRelacionUsuarioPersona = async (client, idUsuario, idPersona) => {
  if (!idUsuario || !idPersona) {
    console.log('No se puede verificar relación sin IDs de usuario y persona');
    return false;
  }
  
  try {
    // 1. Verificar si el usuario ya está relacionado con otra persona
    const personasAsociadasResult = await client.query(
      'SELECT idPersona FROM Persona WHERE idUsuario = $1',
      [idUsuario]
    );
    
    // Si el usuario ya está relacionado con otras personas, actualizar esas relaciones
    if (personasAsociadasResult.rows.length > 0) {
      const personasAsociadas = personasAsociadasResult.rows.map(row => row.idpersona);
      
      // Si la persona actual ya está en la lista, no necesitamos hacer nada más
      if (personasAsociadas.includes(idPersona)) {
        console.log(`La relación entre usuario ${idUsuario} y persona ${idPersona} ya existe y es correcta`);
        return true;
      }
      
      // Eliminar relaciones existentes (excepto con la persona actual)
      for (const otraIdPersona of personasAsociadas) {
        if (otraIdPersona !== idPersona) {
          console.log(`Eliminando relación existente entre usuario ${idUsuario} y persona ${otraIdPersona}`);
          await client.query(
            'UPDATE Persona SET idUsuario = NULL WHERE idPersona = $1',
            [otraIdPersona]
          );
        }
      }
    }
    
    // 2. Verificar si la persona ya está relacionada con otro usuario
    const usuarioActualResult = await client.query(
      'SELECT idUsuario FROM Persona WHERE idPersona = $1',
      [idPersona]
    );
    
    const usuarioActual = usuarioActualResult.rows.length > 0 ? usuarioActualResult.rows[0].idusuario : null;
    
    // Si la persona ya está relacionada con otro usuario diferente, actualizar
    if (usuarioActual && usuarioActual !== idUsuario) {
      console.log(`Actualizando relación: persona ${idPersona} cambia de usuario ${usuarioActual} a ${idUsuario}`);
    }
    
    // 3. Establecer la relación correcta
    await client.query(
      'UPDATE Persona SET idUsuario = $1 WHERE idPersona = $2',
      [idUsuario, idPersona]
    );
    
    console.log(`Relación establecida correctamente: usuario ${idUsuario} -> persona ${idPersona}`);
    return true;
  } catch (error) {
    console.error('Error al verificar/corregir relación usuario-persona:', error);
    return false;
  }
};

/**
 * Verificar si un ciudadano ha alcanzado el límite de vehículos permitidos (2)
 * @param {number} idCiudadano - ID de la persona ciudadano
 * @returns {Promise<{alcanzadoLimite: boolean, cantidadVehiculos: number}>} - Resultado de la verificación
 */
const verificarLimiteVehiculosCiudadano = async (idCiudadano) => {
  const client = await pool.connect();
  try {
    // Consultar cuántos vehículos activos con matrícula generada tiene el ciudadano
    const result = await client.query(
      `SELECT COUNT(*) as total
       FROM Solicitud s
       JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
       JOIN Matricula m ON s.idMatricula = m.idMatricula
       WHERE s.idPersona = $1 
         AND s.estadoDecision = 'Aprobada'
         AND m.estado = 'Generada'
         AND v.estado = 'activo'`,
      [idCiudadano]
    );
    
    const cantidadVehiculos = parseInt(result.rows[0].total, 10);
    const limiteAlcanzado = cantidadVehiculos >= 2;
    
    console.log(`Ciudadano ID ${idCiudadano} tiene ${cantidadVehiculos} vehículos activos con matrícula generada`);
    console.log(`¿Ha alcanzado el límite de 2 vehículos?: ${limiteAlcanzado ? 'SÍ' : 'NO'}`);
    
    return {
      alcanzadoLimite: limiteAlcanzado,
      cantidadVehiculos
    };
  } catch (error) {
    console.error('Error al verificar límite de vehículos:', error);
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
  obtenerSolicitudesPorEmpleadoFiltradas,
  verificarRelacionUsuarioPersona,
  verificarLimiteVehiculosCiudadano
}; 
