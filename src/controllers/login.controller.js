const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { crearSesion, tieneSesionActiva, cerrarSesion } = require('./sesion.controller');

const loginUsuario = async (req, res, next) => {
    const { username, password } = req.body;
    const ip = req.ip;
    const user_agent = req.headers['user-agent'];

    try {
        const result = await pool.query(
            `SELECT u.*, t.nombre AS roles_nombre, t.permisos
            FROM usuarios u
            LEFT JOIN roles t ON u.roles_id = t.id
            WHERE (u.username = $1 OR u.email = $2) AND u.estado = TRUE`,
            [username, username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Usuario no Existe' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Verifica si ya tiene sesión activa
        const sesionActiva = await tieneSesionActiva(user.id);
        if (sesionActiva) {
            return res.status(403).json({ message: 'El usuario ya tiene una sesión activa en otro dispositivo.' });
        }

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                roles_id: user.roles_id,
                permisos: user.permisos 
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '3h' }
        );

        // Crea la sesión en la tabla
        await crearSesion(user.id, token, ip, user_agent);

        return res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                roles_id: user.roles_id,
                roles_nombre: user.roles_nombre,
                permisos: user.permisos 
            }
        });
    } catch (error) {
        console.error('Error validando login:', error);
        res.status(500).json({
            message: 'Ocurrió un error interno en el servidor',
            error: error.message
        });
    }
};

const logoutUsuario = async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
            await cerrarSesion(token); 
        }
        return res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error cerrando sesión', error: error.message });
    }
};

module.exports = { loginUsuario, logoutUsuario };