const pool = require('../db');
const bcrypt = require('bcrypt');
const { registrarBitacora } = require('../registerBitacora');

// Obtener datos del usuario autenticado
const getMiUsuario = async (req, res, next) => {
    try {
        const { id } = req.user;
        const result = await pool.query(`
            SELECT 
                usuarios.*, 
                tipo_usuario.nombre AS tipo_usuario_nombre, 
                tipo_usuario.permisos, 
                empleados.cedula, 
                empleados.nombre AS empleado_nombre, 
                empleados.apellido,
                cargo.nombre AS cargo_nombre
                FROM usuarios
                LEFT JOIN tipo_usuario ON usuarios.tipo_usuario_id = tipo_usuario.id
                LEFT JOIN empleados ON usuarios.empleado_id = empleados.id
                LEFT JOIN cargo ON empleados.cargo_id = cargo.id
                WHERE usuarios.id = $1 AND usuarios.estado = TRUE
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo mi usuario:', error);
        next(error);
    }
};

// Actualizar datos del usuario autenticado
const updateMiUsuario = async (req, res, next) => {
    const { username, password, email } = req.body;
    const { id } = req.user;
    try {
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const oldUser = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (oldUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const result = await pool.query(
            `UPDATE usuarios
            SET username = $1, password = COALESCE($2, password), email = $3
            WHERE id = $4 RETURNING *`,
            [username, hashedPassword, email, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'miusuario',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó su propio usuario`,
            dato: { antiguos: oldUser.rows[0], nuevos: result.rows[0] }
        });

        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando mi usuario:', error);
        next(error);
    }
};

// Eliminar (desactivar) el usuario autenticado
const deleteMiUsuario = async (req, res, next) => {
    const { id } = req.user;
    try {
        const oldUser = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
        if (oldUser.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Desactivar usuario (no eliminar físico)
        const result = await pool.query(
            'UPDATE usuarios SET estado = FALSE WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya inactivo' });
        }

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'DESACTIVO',
            tabla: 'miusuario',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se desactivó su propio usuario`,
            dato: { antiguos: oldUser.rows[0] }
        });

        return res.sendStatus(204);
    } catch (error) {
        console.error('Error desactivando mi usuario:', error);
        next(error);
    }
};

module.exports = {
    getMiUsuario,
    updateMiUsuario,
    deleteMiUsuario
};