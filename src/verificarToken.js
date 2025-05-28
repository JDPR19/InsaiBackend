const jwt = require('jsonwebtoken');

const verificarToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    console.log('HEADER:', authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token no proporcionado' });
    }

    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, decoded) => {
        if (err) {
            console.log('TOKEN INVALIDO');
            return res.status(401).json({ message: 'Token inválido o expirado' });
        }

        req.user = decoded; // Guardar los datos del usuario en la solicitud
        console.log('TOKEN OK, USER:', decoded);
        next();
    });
};

module.exports = verificarToken;