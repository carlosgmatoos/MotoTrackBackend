const { pool } = require('../db');

const getSystemStatistics = async (filtros = {}) => {
  const client = await pool.connect();
  try {
    // Resultado final que se devolverá
    const resultado = {};
    
    // Construir condiciones para filtrado
    let condicionesMatriculas = [];
    let condicionesSolicitudes = [];
    let condicionesVehiculos = [];
    let params = [];
    let paramIndex = 1;
    
    // Filtros de fechas
    if (filtros.fechaDesde) {
      condicionesMatriculas.push(`fechaEmisionMatricula >= $${paramIndex}`);
      condicionesSolicitudes.push(`fechaRegistro >= $${paramIndex}`);
      params.push(filtros.fechaDesde);
      paramIndex++;
    }
    
    if (filtros.fechaHasta) {
      condicionesMatriculas.push(`fechaEmisionMatricula <= $${paramIndex}`);
      condicionesSolicitudes.push(`fechaRegistro <= $${paramIndex}`);
      params.push(filtros.fechaHasta);
      paramIndex++;
    }
    
    // Filtros de ubicación
    if (filtros.idProvincia) {
      condicionesVehiculos.push(`pr.idProvincia = $${paramIndex}`);
      params.push(filtros.idProvincia);
      paramIndex++;
    }
    
    if (filtros.idMunicipio) {
      condicionesVehiculos.push(`m.idMunicipio = $${paramIndex}`);
      params.push(filtros.idMunicipio);
      paramIndex++;
    }
    
    // Filtros de marca y tipo
    if (filtros.idMarca) {
      condicionesVehiculos.push(`ma.idMarca = $${paramIndex}`);
      params.push(filtros.idMarca);
      paramIndex++;
    }
    
    if (filtros.idTipoVehiculo) {
      condicionesVehiculos.push(`tv.idTipoVehiculo = $${paramIndex}`);
      params.push(filtros.idTipoVehiculo);
      paramIndex++;
    }
    
    // Construir WHERE para cada consulta
    const whereMatriculas = condicionesMatriculas.length > 0 ? `WHERE ${condicionesMatriculas.join(' AND ')}` : '';
    const whereSolicitudes = condicionesSolicitudes.length > 0 ? `WHERE ${condicionesSolicitudes.join(' AND ')}` : '';
    const whereVehiculos = condicionesVehiculos.length > 0 ? `WHERE ${condicionesVehiculos.join(' AND ')}` : '';
    
    // Obtener estadísticas según la vista solicitada o todas si es 'completo'
    if (filtros.vista === 'completo' || filtros.vista === 'matriculas') {
      // Total de matrículas en el sistema
      const totalMatriculasQuery = `
        SELECT COUNT(*) as total 
        FROM Matricula 
        ${whereMatriculas}
      `;
      const totalMatriculasResult = await client.query(totalMatriculasQuery, params.slice(0, condicionesMatriculas.length));
      const totalMatriculas = parseInt(totalMatriculasResult.rows[0].total);

      // Matrículas generadas (estado Generada)
      const matriculasGeneradasParams = [...params.slice(0, condicionesMatriculas.length), 'Generada'];
      const matriculasGeneradasQuery = `
        SELECT COUNT(*) as total 
        FROM Matricula 
        ${whereMatriculas ? whereMatriculas + ' AND' : 'WHERE'} estado = $${condicionesMatriculas.length + 1}
      `;
      const matriculasGeneradasResult = await client.query(matriculasGeneradasQuery, matriculasGeneradasParams);
      const matriculasGeneradas = parseInt(matriculasGeneradasResult.rows[0].total);

      resultado.matriculas = {
        total: totalMatriculas,
        generadas: matriculasGeneradas
      };
    }
    
    if (filtros.vista === 'completo' || filtros.vista === 'solicitudes') {
      // Estadísticas de solicitudes (totales por estado)
      const solicitudesEstadisticasQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE estadoDecision = 'Pendiente') as pendientes,
          COUNT(*) FILTER (WHERE estadoDecision = 'Aprobada') as aprobadas,
          COUNT(*) FILTER (WHERE estadoDecision = 'Rechazada') as rechazadas,
          COUNT(*) as total
        FROM Solicitud
        ${whereSolicitudes}
      `;
      const solicitudesEstadisticasResult = await client.query(solicitudesEstadisticasQuery, params.slice(0, condicionesSolicitudes.length));
      
      const solicitudesPendientes = parseInt(solicitudesEstadisticasResult.rows[0].pendientes);
      const solicitudesAprobadas = parseInt(solicitudesEstadisticasResult.rows[0].aprobadas);
      const solicitudesRechazadas = parseInt(solicitudesEstadisticasResult.rows[0].rechazadas);
      const solicitudesTotal = parseInt(solicitudesEstadisticasResult.rows[0].total);
      
      // Tasa de aprobación (solicitudes aprobadas / total de aprobadas y rechazadas)
      const totalDecididas = solicitudesAprobadas + solicitudesRechazadas;
      const tasaAprobacion = totalDecididas > 0 ? (solicitudesAprobadas / totalDecididas * 100).toFixed(2) : 0;

      resultado.solicitudes = {
        total: solicitudesTotal,
        pendientes: solicitudesPendientes,
        aprobadas: solicitudesAprobadas,
        rechazadas: solicitudesRechazadas,
        tasaAprobacion
      };
    }
    
    if (filtros.vista === 'completo' || filtros.vista === 'empleados') {
      // Estadísticas de usuarios y empleados
      const usuariosEstadisticasQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE tu.nombre = 'Administrador') as administradores,
          COUNT(*) FILTER (WHERE tu.nombre = 'Empleado') as empleados,
          COUNT(*) FILTER (WHERE tu.nombre = 'Empleado' AND u.estado = 'activo') as empleadosActivos,
          COUNT(*) FILTER (WHERE tu.nombre = 'Empleado' AND 
                          EXTRACT(MONTH FROM u.fechaCreacion) = EXTRACT(MONTH FROM CURRENT_DATE) AND
                          EXTRACT(YEAR FROM u.fechaCreacion) = EXTRACT(YEAR FROM CURRENT_DATE)) as nuevosEmpleadosMes
        FROM Usuario u
        JOIN TipoUsuario tu ON u.idTipoUsuario = tu.idTipoUsuario
      `;
      const usuariosEstadisticasResult = await client.query(usuariosEstadisticasQuery);
      
      const totalAdministradores = parseInt(usuariosEstadisticasResult.rows[0].administradores);
      const totalEmpleados = parseInt(usuariosEstadisticasResult.rows[0].empleados);
      const empleadosActivos = parseInt(usuariosEstadisticasResult.rows[0].empleadosactivos);
      const nuevosEmpleadosMes = parseInt(usuariosEstadisticasResult.rows[0].nuevosempleadosmes);

      resultado.usuarios = {
        administradores: totalAdministradores,
        empleados: {
          total: totalEmpleados,
          activos: empleadosActivos,
          nuevosEsteMes: nuevosEmpleadosMes
        }
      };
    }
    
    if (filtros.vista === 'completo' || filtros.vista === 'distribucion') {
      // Distribución por marca
      const distribucionMarcaQuery = `
        SELECT 
          m.nombre as marca, 
          COUNT(*) as cantidad,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vehiculo v 
                                    JOIN Modelo md ON v.idModelo = md.idModelo 
                                    JOIN Marca m ON md.idMarca = m.idMarca
                                    ${whereVehiculos ? 'LEFT JOIN Persona p ON v.idPropietario = p.idPersona' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Municipio mu ON u.idMunicipio = mu.idMunicipio' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Provincia pr ON mu.idProvincia = pr.idProvincia' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo' : ''}
                                    ${whereVehiculos})), 2) as porcentaje
        FROM Vehiculo v
        JOIN Modelo md ON v.idModelo = md.idModelo
        JOIN Marca m ON md.idMarca = m.idMarca
        ${whereVehiculos ? 'LEFT JOIN Persona p ON v.idPropietario = p.idPersona' : ''}
        ${whereVehiculos ? 'LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion' : ''}
        ${whereVehiculos ? 'LEFT JOIN Municipio mu ON u.idMunicipio = mu.idMunicipio' : ''}
        ${whereVehiculos ? 'LEFT JOIN Provincia pr ON mu.idProvincia = pr.idProvincia' : ''}
        ${whereVehiculos ? 'LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo' : ''}
        ${whereVehiculos}
        GROUP BY m.nombre
        ORDER BY cantidad DESC
      `;
      const distribucionMarcaResult = await client.query(distribucionMarcaQuery, params.slice(0, condicionesVehiculos.length));
      const distribucionMarca = distribucionMarcaResult.rows;

      // Distribución por tipo de vehículo
      const distribucionTipoQuery = `
        SELECT 
          tv.nombre as tipo, 
          COUNT(*) as cantidad,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vehiculo v
                                    JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
                                    ${whereVehiculos ? 'LEFT JOIN Persona p ON v.idPropietario = p.idPersona' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Municipio mu ON u.idMunicipio = mu.idMunicipio' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Provincia pr ON mu.idProvincia = pr.idProvincia' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Modelo md ON v.idModelo = md.idModelo' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Marca ma ON md.idMarca = ma.idMarca' : ''}
                                    ${whereVehiculos})), 2) as porcentaje
        FROM Vehiculo v
        JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
        ${whereVehiculos ? 'LEFT JOIN Persona p ON v.idPropietario = p.idPersona' : ''}
        ${whereVehiculos ? 'LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion' : ''}
        ${whereVehiculos ? 'LEFT JOIN Municipio mu ON u.idMunicipio = mu.idMunicipio' : ''}
        ${whereVehiculos ? 'LEFT JOIN Provincia pr ON mu.idProvincia = pr.idProvincia' : ''}
        ${whereVehiculos ? 'LEFT JOIN Modelo md ON v.idModelo = md.idModelo' : ''}
        ${whereVehiculos ? 'LEFT JOIN Marca ma ON md.idMarca = ma.idMarca' : ''}
        ${whereVehiculos}
        GROUP BY tv.nombre
        ORDER BY cantidad DESC
      `;
      const distribucionTipoResult = await client.query(distribucionTipoQuery, params.slice(0, condicionesVehiculos.length));
      const distribucionTipo = distribucionTipoResult.rows;

      // Distribución por municipio
      const distribucionMunicipioQuery = `
        SELECT 
          m.nombreMunicipio as municipio, 
          COUNT(*) as cantidad,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vehiculo v 
                                    JOIN Persona p ON v.idPropietario = p.idPersona 
                                    JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion 
                                    JOIN Municipio m ON u.idMunicipio = m.idMunicipio
                                    ${whereVehiculos ? 'LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Modelo md ON v.idModelo = md.idModelo' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Marca ma ON md.idMarca = ma.idMarca' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo' : ''}
                                    ${whereVehiculos})), 2) as porcentaje
        FROM Vehiculo v
        JOIN Persona p ON v.idPropietario = p.idPersona
        JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
        JOIN Municipio m ON u.idMunicipio = m.idMunicipio
        ${whereVehiculos ? 'LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia' : ''}
        ${whereVehiculos ? 'LEFT JOIN Modelo md ON v.idModelo = md.idModelo' : ''}
        ${whereVehiculos ? 'LEFT JOIN Marca ma ON md.idMarca = ma.idMarca' : ''}
        ${whereVehiculos ? 'LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo' : ''}
        ${whereVehiculos}
        GROUP BY m.nombreMunicipio
        ORDER BY cantidad DESC
      `;
      const distribucionMunicipioResult = await client.query(distribucionMunicipioQuery, params.slice(0, condicionesVehiculos.length));
      const distribucionMunicipio = distribucionMunicipioResult.rows;

      resultado.distribucion = {
        marca: distribucionMarca,
        tipo: distribucionTipo,
        municipio: distribucionMunicipio
      };
    }
    
    if (filtros.vista === 'completo' || filtros.vista === 'tendencias') {
      // Tendencias de solicitudes por períodos
      let periodoQuery = '';
      let periodoLabel = '';

      switch (filtros.periodo) {
        case 'semana':
          periodoQuery = `
            SELECT 
              to_char(date_trunc('week', fechaRegistro), 'YYYY-MM-DD') as periodo,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE estadoDecision = 'Pendiente') as pendientes,
              COUNT(*) FILTER (WHERE estadoDecision = 'Aprobada') as aprobadas,
              COUNT(*) FILTER (WHERE estadoDecision = 'Rechazada') as rechazadas
            FROM Solicitud
            WHERE fechaRegistro >= date_trunc('week', CURRENT_DATE - INTERVAL '12 weeks')
            GROUP BY date_trunc('week', fechaRegistro)
            ORDER BY date_trunc('week', fechaRegistro)
          `;
          periodoLabel = 'Semana del';
          break;
        case 'trimestre':
          periodoQuery = `
            SELECT 
              EXTRACT(YEAR FROM fechaRegistro) || '-Q' || EXTRACT(QUARTER FROM fechaRegistro) as periodo,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE estadoDecision = 'Pendiente') as pendientes,
              COUNT(*) FILTER (WHERE estadoDecision = 'Aprobada') as aprobadas,
              COUNT(*) FILTER (WHERE estadoDecision = 'Rechazada') as rechazadas
            FROM Solicitud
            WHERE fechaRegistro >= date_trunc('quarter', CURRENT_DATE - INTERVAL '4 quarters')
            GROUP BY EXTRACT(YEAR FROM fechaRegistro), EXTRACT(QUARTER FROM fechaRegistro)
            ORDER BY EXTRACT(YEAR FROM fechaRegistro), EXTRACT(QUARTER FROM fechaRegistro)
          `;
          periodoLabel = 'Trimestre';
          break;
        case 'año':
          periodoQuery = `
            SELECT 
              EXTRACT(YEAR FROM fechaRegistro) as periodo,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE estadoDecision = 'Pendiente') as pendientes,
              COUNT(*) FILTER (WHERE estadoDecision = 'Aprobada') as aprobadas,
              COUNT(*) FILTER (WHERE estadoDecision = 'Rechazada') as rechazadas
            FROM Solicitud
            WHERE fechaRegistro >= date_trunc('year', CURRENT_DATE - INTERVAL '5 years')
            GROUP BY EXTRACT(YEAR FROM fechaRegistro)
            ORDER BY EXTRACT(YEAR FROM fechaRegistro)
          `;
          periodoLabel = 'Año';
          break;
        case 'mes':
        default:
          periodoQuery = `
            SELECT 
              to_char(date_trunc('month', fechaRegistro), 'YYYY-MM') as periodo,
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE estadoDecision = 'Pendiente') as pendientes,
              COUNT(*) FILTER (WHERE estadoDecision = 'Aprobada') as aprobadas,
              COUNT(*) FILTER (WHERE estadoDecision = 'Rechazada') as rechazadas
            FROM Solicitud
            WHERE fechaRegistro >= date_trunc('month', CURRENT_DATE - INTERVAL '12 months')
            GROUP BY date_trunc('month', fechaRegistro)
            ORDER BY date_trunc('month', fechaRegistro)
          `;
          periodoLabel = 'Mes';
      }

      const tendenciasResult = await client.query(periodoQuery);
      const tendencias = tendenciasResult.rows.map(row => ({
        ...row,
        pendientes: parseInt(row.pendientes),
        aprobadas: parseInt(row.aprobadas),
        rechazadas: parseInt(row.rechazadas),
        total: parseInt(row.total)
      }));

      resultado.tendencias = {
        periodoLabel,
        datos: tendencias
      };
    }

    return resultado;
  } catch (error) {
    console.error('Error al obtener estadísticas del sistema:', error);
    throw error;
  } finally {
    client.release();
  }
};

