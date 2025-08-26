const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');
const { crearYEmitirNotificacion } = require('../helpers/emitirNotificaciones');

// Notificar empleados asignados
async function notificarEmpleados(req, client, empleados_ids, mensaje) {
    for (const empleado_id of empleados_ids) {
        const usuariosRes = await client.query(
            'SELECT id FROM usuarios WHERE empleado_id = $1 AND estado = TRUE', [empleado_id]
        );
        for (const usuario of usuariosRes.rows) {
            await client.query(
                'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
                [usuario.id, mensaje]
            );
            await crearYEmitirNotificacion(req, usuario.id, { mensaje });
        }
    }
}

// Obtener historial de estados
async function getHistorialEstados(entidad, entidad_id) {
    const result = await pool.query(
        `SELECT * FROM historial_estado WHERE entidad = $1 AND entidad_id = $2 ORDER BY fecha DESC`,
        [entidad, entidad_id]
    );
    return result.rows;
}

// Listar todas las planificaciones con datos relacionados
const getAllPlanificaciones = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*, 
                TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada,
                s.descripcion AS solicitud_descripcion,
                s.codigo AS solicitud_codigo,
                s.estado AS solicitud_estado,
                tif.nombre AS tipo_inspeccion_nombre,
                -- Historial de estados
                (
                    SELECT COALESCE(json_agg(h), '[]'::json)
                    FROM historial_estado h
                    WHERE h.entidad = 'planificacion' AND h.entidad_id = p.id
                ) AS historial_estados
            FROM planificacion p
            INNER JOIN solicitud s ON p.solicitud_id = s.id
            LEFT JOIN tipo_inspeccion_fito tif ON p.tipo_inspeccion_fito_id = tif.id
            ORDER BY p.id DESC
        `);

        const planificaciones = result.rows;
        for (const planificacion of planificaciones) {
            const empleadosRes = await pool.query(`
                SELECT e.id, e.nombre, e.apellido, e.cedula, c.nombre AS cargo
                FROM planificacion_empleado pe
                JOIN empleados e ON pe.empleado_id = e.id
                LEFT JOIN cargo c ON e.cargo_id = c.id
                WHERE pe.planificacion_id = $1
            `, [planificacion.id]);
            planificacion.empleados = empleadosRes.rows;
        }

        res.json(planificaciones);
    } catch (error) {
        console.error('Error obteniendo planificaciones:', error);
        next(error);
    }
};

// Obtener una planificación por ID con datos relacionados
const getPlanificacion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                p.*, 
                TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada,
                s.descripcion AS solicitud_descripcion,
                s.estado AS solicitud_estado,
                tif.nombre AS tipo_inspeccion_nombre,
                (
                    SELECT COALESCE(json_agg(h), '[]'::json)
                    FROM historial_estado h
                    WHERE h.entidad = 'planificacion' AND h.entidad_id = p.id
                ) AS historial_estados
            FROM planificacion p
            INNER JOIN solicitud s ON p.solicitud_id = s.id
            LEFT JOIN tipo_inspeccion_fito tif ON p.tipo_inspeccion_fito_id = tif.id
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Planificación no encontrada' });
        }

        const planificacion = result.rows[0];

        const empleadosRes = await pool.query(`
            SELECT e.id, e.nombre, e.apellido, e.cedula, c.nombre AS cargo
            FROM planificacion_empleado pe
            JOIN empleados e ON pe.empleado_id = e.id
            LEFT JOIN cargo c ON e.cargo_id = c.id
            WHERE pe.planificacion_id = $1
        `, [planificacion.id]);
        planificacion.empleados = empleadosRes.rows;

        res.json(planificacion);
    } catch (error) {
        console.error('Error obteniendo la planificación:', error);
        next(error);
    }
};

// Crear una nueva planificación
const createPlanificacion = async (req, res, next) => {
    const {
        solicitud_id,
        fecha_programada,
        actividad,
        objetivo,
        hora,
        convocatoria,
        ubicacion,
        aseguramiento,
        tipo_inspeccion_fito_id,
        estado,
        empleados_ids
    } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const fechaProg = fecha_programada && fecha_programada !== '' ? fecha_programada : null;
        const solicitudRes = await client.query('SELECT codigo FROM solicitud WHERE id = $1', [solicitud_id]);
        const codigoSolicitud = solicitudRes.rows[0]?.codigo || solicitud_id;
        const result = await client.query(
            `INSERT INTO planificacion (
                solicitud_id, fecha_programada, actividad, objetivo, hora, convocatoria, ubicacion, aseguramiento,
                tipo_inspeccion_fito_id, estado
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [solicitud_id, fechaProg, actividad, objetivo, hora, convocatoria, ubicacion, aseguramiento, tipo_inspeccion_fito_id, estado || 'pendiente']
        );
        const planificacionId = result.rows[0].id;

        // Registrar empleados asociados y emitir notificaciones en tiempo real
        if (Array.isArray(empleados_ids)) {
            for (const empleado_id of empleados_ids) {
                await client.query(
                    `INSERT INTO planificacion_empleado (planificacion_id, empleado_id) VALUES ($1, $2)`,
                    [planificacionId, empleado_id]
                );
            }
            await notificarEmpleados(
                req,
                client,
                empleados_ids,
                `Has sido asignado a una nueva planificación para la solicitud con el código ${codigoSolicitud}`
            );
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Planificación',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la planificación para la solicitud ${solicitud_id}`,
            dato: { nuevos: result.rows[0] }
        });

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando planificación:', error);
        next(error);
    } finally {
        client.release();
    }
};

