const pool = require('../db');

const getNotificacionesByUsuario = async (req, res, next) => {
    const usuario_id = req.query.usuario_id;
    try {
        const result = await pool.query(
            `SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY created_at DESC`,
            [usuario_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo notificaciones:', error);
        next(error);
    }
};

const marcarLeida = async (req, res, next) => {
    const { id } = req.params;
    try {
        await pool.query(
            `UPDATE notificaciones SET leida = TRUE WHERE id = $1`,
            [id]
        );
        res.sendStatus(200);
    } catch (error) {
        console.error('Error marcando notificación como leída:', error);
        next(error);
    }
};

module.exports = {
    getNotificacionesByUsuario,
    marcarLeida
};