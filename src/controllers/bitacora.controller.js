const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


// Registrar inicio de sesión
const inicioSesion = async (req, res) => {
    const { usuario, usuario_id } = req.body;

    if (!usuario || !usuario_id) {
        return res.status(400).json({ message: 'El usuario y el ID del usuario son obligatorios' });
    }

    try {
        await registrarBitacora({
            accion: 'INICIO DE SESIÓN',
            tabla: 'Sistema',
            usuario,
            usuario_id,
            descripcion: 'El usuario inició sesión en el sistema'
        });
        res.status(201).send('Inicio de sesión registrado en la bitácora');
    } catch (error) {
        console.error('Error al registrar el inicio de sesión:', error.message);
        res.status(500).json({ message: 'Error interno al registrar el inicio de sesión' });
    }
};

// Registrar cierre de sesión
const cierreSesion = async (req, res) => {
    const { usuario, usuario_id } = req.body;

    if (!usuario || !usuario_id) {
        return res.status(400).json({ message: 'El usuario y el ID del usuario son obligatorios' });
    }

    try {
        await registrarBitacora({
            accion: 'CIERRE DE SESIÓN',
            tabla: 'Sistema',
            usuario,
            usuario_id,
            descripcion: 'El usuario cerró sesión en el sistema'
        });
        res.status(201).send('Cierre de sesión registrado en la bitácora');
    } catch (error) {
        console.error('Error al registrar el cierre de sesión:', error.message);
        res.status(500).json({ message: 'Error interno al registrar el cierre de sesión' });
    }
};


// Obtener registros de la bitácora
const listarBitacora = async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT 
                bitacora.id, 
                TO_CHAR(bitacora.fecha, 'DD/MM/YYYY HH24:MI') AS fecha, 
                bitacora.accion, 
                bitacora.tabla, 
                bitacora.usuario, 
                bitacora.descripcion,
                bitacora.dato
            FROM bitacora
            ORDER BY fecha DESC;
        `);
        
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error al obtener la bitácora:', error.message);
        res.status(500).json({ message: 'Error al obtener la bitácora' });
    }
};


module.exports = { inicioSesion, cierreSesion, listarBitacora};