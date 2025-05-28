const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../db'); // Conexión a la base de datos

const loginUsuario = async (req, res, next) => {
    const { username, password } = req.body;

    try {
        // Buscar el usuario y su tipo de usuario
        const result = await pool.query(
            `SELECT u.*, t.nombre AS tipo_usuario_nombre, t.permisos
            FROM usuarios u
            LEFT JOIN tipo_usuario t ON u.tipo_usuario_id = t.id
            WHERE (u.username = $1 OR u.email = $2) AND u.estado = TRUE`,
            [username, username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos o Usuario no Existe' });
        }

        const user = result.rows[0];

        // Comparar la contraseña ingresada con la almacenada
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
        }

        // Generar un token JWT
        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                tipo_usuario_id: user.tipo_usuario_id,
                permisos: user.permisos // <-- aquí
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '5h' }
        );
        // Login exitoso
        return res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                username: user.username,
                tipo_usuario_id: user.tipo_usuario_id,
                tipo_usuario_nombre: user.tipo_usuario_nombre,
                permisos: user.permisos // <-- aquí
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

const logoutUsuario = (req, res) => {
    return res.json({ message: 'Sesión cerrada exitosamente' });
};

module.exports = { loginUsuario, logoutUsuario };