const getCiudadanoStatistics = async (idPersona) => {
  if (!idPersona) {
    throw new Error('ID de persona es requerido');
  }

  const client = await pool.connect();
  try {
    // Total de motocicletas activas del ciudadano
    const motocicletasActivasQuery = `
      SELECT COUNT(*) as total
      FROM Vehiculo v
      JOIN Matricula m ON v.idMatricula = m.idMatricula
      WHERE v.idPropietario = $1
      AND v.estado = 'activo'
    `;
    const motocicletasActivasResult = await client.query(motocicletasActivasQuery, [idPersona]);
    const motocicletasActivas = parseInt(motocicletasActivasResult.rows[0].total);

    // Total de solicitudes pendientes del ciudadano
    const solicitudesPendientesQuery = `
      SELECT COUNT(*) as total
      FROM Solicitud
      WHERE idPersona = $1
      AND estadoDecision = 'Pendiente'
    `;
    const solicitudesPendientesResult = await client.query(solicitudesPendientesQuery, [idPersona]);
    const solicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total);

    // Total de solicitudes aprobadas del ciudadano
    const solicitudesAprobadasQuery = `
      SELECT COUNT(*) as total
      FROM Solicitud
      WHERE idPersona = $1
      AND estadoDecision = 'Aprobada'
    `;
    const solicitudesAprobadasResult = await client.query(solicitudesAprobadasQuery, [idPersona]);
    const solicitudesAprobadas = parseInt(solicitudesAprobadasResult.rows[0].total);

    // Total de matrículas generadas del ciudadano
    const matriculasGeneradasQuery = `
      SELECT COUNT(*) as total
      FROM Vehiculo v
      JOIN Matricula m ON v.idMatricula = m.idMatricula
      WHERE v.idPropietario = $1
      AND m.estado = 'Generada'
    `;
    const matriculasGeneradasResult = await client.query(matriculasGeneradasQuery, [idPersona]);
    const matriculasGeneradas = parseInt(matriculasGeneradasResult.rows[0].total);

    return {
      motocicletas: {
        activas: motocicletasActivas
      },
      solicitudes: {
        pendientes: solicitudesPendientes,
        aprobadas: solicitudesAprobadas,
        total: solicitudesPendientes + solicitudesAprobadas
      },
      matriculas: {
        generadas: matriculasGeneradas
      }
    };
  } catch (error) {
    console.error('Error al obtener estadísticas del ciudadano:', error);
    throw error;
  } finally {
    client.release();
  }
};

