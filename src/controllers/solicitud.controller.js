const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAllSolicitudes = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.*, 
                TO_CHAR(s.fecha_solicitada, 'YYYY-MM-DD') AS fecha_solicitada,
                TO_CHAR(s.fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion,
                ts.nombre AS tipo_solicitud_nombre,
                u.username AS usuario_username,
                p.nombre AS propiedad_nombre
            FROM solicitud s
            LEFT JOIN tipo_solicitud ts ON s.tipo_solicitud_id = ts.id
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            LEFT JOIN propiedad p ON s.propiedad_id = p.id
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
            SELECT 
                s.*, 
                TO_CHAR(s.fecha_solicitada, 'YYYY-MM-DD') AS fecha_solicitada,
                TO_CHAR(s.fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion,
                ts.nombre AS tipo_solicitud_nombre,
                u.username AS usuario_username,
                p.nombre AS propiedad_nombre
            FROM solicitud s
            LEFT JOIN tipo_solicitud ts ON s.tipo_solicitud_id = ts.id
            LEFT JOIN usuarios u ON s.usuario_id = u.id
            LEFT JOIN propiedad p ON s.propiedad_id = p.id
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
        const {
            descripcion,
            fecha_solicitada,
            fecha_resolucion,
            estado,
            tipo_solicitud_id,
            usuario_id,
            propiedad_id
        } = req.body;
    try {

        const fecha_solicitada = req.body.fecha_solicitada && req.body.fecha_solicitada !== '' ? req.body.fecha_solicitada : null;
        const fecha_resolucion = req.body.fecha_resolucion && req.body.fecha_resolucion !== '' ? req.body.fecha_resolucion : null;

        const result = await pool.query(
            `INSERT INTO solicitud 
            (descripcion, fecha_solicitada, fecha_resolucion, estado, tipo_solicitud_id, usuario_id, propiedad_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [descripcion, fecha_solicitada, fecha_resolucion, estado || 'creada', tipo_solicitud_id, usuario_id, propiedad_id]
        );
        const solicitud = result.rows[0];

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la solicitud ${solicitud.id}`,
            dato: { nuevos: solicitud }
        });

        return res.status(201).json(solicitud);
    } catch (error) {
        console.error('Error creando solicitud:', error);
        next(error);
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


const updateSolicitud = async (req, res, next) => {
    const { id } = req.params;
    const {
        descripcion,
        fecha_solicitada,
        fecha_resolucion,
        estado,
        tipo_solicitud_id,
        usuario_id,
        propiedad_id
    } = req.body;
    try {
        
        const fechaSolicitada = fecha_solicitada && fecha_solicitada !== '' ? fecha_solicitada : null;
        const fechaResolucion = fecha_resolucion && fecha_resolucion !== '' ? fecha_resolucion : null;

        const oldSolicitud = await pool.query('SELECT * FROM solicitud WHERE id = $1', [id]);

        const result = await pool.query(
            `UPDATE solicitud SET
                descripcion = $1,
                fecha_solicitada = $2,
                fecha_resolucion = $3,
                estado = $4,
                tipo_solicitud_id = $5,
                usuario_id = $6,
                propiedad_id = $7,
                updated_at = NOW()
            WHERE id = $8 RETURNING *`,
            [descripcion, fechaSolicitada, fechaResolucion, estado, tipo_solicitud_id, usuario_id, propiedad_id, id]
        );

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la solicitud ${id}`,
            dato: { antiguos: oldSolicitud.rows[0], nuevos: result.rows[0] }
        });

        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando solicitud:', error);
        next(error);
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
    getAllUsuarios,
    getAllTipoSolicitudes,
    getSolicitud,
    createSolicitud,
    updateSolicitud,
    deleteSolicitud
};