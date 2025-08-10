const jwt = require('jsonwebtoken');
const pool = require('./db');

const verificarToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Token no proporcionado' });
        }
        const token = authHeader.split(' ')[1];

        // Verifica el JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        } catch (err) {
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        // Verifica que la sesión esté activa en la base de datos
        const sesion = await pool.query(
            'SELECT * FROM sesiones WHERE token = $1 AND activo = true',
            [token]
        );
        if (sesion.rows.length === 0) {
            return res.status(401).json({ message: 'Sesión no activa o token inválido' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(500).json({ message: 'Error verificando token', error: error.message });
    }
};

module.exports = verificarToken;