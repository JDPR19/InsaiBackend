const pool = require('./db');

/**
 * Registra una acción en la bitácora.
 * @param {Object} params
 * @param {string} params.accion - Acción realizada (INSERT, UPDATE, DELETE, etc)
 * @param {string} params.tabla - Nombre de la tabla afectada
 * @param {string} params.usuario - Nombre del usuario (del token)
 * @param {string} params.descripcion - Descripción de la acción
 * @param {object} [params.dato] - Datos adicionales (opcional)
 * @param {number} [params.usuario_id] - ID del usuario (opcional)
 */
async function registrarBitacora({ accion, tabla, usuario, descripcion, dato = null, usuario_id = null }) {
    await pool.query(
        `INSERT INTO bitacora (fecha, accion, tabla, usuario, descripcion, dato, usuario_id)
        VALUES (NOW()::timestamp(0), $1, $2, $3, $4, $5, $6)`,
        [accion, tabla, usuario, descripcion, dato ? JSON.stringify(dato) : null, usuario_id]
    );
}

module.exports = { registrarBitacora };