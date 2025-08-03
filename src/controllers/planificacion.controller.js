const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// Función para registrar notificaciones a empleados
async function registrarNotificacionesEmpleados(client, empleados_ids, mensaje) {
    for (const empleado_id of empleados_ids) {
        // Busca TODOS los usuarios activos relacionados al empleado
        const usuariosRes = await client.query(
            'SELECT id FROM usuarios WHERE empleado_id = $1 AND estado = TRUE', [empleado_id]
        );
        for (const usuario of usuariosRes.rows) {
            await client.query(
                'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
                [usuario.id, mensaje]
            );
        }
    }
}


const getAllPlanificaciones = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.*, 
                TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada,
                s.descripcion AS solicitud_descripcion,
                s.estado AS solicitud_estado
            FROM planificacion p
            INNER JOIN solicitud s ON p.solicitud_id = s.id
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

// Obtener una planificación por ID con empleados asociados
const getPlanificacion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                p.*, 
                TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada,
                s.descripcion AS solicitud_descripcion,
                s.estado AS solicitud_estado
            FROM planificacion p
            INNER JOIN solicitud s ON p.solicitud_id = s.id
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

// Crear planificación y sus empleados asociados
const createPlanificacion = async (req, res, next) => {
    const { solicitud_id, fecha_programada, estado, empleados_ids } = req.body;
    const client = await pool.connect();
    try {
        const fechaProg = fecha_programada && fecha_programada !== '' ? fecha_programada : null;
        await client.query('BEGIN');
        const result = await client.query(
            `INSERT INTO planificacion (solicitud_id, fecha_programada, estado, nombre)
            VALUES ($1, $2, $3, $4) RETURNING *`,
            [solicitud_id, fechaProg, estado || 'pendiente', req.body.nombre || null]
        );
        const planificacionId = result.rows[0].id;

        // Registrar empleados asociados
        if (Array.isArray(empleados_ids)) {
            for (const empleado_id of empleados_ids) {
                await client.query(
                    `INSERT INTO planificacion_empleado (planificacion_id, empleado_id) VALUES ($1, $2)`,
                    [planificacionId, empleado_id]
                );
            }
            // Registrar notificaciones
            await registrarNotificacionesEmpleados(
                client,
                empleados_ids,
                `Has sido asignado a una nueva planificación para la solicitud #${solicitud_id}`
            );
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'planificacion',
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

// Actualizar planificación y sus empleados asociados
const updatePlanificacion = async (req, res, next) => {
    const { id } = req.params;
    const { fecha_programada, estado, empleados_ids } = req.body;
    const client = await pool.connect();
    try {
        const fechaProg = fecha_programada && fecha_programada !== '' ? fecha_programada : null;
        await client.query('BEGIN');
        const oldPlan = await client.query('SELECT * FROM planificacion WHERE id = $1', [id]);
        const result = await client.query(
            `UPDATE planificacion SET fecha_programada = $1, estado = $2, nombre = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
            [fechaProg, estado, req.body.nombre || null, id]
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
            // Registrar notificaciones
            await registrarNotificacionesEmpleados(
                client,
                empleados_ids,
                `Has sido asignado a una planificación actualizada para la solicitud #${oldPlan.rows[0].solicitud_id}`
            );
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'planificacion',
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

// Eliminar planificación y sus empleados asociados
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
            tabla: 'planificacion',
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

// Obtener todos los empleados (para select en frontend)
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