// Actualizar una planificación
const updatePlanificacion = async (req, res, next) => {
    const { id } = req.params;
    const {
        fecha_programada,
        actividad,
        objetivo,
        hora,
        convocatoria,
        ubicacion,
        aseguramiento,
        tipo_inspeccion_fito_id,
        estado,
        empleados_ids
    } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const fechaProg = fecha_programada && fecha_programada !== '' ? fecha_programada : null;
        const oldPlan = await client.query('SELECT * FROM planificacion WHERE id = $1', [id]);
        const solicitudRes = await client.query('SELECT codigo FROM solicitud WHERE id = $1', [oldPlan.rows[0].solicitud_id]);
        const codigoSolicitud = solicitudRes.rows[0]?.codigo || oldPlan.rows[0].solicitud_id;
        const result = await client.query(
            `UPDATE planificacion SET
                fecha_programada = $1,
                actividad = $2,
                objetivo = $3,
                hora = $4,
                convocatoria = $5,
                ubicacion = $6,
                aseguramiento = $7,
                tipo_inspeccion_fito_id = $8,
                estado = $9,
                updated_at = NOW()
            WHERE id = $10 RETURNING *`,
            [fechaProg, actividad, objetivo, hora, convocatoria, ubicacion, aseguramiento, tipo_inspeccion_fito_id, estado, id]
        );

        // Actualizar empleados asociados
        await client.query(`DELETE FROM planificacion_empleado WHERE planificacion_id = $1`, [id]);
        if (Array.isArray(empleados_ids)) {
            for (const empleado_id of empleados_ids) {
                await client.query(
                    `INSERT INTO planificacion_empleado (planificacion_id, empleado_id) VALUES ($1, $2)`,
                    [id, empleado_id]
                );
            }
            await notificarEmpleados(
                req,
                client,
                empleados_ids,
                `Has sido asignado a una planificación actualizada para la solicitud con el código ${codigoSolicitud}`
            );
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Planificación',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la planificación ${id}`,
            dato: { antiguos: oldPlan.rows[0], nuevos: result.rows[0] }
        });

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando planificación:', error);
        next(error);
    } finally {
        client.release();
    }
};

// Eliminar una planificación
const deletePlanificacion = async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const oldPlan = await client.query('SELECT * FROM planificacion WHERE id = $1', [id]);
        await client.query(`DELETE FROM planificacion_empleado WHERE planificacion_id = $1`, [id]);
        const result = await client.query('DELETE FROM planificacion WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Planificación no encontrada' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Planificación',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó la planificación ${id}`,
            dato: { antiguos: oldPlan.rows[0] }
        });
        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error eliminando planificación:', error);
        next(error);
    } finally {
        client.release();
    }
};

// Listar todos los empleados
const getAllEmpleados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre, apellido, cedula FROM empleados ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        next(error);
    }
};

module.exports = {
    getAllPlanificaciones,
    getPlanificacion,
    createPlanificacion,
    updatePlanificacion,
    deletePlanificacion,
    getAllEmpleados
};