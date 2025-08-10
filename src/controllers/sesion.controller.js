const pool = require('../db');

// Crear sesión (al hacer login)
const crearSesion = async (usuario_id, token, ip, user_agent) => {
    // Cierra cualquier sesión activa previa
    await pool.query(
        'UPDATE sesiones SET activo = false, fecha_fin = NOW() WHERE usuario_id = $1 AND activo = true',
        [usuario_id]
    );
    // Crea la nueva sesión
    await pool.query(
        'INSERT INTO sesiones (usuario_id, token, ip, user_agent) VALUES ($1, $2, $3, $4)',
        [usuario_id, token, ip, user_agent]
    );
};

// Cerrar sesión (al hacer logout)
const cerrarSesion = async (token) => {
    await pool.query(
        'UPDATE sesiones SET activo = false, fecha_fin = NOW() WHERE token = $1 AND activo = true',
        [token]
    );
};

// Verificar si el usuario tiene sesión activa
const tieneSesionActiva = async (usuario_id) => {
    const result = await pool.query(
        'SELECT * FROM sesiones WHERE usuario_id = $1 AND activo = true',
        [usuario_id]
    );
    return result.rows.length > 0;
};

module.exports = {
    crearSesion,
    cerrarSesion,
    tieneSesionActiva
};