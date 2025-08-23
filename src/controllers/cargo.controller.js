const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllCargos = async (req, res, next) => {
    try {
        const allCargos = await pool.query('SELECT * FROM cargo ORDER BY id ASC');
        return res.json(allCargos.rows);
    } catch (error) {
        console.error ('error obteniendo todos los cargos:', error);
        next(error);
    }
};

const getCargo = async (req, res, next) => {
    const { id } = req.params;
    try {
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

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Cargos',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el cargo ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando un nuevo cargo:', error);
        next(error)
    }
};

const updateCargo = async (req, res, next) => {
    const { id } = req.params;
    try {
        const { nombre } = req.body;

        const oldCargo = await pool.query('SELECT * FROM cargo WHERE id = $1', [id]);

        const result = await pool.query (
            'UPDATE cargo SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );
        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--'
            }); 
        }

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Cargos',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el cargo ${nombre}`,
            dato: { antiguos: oldCargo.rows[0], nuevos: result.rows[0] }
        });

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando el cargo ${id}:`, error);
        next(error);
    }
};

const deleteCargo = async (req, res, next) => {

    const { id } = req.params;

    const oldCargo = await pool.query('SELECT * FROM cargo WHERE id = $1', [id]);
    
    try {
        const result = await pool.query('DELETE FROM cargo WHERE id = $1', 
            [id]
        );
        
        if(result.rowCount === 0) {
            return res.status(404).json({
            message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--'
        }); 
    }

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Cargos',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el cargo ${oldCargo.rows[0]?.nombre || id}`,
            dato: { antiguos: oldCargo.rows[0] }
        });
        
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