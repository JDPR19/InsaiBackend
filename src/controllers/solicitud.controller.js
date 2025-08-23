const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');
const { crearYEmitirNotificacion } = require('../helpers/emitirNotificaciones');

// Utilidad para obtener historial de estados
async function getHistorialEstados(entidad, entidad_id) {
    const result = await pool.query(
        `SELECT * FROM historial_estado WHERE entidad = $1 AND entidad_id = $2 ORDER BY fecha DESC`,
        [entidad, entidad_id]
    );
    return result.rows;
}

// Utilidad para emitir notificación a usuario
async function notificarUsuario(req, usuario_id, mensaje) {
    await pool.query(
        'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2)',
        [usuario_id, mensaje]
    );
    await crearYEmitirNotificacion(req, usuario_id, { mensaje });
}

// Listar todas las solicitudes con datos relacionados y historial
const getAllSolicitudes = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.*, 
                TO_CHAR(s.fecha_solicitada, 'YYYY-MM-DD') AS fecha_solicitada,
                TO_CHAR(s.fecha_resolucion, 'YYYY-MM-DD') AS fecha_resolucion,
                ts.nombre AS tipo_solicitud_nombre,
                u.username AS usuario_username,
                p.nombre AS propiedad_nombre,
                p.rif AS propiedad_rif,
                p.hectareas AS propiedad_hectareas,
                p.ubicación AS propiedad_ubicacion,
                p.posee_certificado,
                -- Planificación asociada
                (
                    SELECT json_build_object(
                        'id', pl.id,
                        'fecha_programada', TO_CHAR(pl.fecha_programada, 'YYYY-MM-DD'),
                        'estado', pl.estado,
                        'tipo_inspeccion', tif.nombre
                    )
                    FROM planificacion pl
                    LEFT JOIN tipo_inspeccion_fito tif ON pl.tipo_inspeccion_fito_id = tif.id
                    WHERE pl.solicitud_id = s.id
                ) AS planificacion,
                -- Historial de estados
                (
                    SELECT COALESCE(json_agg(h), '[]'::json)
                    FROM historial_estado h
                    WHERE h.entidad = 'solicitud' AND h.entidad_id = s.id
                ) AS historial_estados
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

// Obtener una solicitud por ID con todos los datos relacionados
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
                p.nombre AS propiedad_nombre,
                p.rif AS propiedad_rif,
                p.hectareas AS propiedad_hectareas,
                p.ubicación AS propiedad_ubicacion,
                p.posee_certificado,
                -- Planificación asociada
                (
                    SELECT json_build_object(
                        'id', pl.id,
                        'fecha_programada', TO_CHAR(pl.fecha_programada, 'YYYY-MM-DD'),
                        'estado', pl.estado,
                        'tipo_inspeccion', tif.nombre
                    )
                    FROM planificacion pl
                    LEFT JOIN tipo_inspeccion_fito tif ON pl.tipo_inspeccion_fito_id = tif.id
                    WHERE pl.solicitud_id = s.id
                ) AS planificacion,
                -- Historial de estados
                (
                    SELECT COALESCE(json_agg(h), '[]'::json)
                    FROM historial_estado h
                    WHERE h.entidad = 'solicitud' AND h.entidad_id = s.id
                ) AS historial_estados
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

// Crear una nueva solicitud
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
        const fechaSolicitada = fecha_solicitada && fecha_solicitada !== '' ? fecha_solicitada : null;
        const fechaResolucion = fecha_resolucion && fecha_resolucion !== '' ? fecha_resolucion : null;

        const result = await pool.query(
            `INSERT INTO solicitud 
            (descripcion, fecha_solicitada, fecha_resolucion, estado, tipo_solicitud_id, usuario_id, propiedad_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [descripcion, fechaSolicitada, fechaResolucion, estado || 'creada', tipo_solicitud_id, usuario_id, propiedad_id]
        );
        const solicitud = result.rows[0];

        // Notificar al usuario creador
        await notificarUsuario(req, usuario_id, `Se ha registrado tu solicitud #${solicitud.codigo || solicitud.id}`);

        // Registrar en bitácora
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la solicitud ${solicitud.codigo || solicitud.id}`,
            dato: { nuevos: solicitud }
        });

        return res.status(201).json(solicitud);
    } catch (error) {
        console.error('Error creando solicitud:', error);
        next(error);
    }
};

// Actualizar una solicitud
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

        const oldSolicitudRes = await pool.query('SELECT * FROM solicitud WHERE id = $1', [id]);
        const oldSolicitud = oldSolicitudRes.rows[0];

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
        const solicitud = result.rows[0];

        // Notificar al usuario si el estado cambió
        if (oldSolicitud && solicitud && oldSolicitud.estado !== solicitud.estado) {
            await notificarUsuario(req, solicitud.usuario_id, `El estado de tu solicitud #${solicitud.codigo || solicitud.id} cambió a "${solicitud.estado}"`);
        }

        // Registrar en bitácora
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la solicitud ${solicitud.codigo || id}`,
            dato: { antiguos: oldSolicitud, nuevos: solicitud }
        });

        return res.json(solicitud);
    } catch (error) {
        console.error('Error actualizando solicitud:', error);
        next(error);
    }
};

// Eliminar una solicitud
const deleteSolicitud = async (req, res, next) => {
    const { id } = req.params;
    try {
        const oldSolicitudRes = await pool.query('SELECT * FROM solicitud WHERE id = $1', [id]);
        const oldSolicitud = oldSolicitudRes.rows[0];
        const result = await pool.query('DELETE FROM solicitud WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Solicitud no encontrada' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó la solicitud ${oldSolicitud ? oldSolicitud.codigo || id : id}`,
            dato: { antiguos: oldSolicitud }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando solicitud:', error);
        next(error);
    }
};

// Listar todas las propiedades
const getAllPropiedades = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM propiedad ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Listar todos los usuarios
const getAllUsuarios = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM usuarios ORDER BY id');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Listar todos los tipos de solicitud
const getAllTipoSolicitudes = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_solicitud ORDER BY id');
        res.json(result.rows);
    } catch (error) {
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