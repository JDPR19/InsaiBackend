const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllPlagasFito = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                plaga_fito.id,
                plaga_fito.nombre,
                plaga_fito.nombre_cientifico,
                plaga_fito.observaciones,
                plaga_fito.tipo_plaga_fito_id,
                tipo_plaga_fito.nombre AS tipo_plaga_fito_nombre
            FROM plaga_fito
            JOIN tipo_plaga_fito ON plaga_fito.tipo_plaga_fito_id = tipo_plaga_fito.id
            ORDER BY plaga_fito.id ASC;
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo plagas:', error);
        next(error);
    }
};


const getPlagaFito = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM plaga_fito WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Plaga no encontrada' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo plaga:', error);
        next(error);
    }
};

// Obtener todos los tipos de plaga fito
const getTiposPlagaFito = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_plaga_fito ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de plaga fito:', error);
        next(error);
    }
};


const createPlagaFito = async (req, res, next) => {
    const { nombre, nombre_cientifico, observaciones, tipo_plaga_fito_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO plaga_fito (nombre, nombre_cientifico, observaciones, tipo_plaga_fito_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [nombre, nombre_cientifico, observaciones, tipo_plaga_fito_id]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Plagas',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la plaga ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando plaga:', error);
        next(error);
    }
};


const updatePlagaFito = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, nombre_cientifico, observaciones, tipo_plaga_fito_id } = req.body;
        const oldPlaga = await pool.query('SELECT * FROM plaga_fito WHERE id = $1', [id]);
        const result = await pool.query(
            'UPDATE plaga_fito SET nombre = $1, nombre_cientifico = $2, observaciones = $3, tipo_plaga_fito_id = $4 WHERE id = $5 RETURNING *',
            [nombre, nombre_cientifico, observaciones, tipo_plaga_fito_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Plaga no encontrada' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Plagas',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la plaga ${nombre}`,
            dato: { antiguos: oldPlaga.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando plaga:', error);
        next(error);
    }
};


const deletePlagaFito = async (req, res, next) => {
    const { id } = req.params;
    const oldPlaga = await pool.query('SELECT * FROM plaga_fito WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM plaga_fito WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Plaga no encontrada' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Plagas',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó la plaga ${oldPlaga.rows[0]?.nombre || id}`,
            dato: { antiguos: oldPlaga.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando plaga:', error);
        next(error);
    }
};

module.exports = {
    getAllPlagasFito,
    getPlagaFito,
    getTiposPlagaFito,
    createPlagaFito,
    updatePlagaFito,
    deletePlagaFito
};