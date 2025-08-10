const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// --- PRODUCTOR ---

const getAllProductores = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                productor.id,
                productor.codigo,
                productor.cedula,
                productor.nombre,
                productor.apellido,
                productor.contacto,
                productor.email
            FROM productor
            ORDER BY productor.id ASC
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo productores:', error);
        next(error);
    }
};

const getProductor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM productor WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Productor no encontrado' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo productor:', error);
        next(error);
    }
};

const createProductor = async (req, res, next) => {
    const { codigo, cedula, nombre, apellido, contacto, email } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO productor (codigo, cedula, nombre, apellido, contacto, email)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [codigo, cedula, nombre, apellido, contacto, email]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'productor',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el productor ${nombre} ${apellido}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando productor:', error);
        next(error);
    }
};

const updateProductor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { codigo, cedula, nombre, apellido, contacto, tipo_productor_id, email } = req.body;
        const oldProductor = await pool.query('SELECT * FROM productor WHERE id = $1', [id]);
        const result = await pool.query(
            `UPDATE productor SET codigo = $1, cedula = $2, nombre = $3, apellido = $4, contacto = $5, email = $6
             WHERE id = $7 RETURNING *`,
            [codigo, cedula, nombre, apellido, contacto, email, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Productor no encontrado' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'productor',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el productor ${nombre} ${apellido}`,
            dato: { antiguos: oldProductor.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando productor:', error);
        next(error);
    }
};

const deleteProductor = async (req, res, next) => {
    const { id } = req.params;
    const oldProductor = await pool.query('SELECT * FROM productor WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM productor WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Productor no encontrado' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'productor',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el productor ${oldProductor.rows[0]?.nombre || id}`,
            dato: { antiguos: oldProductor.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando productor:', error);
        next(error);
    }
};

const getAllTiposProductor = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_productor ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de productor:', error);
        next(error);
    }
};

module.exports = {
    getAllProductores,
    getProductor,
    createProductor,
    updateProductor,
    deleteProductor,
    getAllTiposProductor
};