const getEmpleadoStatistics = async (idEmpleado, filtros = {}) => {
  const client = await pool.connect();
  try {
    // Resultado final que se devolverá
    const resultado = {};
    
    // Construir condiciones para filtrado
    let condicionesSolicitudes = [];
    let condicionesVehiculos = [];
    let params = [idEmpleado]; // El primer parámetro es siempre idEmpleado
    let paramIndex = 2; // Comenzamos con el índice 2 ya que el 1 es idEmpleado
    
    // Filtros de fechas
    if (filtros.fechaDesde) {
      condicionesSolicitudes.push(`fechaProcesada >= $${paramIndex}`);
      params.push(filtros.fechaDesde);
      paramIndex++;
    }
    
    if (filtros.fechaHasta) {
      condicionesSolicitudes.push(`fechaProcesada <= $${paramIndex}`);
      params.push(filtros.fechaHasta);
      paramIndex++;
    }
    
    // Filtros de ubicación
    if (filtros.idProvincia) {
      condicionesVehiculos.push(`pr.idProvincia = $${paramIndex}`);
      params.push(filtros.idProvincia);
      paramIndex++;
    }
    
    if (filtros.idMunicipio) {
      condicionesVehiculos.push(`m.idMunicipio = $${paramIndex}`);
      params.push(filtros.idMunicipio);
      paramIndex++;
    }
    
    // Filtros de marca y tipo
    if (filtros.idMarca) {
      condicionesVehiculos.push(`ma.idMarca = $${paramIndex}`);
      params.push(filtros.idMarca);
      paramIndex++;
    }
    
    // Filtrar por tipo de vehículo
    if (filtros.idTipoVehiculo) {
      condicionesVehiculos.push(`tv.idTipoVehiculo = $${paramIndex}`);
      params.push(filtros.idTipoVehiculo);
      paramIndex++;
    }
    
    // 1. Total de solicitudes pendientes asignadas al empleado
    let solicitudesPendientesQuery = `
      SELECT COUNT(*) as total
      FROM Solicitud
      WHERE idEmpleado = $1 AND estadoDecision = 'Pendiente'
    `;
    
    // Aplicar filtros adicionales a la consulta
    if (condicionesVehiculos.length > 0) {
      solicitudesPendientesQuery = `
        SELECT COUNT(*) as total
        FROM Solicitud s
        JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
        JOIN Modelo md ON v.idModelo = md.idModelo
        JOIN Marca ma ON md.idMarca = ma.idMarca
        JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
        JOIN Persona p ON v.idPropietario = p.idPersona
        LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
        LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
        LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
        WHERE s.idEmpleado = $1 
        AND s.estadoDecision = 'Pendiente'
        ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.join(' AND ') : ''}
      `;
    }
    
    const solicitudesPendientesResult = await client.query(solicitudesPendientesQuery, 
      condicionesVehiculos.length > 0 ? params : [idEmpleado]);
    const solicitudesPendientes = parseInt(solicitudesPendientesResult.rows[0].total);
    
    // 2. Total de solicitudes procesadas hoy por el empleado
    let hoyQuery = `
      SELECT COUNT(*) as total
      FROM Solicitud
      WHERE idEmpleado = $1 
        AND estadoDecision IN ('Aprobada', 'Rechazada')
        AND DATE(fechaProcesada) = CURRENT_DATE
    `;
    
    // Aplicar filtros adicionales a la consulta
    if (condicionesVehiculos.length > 0) {
      hoyQuery = `
        SELECT COUNT(*) as total
        FROM Solicitud s
        JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
        JOIN Modelo md ON v.idModelo = md.idModelo
        JOIN Marca ma ON md.idMarca = ma.idMarca
        JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
        JOIN Persona p ON v.idPropietario = p.idPersona
        LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
        LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
        LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
        WHERE s.idEmpleado = $1 
        AND s.estadoDecision IN ('Aprobada', 'Rechazada')
        AND DATE(s.fechaProcesada) = CURRENT_DATE
        ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.join(' AND ') : ''}
      `;
    }
    
    const hoyResult = await client.query(hoyQuery, 
      condicionesVehiculos.length > 0 ? params : [idEmpleado]);
    const solicitudesProcesadasHoy = parseInt(hoyResult.rows[0].total);
    
    // Construir la consulta base para las estadísticas históricas con filtros
    const baseStatsQuery = `
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo md ON v.idModelo = md.idModelo
      JOIN Marca ma ON md.idMarca = ma.idMarca
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      JOIN Persona p ON v.idPropietario = p.idPersona
      LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
      WHERE s.idEmpleado = $1
      ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.join(' AND ') : ''}
      ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.join(' AND ') : ''}
    `;
    
    // 3. Total de solicitudes aprobadas por el empleado (histórico)
    const aprobadasQuery = `
      SELECT COUNT(*) as total
      ${baseStatsQuery}
      AND s.estadoDecision = 'Aprobada'
    `;
    const aprobadasResult = await client.query(aprobadasQuery, params);
    const solicitudesAprobadas = parseInt(aprobadasResult.rows[0].total);
    
    // 4. Total de solicitudes rechazadas por el empleado (histórico)
    const rechazadasQuery = `
      SELECT COUNT(*) as total
      ${baseStatsQuery}
      AND s.estadoDecision = 'Rechazada'
    `;
    const rechazadasResult = await client.query(rechazadasQuery, params);
    const solicitudesRechazadas = parseInt(rechazadasResult.rows[0].total);
    
    // 5. Calcular tasa de aprobación (solicitudes aprobadas / total de aprobadas y rechazadas)
    const totalDecididas = solicitudesAprobadas + solicitudesRechazadas;
    const tasaAprobacion = totalDecididas > 0 ? (solicitudesAprobadas / totalDecididas * 100).toFixed(2) : 0;
    
    // Construir el objeto de resultado
    resultado.solicitudes = {
      pendientes: solicitudesPendientes,
      procesadasHoy: solicitudesProcesadasHoy,
      aprobadas: solicitudesAprobadas,
      rechazadas: solicitudesRechazadas,
      totalProcesadas: totalDecididas,
      tasaAprobacion: parseFloat(tasaAprobacion)
    };
    
    // 6. Tendencias de solicitudes por período (semana, mes, trimestre, año)
    const periodo = filtros.periodo || 'mes';
    let periodoQuery = '';
    let periodoLabel = '';
    let tendenciasBaseQuery = '';
    
    // Construir la base de la consulta para tendencias con filtros
    tendenciasBaseQuery = `
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo md ON v.idModelo = md.idModelo
      JOIN Marca ma ON md.idMarca = ma.idMarca
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      JOIN Persona p ON v.idPropietario = p.idPersona
      LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
      WHERE s.idEmpleado = $1
      AND s.fechaProcesada IS NOT NULL
      ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.join(' AND ') : ''}
    `;

    switch (periodo) {
      case 'semana':
        periodoQuery = `
          SELECT 
            to_char(date_trunc('week', s.fechaProcesada), 'YYYY-MM-DD') as periodo,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
          ${tendenciasBaseQuery}
          AND s.fechaProcesada >= date_trunc('week', CURRENT_DATE - INTERVAL '12 weeks')
          GROUP BY date_trunc('week', s.fechaProcesada)
          ORDER BY date_trunc('week', s.fechaProcesada)
        `;
        periodoLabel = 'Semana del';
        break;
      case 'trimestre':
        periodoQuery = `
          SELECT 
            EXTRACT(YEAR FROM s.fechaProcesada) || '-Q' || EXTRACT(QUARTER FROM s.fechaProcesada) as periodo,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
          ${tendenciasBaseQuery}
          AND s.fechaProcesada >= date_trunc('quarter', CURRENT_DATE - INTERVAL '4 quarters')
          GROUP BY EXTRACT(YEAR FROM s.fechaProcesada), EXTRACT(QUARTER FROM s.fechaProcesada)
          ORDER BY EXTRACT(YEAR FROM s.fechaProcesada), EXTRACT(QUARTER FROM s.fechaProcesada)
        `;
        periodoLabel = 'Trimestre';
        break;
      case 'año':
        periodoQuery = `
          SELECT 
            EXTRACT(YEAR FROM s.fechaProcesada)::text as periodo,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
          ${tendenciasBaseQuery}
          AND s.fechaProcesada >= date_trunc('year', CURRENT_DATE - INTERVAL '5 years')
          GROUP BY EXTRACT(YEAR FROM s.fechaProcesada)
          ORDER BY EXTRACT(YEAR FROM s.fechaProcesada)
        `;
        periodoLabel = 'Año';
        break;
      case 'mes':
      default:
        periodoQuery = `
          SELECT 
            to_char(date_trunc('month', s.fechaProcesada), 'YYYY-MM') as periodo,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
            COUNT(*) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
          ${tendenciasBaseQuery}
          AND s.fechaProcesada >= date_trunc('month', CURRENT_DATE - INTERVAL '12 months')
          GROUP BY date_trunc('month', s.fechaProcesada)
          ORDER BY date_trunc('month', s.fechaProcesada)
        `;
        periodoLabel = 'Mes';
    }

    const tendenciasResult = await client.query(periodoQuery, params);
    const tendencias = tendenciasResult.rows.map(row => ({
      ...row,
      aprobadas: parseInt(row.aprobadas),
      rechazadas: parseInt(row.rechazadas),
      total: parseInt(row.total)
    }));

    resultado.tendencias = {
      periodoLabel,
      datos: tendencias
    };
    
    // Construir la consulta base para las distribuciones con filtros
    const distribucionBaseQuery = `
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Modelo md ON v.idModelo = md.idModelo
      JOIN Marca ma ON md.idMarca = ma.idMarca
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      JOIN Persona p ON v.idPropietario = p.idPersona
      LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
      LEFT JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      LEFT JOIN Provincia pr ON m.idProvincia = pr.idProvincia
      WHERE s.idEmpleado = $1
      AND s.estadoDecision IN ('Aprobada', 'Rechazada')
      ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.join(' AND ') : ''}
      ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.join(' AND ') : ''}
    `;
    
    // 7. Distribución por marca de los vehículos procesados
    const distribucionMarcaQuery = `
      SELECT 
        ma.nombre as marca, 
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) ${distribucionBaseQuery})), 2) as porcentaje
      ${distribucionBaseQuery}
      GROUP BY ma.nombre
      ORDER BY cantidad DESC
    `;
    const distribucionMarcaResult = await client.query(distribucionMarcaQuery, params);
    const distribucionMarca = distribucionMarcaResult.rows;

    // 8. Distribución por tipo de vehículo procesado
    const distribucionTipoQuery = `
      SELECT 
        tv.nombre as tipo, 
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) ${distribucionBaseQuery})), 2) as porcentaje
      ${distribucionBaseQuery}
      GROUP BY tv.nombre
      ORDER BY cantidad DESC
    `;
    const distribucionTipoResult = await client.query(distribucionTipoQuery, params);
    const distribucionTipo = distribucionTipoResult.rows;

    // 9. Distribución por municipio para Santo Domingo
    let municipioCondicion = condicionesVehiculos.slice();
    if (!filtros.idProvincia) {
      municipioCondicion.push("(pr.nombreProvincia LIKE '%Santo Domingo%' OR pr.nombreProvincia = 'Distrito Nacional')");
    }
    
    const distribucionMunicipioQuery = `
      SELECT 
        m.nombreMunicipio as municipio, 
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) 
                                  FROM Solicitud s
                                  JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
                                  JOIN Persona p ON v.idPropietario = p.idPersona
                                  JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
                                  JOIN Municipio m ON u.idMunicipio = m.idMunicipio
                                  JOIN Provincia pr ON m.idProvincia = pr.idProvincia
                                  JOIN Modelo md ON v.idModelo = md.idModelo
                                  JOIN Marca ma ON md.idMarca = ma.idMarca
                                  JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
                                  WHERE s.idEmpleado = $1
                                  AND s.estadoDecision IN ('Aprobada', 'Rechazada')
                                  ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.join(' AND ') : ''}
                                  ${municipioCondicion.length > 0 ? 'AND ' + municipioCondicion.join(' AND ') : ''})), 2) as porcentaje
      FROM Solicitud s
      JOIN Vehiculo v ON s.idVehiculo = v.idVehiculo
      JOIN Persona p ON v.idPropietario = p.idPersona
      JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion
      JOIN Municipio m ON u.idMunicipio = m.idMunicipio
      JOIN Provincia pr ON m.idProvincia = pr.idProvincia
      JOIN Modelo md ON v.idModelo = md.idModelo
      JOIN Marca ma ON md.idMarca = ma.idMarca
      JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo
      WHERE s.idEmpleado = $1
      AND s.estadoDecision IN ('Aprobada', 'Rechazada')
      ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.join(' AND ') : ''}
      ${municipioCondicion.length > 0 ? 'AND ' + municipioCondicion.join(' AND ') : ''}
      GROUP BY m.nombreMunicipio
      ORDER BY cantidad DESC
    `;
    
    const municipioParams = [...params];
    // Si se usó idProvincia no agregamos el filtro de Santo Domingo
    const distribucionMunicipioResult = await client.query(distribucionMunicipioQuery, municipioParams);
    const distribucionMunicipio = distribucionMunicipioResult.rows;

    resultado.distribucion = {
      marca: distribucionMarca,
      tipo: distribucionTipo,
      municipio: distribucionMunicipio
    };
    
    // Si se especificaron filtros, incluir los filtros aplicados en la respuesta
    if (Object.keys(filtros).length > 0) {
      resultado.filtrosAplicados = { ...filtros };
    }
    
    return resultado;
  } catch (error) {
    console.error('Error al obtener estadísticas del empleado:', error);
    throw new Error('Error al obtener estadísticas del empleado');
  } finally {
    client.release();
  }
};

module.exports = {
  getSystemStatistics,
  getCiudadanoStatistics,
  getEmpleadoStatistics
}; 