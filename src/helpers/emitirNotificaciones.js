const pool = require('../db');

async function guardarNotificacionEnBD(datosNotificacion) {
    if (!datosNotificacion || !datosNotificacion.usuario_id) return null;
    const { usuario_id, mensaje } = datosNotificacion;
    const result = await pool.query(
        'INSERT INTO notificaciones (usuario_id, mensaje) VALUES ($1, $2) RETURNING *',
        [usuario_id, mensaje]
    );
    return result.rows[0];
}

async function crearYEmitirNotificacion(req, usuarioId, datosNotificacion) {
    // Si usuarioId existe, úsalo; si no, intenta obtenerlo de datosNotificacion
    const usuario_id = usuarioId || (datosNotificacion && datosNotificacion.usuario_id);
    if (!usuario_id) return; // No emitir si no hay usuario
    const notificacionGuardada = await guardarNotificacionEnBD({ usuario_id, mensaje: datosNotificacion.mensaje });
    const io = req.app.get('io');
    if (io && usuario_id) {
        io.to(`usuario_${usuario_id}`).emit('nueva_notificacion', notificacionGuardada);
    }
}

module.exports = { crearYEmitirNotificacion };