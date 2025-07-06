const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAllPlanificaciones = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id,
                p.estado,
                TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada, 
                s.descripcion AS solicitud_descripcion,
                pr.rif AS propiedad_rif,
                pr.nombre AS solicitud_propiedad,
                pr.ubicación AS ubicacion_propiedad,
                pr.hectareas AS hectareas_propiedad,
                u.username AS usuario_username,
                e.nombre AS empleado_nombre,
                c.nombre AS cargo_nombre
            FROM planificacion p
            INNER JOIN solicitud s ON p.solicitud_id = s.id
            INNER JOIN propiedad pr ON s.propiedad_id = pr.id
            INNER JOIN usuarios u ON s.usuario_id = u.id
            INNER JOIN empleados e ON u.empleado_id = e.id
            INNER JOIN cargo c ON e.cargo_id = c.id
            ORDER BY p.id DESC;
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo planificaciones:', error);
        next(error);
    }
};


const getPlanificacion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                p.id,
                p.estado,
                TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada, 
                s.descripcion AS solicitud_descripcion,
                pr.rif AS propiedad_rif,
                pr.nombre AS solicitud_propiedad,
                pr.ubicación AS ubicacion_propiedad,
                pr.hectareas AS hectareas_propiedad,
                u.username AS usuario_username,
                e.nombre AS empleado_nombre,
                c.nombre AS cargo_nombre
            FROM planificacion p
            INNER JOIN solicitud s ON p.solicitud_id = s.id
            INNER JOIN propiedad pr ON s.propiedad_id = pr.id
            INNER JOIN usuarios u ON s.usuario_id = u.id
            INNER JOIN empleados e ON u.empleado_id = e.id
            INNER JOIN cargo c ON e.cargo_id = c.id
            WHERE p.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Planificación no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo la planificación:', error);
        next(error);
    }
};


const createPlanificacion = async (req, res, next) => {
    const { solicitud_id, fecha_programada, estado } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO planificacion (solicitud_id, fecha_programada, estado)
             VALUES ($1, $2, $3) RETURNING *`,
            [solicitud_id, fecha_programada, estado || 'pendiente']
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'planificacion',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la planificación para la solicitud ${solicitud_id}`,
            dato: { nuevos: result.rows[0] }
        });
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando planificación:', error);
        next(error);
    }
};


const updatePlanificacion = async (req, res, next) => {
    const { id } = req.params;
    const { fecha_programada, estado } = req.body;
    try {
        const oldPlan = await pool.query('SELECT * FROM planificacion WHERE id = $1', [id]);
        const result = await pool.query(
            `UPDATE planificacion SET fecha_programada = $1, estado = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
            [fecha_programada, estado, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Planificación no encontrada' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'planificacion',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la planificación ${id}`,
            dato: { antiguos: oldPlan.rows[0], nuevos: result.rows[0] }
        });
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando planificación:', error);
        next(error);
    }
};


const deletePlanificacion = async (req, res, next) => {
    const { id } = req.params;
    try {
        const oldPlan = await pool.query('SELECT * FROM planificacion WHERE id = $1', [id]);
        const result = await pool.query('DELETE FROM planificacion WHERE id = $1', [id]);
        if (result.rowCount === 0) {
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
        res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando planificación:', error);
        next(error);
    }
};

module.exports = {
    getAllPlanificaciones,
    getPlanificacion,
    createPlanificacion,
    updatePlanificacion,
    deletePlanificacion
};