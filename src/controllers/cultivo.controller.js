const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// Obtener todos los cultivos con su tipo
const getAllCultivos = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
            cultivo.id,
            cultivo.nombre,
            cultivo.nombre_cientifico,
            cultivo.descripcion,
            cultivo.tipo_cultivo_id,
            tipo_cultivo.nombre AS tipo_cultivo_nombre
        FROM cultivo
        JOIN tipo_cultivo ON cultivo.tipo_cultivo_id = tipo_cultivo.id
        ORDER BY cultivo.id ASC
    `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo cultivos:', error);
        next(error);
    }
};

// Obtener un cultivo por id
const getCultivo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM cultivo WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cultivo no encontrado' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo cultivo:', error);
        next(error);
    }
};


const getTiposCultivo = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_cultivo ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de cultivo:', error);
        next(error);
    }
};


const createCultivo = async (req, res, next) => {
    const { nombre, nombre_cientifico, descripcion, tipo_cultivo_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO cultivo (nombre, nombre_cientifico, descripcion, tipo_cultivo_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, nombre_cientifico, descripcion, tipo_cultivo_id]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Cultivos',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el cultivo ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando cultivo:', error);
        next(error);
    }
};


const updateCultivo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, nombre_cientifico, descripcion, tipo_cultivo_id } = req.body;
        const oldCultivo = await pool.query('SELECT * FROM cultivo WHERE id = $1', [id]);
        const result = await pool.query(
            'UPDATE cultivo SET nombre = $1, nombre_cientifico = $2, descripcion = $3, tipo_cultivo_id = $4 WHERE id = $5 RETURNING *',
            [nombre, nombre_cientifico, descripcion, tipo_cultivo_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Cultivo no encontrado' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Cultivos',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el cultivo ${nombre}`,
            dato: { antiguos: oldCultivo.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando cultivo:', error);
        next(error);
    }
};


const deleteCultivo = async (req, res, next) => {
    const { id } = req.params;
    const oldCultivo = await pool.query('SELECT * FROM cultivo WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM cultivo WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Cultivo no encontrado' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Cultivos',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el cultivo ${oldCultivo.rows[0]?.nombre || id}`,
            dato: { antiguos: oldCultivo.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando cultivo:', error);
        next(error);
    }
};

module.exports = {
    getAllCultivos,
    getCultivo,
    getTiposCultivo,
    createCultivo,
    updateCultivo,
    deleteCultivo
};