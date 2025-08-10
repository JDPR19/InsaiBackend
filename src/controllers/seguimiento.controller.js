const pool = require('../db');

const getAllProgramasFito = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM programa_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getProgramasByInspeccion = async (req, res, next) => {
    try {
        const { inspeccion_est_id } = req.params;
        const result = await pool.query(`
            SELECT ipf.id, ipf.created_at, ipf.observacion, pf.id as programa_id, pf.nombre 
            FROM inspeccion_programa_fito ipf
            JOIN programa_fito pf ON ipf.programa_fito_id = pf.id
            WHERE ipf.inspeccion_est_id = $1
            ORDER BY ipf.created_at DESC
        `, [inspeccion_est_id]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const addProgramaToInspeccion = async (req, res, next) => {
    try {
        const { inspeccion_est_id, programa_fito_id, observacion } = req.body;
        if (!inspeccion_est_id || !programa_fito_id) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        const result = await pool.query(`
            INSERT INTO inspeccion_programa_fito (inspeccion_est_id, programa_fito_id, observacion)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [inspeccion_est_id, programa_fito_id, observacion || null]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

const updateProgramaInInspeccion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { observacion } = req.body;
        // Solo permitimos editar la observación (no el programa ni la inspección)
        const result = await pool.query(
            `UPDATE inspeccion_programa_fito SET observacion = $1 WHERE id = $2 RETURNING *`,
            [observacion, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No encontrado' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

const deleteProgramaFromInspeccion = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query(`DELETE FROM inspeccion_programa_fito WHERE id = $1`, [id]);
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProgramasByInspeccion,
    getAllProgramasFito,
    addProgramaToInspeccion,
    updateProgramaInInspeccion,
    deleteProgramaFromInspeccion
};