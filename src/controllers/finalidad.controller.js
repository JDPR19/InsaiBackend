const pool = require('../db');

const getAllFinalidades = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM finalidad_catalogo ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo finalidades:', error);
        next(error);
    }
};

module.exports = {
    getAllFinalidades
};