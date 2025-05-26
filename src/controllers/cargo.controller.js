const pool = require('../db');

const getAllCargos = async (req, res, next) => {
    try {
        const allCargos = await pool.query('SELECT id, nombre FROM cargo ORDER BY nombre ASC');
        return res.json(allCargos.rows);
    } catch (error) {
        console.error ('error obteniendo todos los cargos:', error);
        next(error);
    }
};

const getCargo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query ('SELECT * FROM cargo WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'cargo no encontrado o inactivo'});
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`error obteniendo el cargo con id ${id}:`, error);
        next(error);
    }
};

const createCargo = async (req, res, next) => {
    const {nombre} = req.body;
    try {
        const result = await pool.query('INSERT INTO cargo (nombre) VALUES ($1) RETURNING *', 
            [nombre] 
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando un nuevo cargo:', error);
        next(error)
    }
};

const updateCargo = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        const result = await pool.query (
            'UPDATE cargo SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--'
            }); 
        }
        return res.json(result.rows[0])
    } catch (error) {
        console.error(`Error actualizando el cargo ${id}:`, error);
        next(error);
    }
};

const deleteCargo = async (req, res, next) => {

    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM cargo WHERE id = $1', 
            [id]
        );
        
        if(result.rowCount === 0) {
            return res.status(404).json({
            message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--'
        }); }
        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error eliminando el cargo ${id}:`, error);
        next(error);
    }
};

module.exports = {
    getAllCargos,
    getCargo,
    createCargo,
    updateCargo,
    deleteCargo
};