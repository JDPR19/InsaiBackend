const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAllSolicitudes = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT s.*, 
            p.id AS planificacion_id, 
            TO_CHAR(s.fecha_solicitada, 'YYYY-MM-DD') AS fecha_solicitada, 
            TO_CHAR(s.fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion, 
            TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada, 
            p.estado AS estado_planificacion
            FROM solicitud s
            LEFT JOIN planificacion p ON p.solicitud_id = s.id
            ORDER BY s.created_at DESC
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo solicitudes:', error);
        next(error);
    }
};

const getSolicitud = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT s.*, 
            p.id AS planificacion_id, 
            TO_CHAR(s.fecha_solicitada, 'YYYY-MM-DD') AS fecha_solicitada, 
            TO_CHAR(s.fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion, 
            TO_CHAR(p.fecha_programada, 'YYYY-MM-DD') AS fecha_programada, 
            p.estado AS estado_planificacion
            FROM solicitud s
            LEFT JOIN planificacion p ON p.solicitud_id = s.id
            WHERE s.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo la solicitud:', error);
        next(error);
    }
};

const createSolicitud = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const {
            descripcion,
            fecha_solicitada,
            fecha_resolucion,
            tipo_solicitud_id,
            tipo_permiso_id,
            usuario_id,
            propiedad_id,
            fecha_programada 
        } = req.body;

        await client.query('BEGIN');

        const resultSolicitud = await client.query(
            `INSERT INTO solicitud 
            (descripcion, fecha_solicitada, fecha_resolucion, tipo_solicitud_id, tipo_permiso_id, usuario_id, propiedad_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [descripcion, fecha_solicitada, fecha_resolucion, tipo_solicitud_id, tipo_permiso_id, usuario_id, propiedad_id]
        );
        const solicitud = resultSolicitud.rows[0];

        //  Crear planificación asociada
        const resultPlan = await client.query(
            `INSERT INTO planificacion (solicitud_id, fecha_programada) VALUES ($1, $2) RETURNING *`,
            [solicitud.id, fecha_programada]
        );
        const planificacion = resultPlan.rows[0];

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la solicitud ${solicitud.id} y su planificación`,
            dato: { nuevos: { solicitud, planificacion } }
        });

        await client.query('COMMIT');
        return res.status(201).json({ solicitud, planificacion });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando solicitud:', error);
        next(error);
    } finally {
        client.release();
    }
};


const getAllPropiedades = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM propiedad ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getAllUsuarios = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getAllTipoSolicitudes = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_solicitud ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getAllTipoPermisos = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_permiso ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const updateSolicitud = async (req, res, next) => {
    const { id } = req.params;
    const {
        descripcion,
        fecha_solicitada,
        fecha_resolucion,
        tipo_solicitud_id,
        tipo_permiso_id,
        usuario_id,
        propiedad_id,
        fecha_programada // <-- asegúrate de recibirlo del frontend
    } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const oldSolicitud = await client.query('SELECT * FROM solicitud WHERE id = $1', [id]);

        const result = await client.query(
            `UPDATE solicitud SET
                descripcion = $1,
                fecha_solicitada = $2,
                fecha_resolucion = $3,
                tipo_solicitud_id = $4,
                tipo_permiso_id = $5,
                usuario_id = $6,
                propiedad_id = $7,
                updated_at = NOW()
            WHERE id = $8 RETURNING *`,
            [descripcion, fecha_solicitada, fecha_resolucion, tipo_solicitud_id, tipo_permiso_id, usuario_id, propiedad_id, id]
        );

        await client.query(
            `UPDATE planificacion SET fecha_programada = $1 WHERE solicitud_id = $2`,
            [fecha_programada, id]
        );

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la solicitud ${id}`,
            dato: { antiguos: oldSolicitud.rows[0], nuevos: result.rows[0] }
        });

        await client.query('COMMIT');
        return res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando solicitud:', error);
        next(error);
    } finally {
        client.release();
    }
};

const deleteSolicitud = async (req, res, next) => {
    const { id } = req.params;
    try {
        const oldSolicitud = await pool.query('SELECT * FROM solicitud WHERE id = $1', [id]);
        const result = await pool.query('DELETE FROM solicitud WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó la solicitud ${id}`,
            dato: { antiguos: oldSolicitud.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando solicitud:', error);
        next(error);
    }
};

module.exports = {
    getAllSolicitudes,
    getAllPropiedades,
    getAllTipoPermisos,
    getAllUsuarios,
    getAllTipoSolicitudes,
    getSolicitud,
    createSolicitud,
    updateSolicitud,
    deleteSolicitud
};