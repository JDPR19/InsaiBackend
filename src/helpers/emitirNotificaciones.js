const pool = require('../db');

async function guardarNotificacionEnBD(usuarioId, datosNotificacion) {
    const result = await pool.query(
        'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2) RETURNING *',
        [usuarioId, datosNotificacion.mensaje]
    );
    return result.rows[0];
}

async function crearYEmitirNotificacion(req, usuarioId, datosNotificacion) {
    const notificacionGuardada = await guardarNotificacionEnBD(usuarioId, datosNotificacion);
    const io = req.app.get('io');
    io.to(`usuario_${usuarioId}`).emit('nueva_notificacion', notificacionGuardada);
}

module.exports = { crearYEmitirNotificacion };