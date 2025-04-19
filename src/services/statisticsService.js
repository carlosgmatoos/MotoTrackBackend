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

      // Distribución por tipo de vehículo - CAMBIAR a tipo de uso (tipoUso)
      const distribucionTipoQuery = `
        SELECT 
          v.tipoUso as tipo, 
          COUNT(*) as cantidad,
          ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Vehiculo v
                                    ${whereVehiculos ? 'LEFT JOIN Persona p ON v.idPropietario = p.idPersona' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Municipio mu ON u.idMunicipio = mu.idMunicipio' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Provincia pr ON mu.idProvincia = pr.idProvincia' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Modelo md ON v.idModelo = md.idModelo' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN Marca ma ON md.idMarca = ma.idMarca' : ''}
                                    ${whereVehiculos ? 'LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo' : ''}
                                    ${whereVehiculos})), 2) as porcentaje
        FROM Vehiculo v
        ${whereVehiculos ? 'LEFT JOIN Persona p ON v.idPropietario = p.idPersona' : ''}
        ${whereVehiculos ? 'LEFT JOIN Ubicacion u ON p.idUbicacion = u.idUbicacion' : ''}
        ${whereVehiculos ? 'LEFT JOIN Municipio mu ON u.idMunicipio = mu.idMunicipio' : ''}
        ${whereVehiculos ? 'LEFT JOIN Provincia pr ON mu.idProvincia = pr.idProvincia' : ''}
        ${whereVehiculos ? 'LEFT JOIN Modelo md ON v.idModelo = md.idModelo' : ''}
        ${whereVehiculos ? 'LEFT JOIN Marca ma ON md.idMarca = ma.idMarca' : ''}
        ${whereVehiculos ? 'LEFT JOIN TipoVehiculo tv ON v.idTipoVehiculo = tv.idTipoVehiculo' : ''}
        ${whereVehiculos}
        GROUP BY v.tipoUso
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
        marca: distribucionMarca.map(item => ({
          marca: item.marca,
          cantidad: item.cantidad.toString(),
          porcentaje: item.porcentaje.toString()
        })),
        tipo: distribucionTipo.map(item => ({
          tipo: item.tipo,
          cantidad: item.cantidad.toString(),
          porcentaje: item.porcentaje.toString()
        })),
        municipio: distribucionMunicipio.map(item => ({
          municipio: item.municipio,
          cantidad: item.cantidad.toString(),
          porcentaje: item.porcentaje.toString()
        }))
      };
    }
    
    if (filtros.vista === 'completo' || filtros.vista === 'tendencias') {
      // Tendencias de solicitudes por períodos
      let periodoQuery = '';
      let periodoLabel = '';
      // Año seleccionado para tendencias o el año actual si no se proporciona
      const yearFilter = filtros.año ? parseInt(filtros.año) : new Date().getFullYear();
      // Fecha límite para mostrar datos (hasta la fecha actual, nunca datos del futuro)
      const fechaLimite = new Date() < new Date(yearFilter + 1, 0, 1) ? 
                         'CURRENT_DATE' : 
                         `'${yearFilter}-12-31'::date`;

      // Crear condición de fecha según el año seleccionado
      const inicioAñoSeleccionado = `'${yearFilter}-01-01'::date`;
      const fechaCondition = `fechaRegistro >= ${inicioAñoSeleccionado} AND fechaRegistro <= ${fechaLimite}`;
      
      // Variables para generar series de fechas completas
      let serieFechasSQL = '';

      switch (filtros.periodo) {
        case 'semana':
          // Generar serie para los 7 días de la semana actual
          serieFechasSQL = `
            WITH fechas AS (
              SELECT generate_series(
                date_trunc('week', CURRENT_DATE), 
                date_trunc('week', CURRENT_DATE) + interval '6 days', 
                '1 day'::interval
              )::date as fecha
            ),
            stats AS (
              SELECT 
                fecha::date as periodo,
                COUNT(s.idSolicitud) as total,
                COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Pendiente') as pendientes,
                COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
                COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
              FROM fechas f
              LEFT JOIN Solicitud s ON 
                DATE(s.fechaRegistro) = f.fecha AND
                s.fechaRegistro <= ${fechaLimite}
                ${whereSolicitudes ? 'AND ' + condicionesSolicitudes.join(' AND ') : ''}
              GROUP BY periodo
              ORDER BY periodo
            )
            SELECT 
              to_char(periodo, 'YYYY-MM-DD') as periodo,
              total,
              pendientes,
              aprobadas,
              rechazadas
            FROM stats
          `;
          periodoQuery = serieFechasSQL;
          periodoLabel = 'Día';
          break;
        case 'mes':
          // Para mes, mostrar las 4 semanas del mes actual
          serieFechasSQL = `
            WITH semanas AS (
              SELECT 
                generate_series(0, 3) as num_semana
            ),
            stats AS (
              SELECT 
                s.num_semana,
                COUNT(sol.idSolicitud) as total,
                COUNT(sol.idSolicitud) FILTER (WHERE sol.estadoDecision = 'Pendiente') as pendientes,
                COUNT(sol.idSolicitud) FILTER (WHERE sol.estadoDecision = 'Aprobada') as aprobadas,
                COUNT(sol.idSolicitud) FILTER (WHERE sol.estadoDecision = 'Rechazada') as rechazadas
              FROM semanas s
              LEFT JOIN Solicitud sol ON 
                EXTRACT(WEEK FROM sol.fechaRegistro) - EXTRACT(WEEK FROM date_trunc('month', sol.fechaRegistro)) = s.num_semana AND
                EXTRACT(MONTH FROM sol.fechaRegistro) = EXTRACT(MONTH FROM CURRENT_DATE) AND
                EXTRACT(YEAR FROM sol.fechaRegistro) = ${yearFilter} AND
                sol.fechaRegistro <= ${fechaLimite}
                ${whereSolicitudes ? 'AND ' + condicionesSolicitudes.map(c => c.replace(/^\w+/, 'sol.$&')).join(' AND ') : ''}
              GROUP BY s.num_semana
              ORDER BY s.num_semana
            )
            SELECT 
              'Semana ' || (num_semana + 1) as periodo,
              total,
              pendientes,
              aprobadas,
              rechazadas
            FROM stats
          `;
          periodoQuery = serieFechasSQL;
          periodoLabel = 'Semana';
          break;
        case 'año':
        default:
          // Para meses, generamos todos los meses del año seleccionado
          serieFechasSQL = `
            WITH meses AS (
              SELECT 
                generate_series(1, 12) as num_mes
            ),
            stats AS (
              SELECT 
                m.num_mes,
                COUNT(s.idSolicitud) as total,
                COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Pendiente') as pendientes,
                COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
                COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
              FROM meses m
              LEFT JOIN Solicitud s ON 
                EXTRACT(MONTH FROM s.fechaRegistro) = m.num_mes AND
                EXTRACT(YEAR FROM s.fechaRegistro) = ${yearFilter} AND
                s.fechaRegistro <= ${fechaLimite}
                ${whereSolicitudes ? 'AND ' + condicionesSolicitudes.map(c => c.replace(/^\w+/, 's.$&')).join(' AND ') : ''}
              GROUP BY m.num_mes
              ORDER BY m.num_mes
            )
            SELECT 
              to_char(make_date(${yearFilter}, num_mes, 1), 'Mon') as periodo,
              total,
              pendientes,
              aprobadas,
              rechazadas
            FROM stats
          `;
          periodoQuery = serieFechasSQL;
          periodoLabel = 'Mes';
      }

      // Añadir parámetros adicionales para la consulta si es necesario
      let tendenciaParams = [];

      const tendenciasResult = await client.query(periodoQuery, tendenciaParams);
      const tendencias = tendenciasResult.rows.map(row => ({
        ...row,
        pendientes: parseInt(row.pendientes || 0),
        aprobadas: parseInt(row.aprobadas || 0),
        rechazadas: parseInt(row.rechazadas || 0),
        total: parseInt(row.total || 0)
      }));

      resultado.tendencias = {
        periodoLabel,
        año: yearFilter,
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
    
    // Año seleccionado para tendencias o el año actual si no se proporciona
    const yearFilter = filtros.año ? parseInt(filtros.año) : new Date().getFullYear();
    // Fecha límite para mostrar datos (hasta la fecha actual, nunca datos del futuro)
    const fechaLimite = new Date() < new Date(yearFilter + 1, 0, 1) ? 
                      'CURRENT_DATE' : 
                      `'${yearFilter}-12-31'::date`;

    // Crear condición de fecha según el año seleccionado
    const inicioAñoSeleccionado = `'${yearFilter}-01-01'::date`;
    const fechaCondition = `s.fechaProcesada >= ${inicioAñoSeleccionado} AND s.fechaProcesada <= ${fechaLimite}`;
    
    // Variables para generar series de fechas completas
    let serieFechasSQL = '';
    
    // Parámetros a reutilizar en las consultas
    const empleadoParam = params[0]; // idEmpleado siempre es el primer parámetro

    switch (periodo) {
      case 'semana':
        // Generar serie para los 7 días de la semana actual
        serieFechasSQL = `
          WITH fechas AS (
            SELECT generate_series(
              date_trunc('week', CURRENT_DATE), 
              date_trunc('week', CURRENT_DATE) + interval '6 days', 
              '1 day'::interval
            )::date as fecha
          ),
          stats AS (
            SELECT 
              fecha::date as periodo,
              COUNT(s.idSolicitud) as total,
              COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
              COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
            FROM fechas f
            LEFT JOIN Solicitud s ON 
              DATE(s.fechaProcesada) = f.fecha AND
              s.idEmpleado = $1 AND
              s.fechaProcesada IS NOT NULL AND
              s.fechaProcesada <= ${fechaLimite}
              ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.map(c => c.replace(/^\w+/, 's.$&')).join(' AND ') : ''}
              ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.map(c => c.replace(/^\w+/, 's.$&')).join(' AND ') : ''}
            GROUP BY periodo
            ORDER BY periodo
          )
          SELECT 
            to_char(periodo, 'YYYY-MM-DD') as periodo,
            total,
            aprobadas,
            rechazadas
          FROM stats
        `;
        periodoQuery = serieFechasSQL;
        periodoLabel = 'Día';
        break;
      case 'mes':
        // Para mes, mostrar las 4 semanas del mes actual
        serieFechasSQL = `
          WITH semanas AS (
            SELECT 
              generate_series(0, 3) as num_semana
          ),
          stats AS (
            SELECT 
              s.num_semana,
              COUNT(sol.idSolicitud) as total,
              COUNT(sol.idSolicitud) FILTER (WHERE sol.estadoDecision = 'Aprobada') as aprobadas,
              COUNT(sol.idSolicitud) FILTER (WHERE sol.estadoDecision = 'Rechazada') as rechazadas
            FROM semanas s
            LEFT JOIN Solicitud sol ON 
              EXTRACT(WEEK FROM sol.fechaProcesada) - EXTRACT(WEEK FROM date_trunc('month', sol.fechaProcesada)) = s.num_semana AND
              EXTRACT(MONTH FROM sol.fechaProcesada) = EXTRACT(MONTH FROM CURRENT_DATE) AND
              EXTRACT(YEAR FROM sol.fechaProcesada) = ${yearFilter} AND
              sol.idEmpleado = $1 AND
              sol.fechaProcesada IS NOT NULL AND
              sol.fechaProcesada <= ${fechaLimite}
              ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.map(c => c.replace(/^\w+/, 'sol.$&')).join(' AND ') : ''}
              ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.map(c => c.replace(/^\w+/, 'sol.$&')).join(' AND ') : ''}
            GROUP BY s.num_semana
            ORDER BY s.num_semana
          )
          SELECT 
            'Semana ' || (num_semana + 1) as periodo,
            total,
            aprobadas,
            rechazadas
          FROM stats
        `;
        periodoQuery = serieFechasSQL;
        periodoLabel = 'Semana';
        break;
      case 'año':
      default:
        // Para meses, generamos todos los meses del año seleccionado
        serieFechasSQL = `
          WITH meses AS (
            SELECT 
              generate_series(1, 12) as num_mes
          ),
          stats AS (
            SELECT 
              m.num_mes,
              COUNT(s.idSolicitud) as total,
              COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Aprobada') as aprobadas,
              COUNT(s.idSolicitud) FILTER (WHERE s.estadoDecision = 'Rechazada') as rechazadas
            FROM meses m
            LEFT JOIN Solicitud s ON 
              EXTRACT(MONTH FROM s.fechaProcesada) = m.num_mes AND
              EXTRACT(YEAR FROM s.fechaProcesada) = ${yearFilter} AND
              s.idEmpleado = $1 AND
              s.fechaProcesada <= ${fechaLimite} AND
              s.fechaProcesada IS NOT NULL
              ${condicionesVehiculos.length > 0 ? 'AND ' + condicionesVehiculos.map(c => c.replace(/^\w+/, 's.$&')).join(' AND ') : ''}
              ${condicionesSolicitudes.length > 0 ? 'AND ' + condicionesSolicitudes.map(c => c.replace(/^\w+/, 's.$&')).join(' AND ') : ''}
            GROUP BY m.num_mes
            ORDER BY m.num_mes
          )
          SELECT 
            to_char(make_date(${yearFilter}, num_mes, 1), 'Mon') as periodo,
            total,
            aprobadas,
            rechazadas
          FROM stats
        `;
        periodoQuery = serieFechasSQL;
        periodoLabel = 'Mes';
    }

    // Para estas consultas generadas solo necesitamos el idEmpleado como parámetro
    const tendenciasParams = [empleadoParam]; 
    
    const tendenciasResult = await client.query(periodoQuery, tendenciasParams);
    const tendencias = tendenciasResult.rows.map(row => ({
      ...row,
      aprobadas: parseInt(row.aprobadas || 0),
      rechazadas: parseInt(row.rechazadas || 0),
      total: parseInt(row.total || 0)
    }));

    resultado.tendencias = {
      periodoLabel,
      año: yearFilter,
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
        v.tipoUso as tipo, 
        COUNT(*) as cantidad,
        ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) ${distribucionBaseQuery})), 2) as porcentaje
      ${distribucionBaseQuery}
      GROUP BY v.tipoUso
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
      marca: distribucionMarca.map(item => ({
        marca: item.marca,
        cantidad: item.cantidad.toString(),
        porcentaje: item.porcentaje.toString()
      })),
      tipo: distribucionTipo.map(item => ({
        tipo: item.tipo,
        cantidad: item.cantidad.toString(),
        porcentaje: item.porcentaje.toString()
      })),
      municipio: distribucionMunicipio.map(item => ({
        municipio: item.municipio,
        cantidad: item.cantidad.toString(),
        porcentaje: item.porcentaje.toString()
      }))
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