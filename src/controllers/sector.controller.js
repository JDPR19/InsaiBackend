const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllSector = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id AS id,
                s.nombre AS nombre,
                p.id AS parroquia_id,
                p.nombre AS parroquia_nombre,
                m.id AS municipio_id,
                m.nombre AS municipio_nombre,
                e.id AS estado_id,
                e.nombre AS estado_nombre
            FROM sector s
            JOIN parroquia p ON s.parroquia_id = p.id
            JOIN municipio m ON p.municipio_id = m.id
            JOIN estado e ON m.estado_id = e.id
            ORDER BY s.id ASC
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error solicitando todos los sectores', error);
        next(error);
    }
};

const getSector = async (req, res, next) => {
    const { id } = req.params;
    try{

        const result = await pool.query('SELECT * FROM sector WHERE id = $1', 
            [id]
        ); 

        if(result.rows.length === 0){
            return res.status(404).json({
                message: 'Sector no encontrado o inactivo'
            })
        }

        return res.json(result.rows[0]);
    }catch (error) {
        console.error(`Error obteniendo el sector con el id ${id}:`,error);
        next(error);
    }

};

const getEstados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM estado ORDER BY id DESC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo los estados', error);
        next(error);
    }
};

const getMunicipios = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM municipio ORDER BY id DESC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo los municipios', error);
        next(error);
    }
};

const getParroquias = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM parroquia ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo las parroquias', error);
        next(error);
    }
};

const createSector = async (req, res, next) => {
    const { nombre, parroquia_id } = req.body;
    try {
        const result = await pool.query('INSERT INTO sector (nombre, parroquia_id) VALUES ($1, $2) RETURNING *', 
            [nombre, parroquia_id]
        );

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'sector',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el sector ${nombre}`,
            dato: {nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(`Error registrando al sector con nombre ${nombre}:` , error)
        next(error);
    }
};

const updateSector = async (req, res, next) => {
    const { id } = req.params;
    try {
        const { nombre, parroquia_id } = req.body;
        
        const oldSector = await pool.query('SELECT * FROM sector WHERE id = $1', [id]);

        const result = await pool.query('UPDATE sector SET nombre = $1, parroquia_id = $2 WHERE id = $3 RETURNING * ', 
        [nombre, parroquia_id, id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--'
            })
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'sector',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el sector ${nombre}`,
            dato: {antiguos: oldSector.rows[0], nuevos: result.rows[0]} 
        });

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando el sector con id ${id}:`);
        next(error);
    }
};

const deleteSector = async (req, res, next) => {
    const { id } = req.params;
    try {
         const oldSector = await pool.query('SELECT * FROM sector WHERE id = $1', [id]);

        const result = await pool.query('DELETE FROM sector WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0) {
            return res.status(404).json({
            message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--'
            }); 
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'sector',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el cargo ${oldSector.rows[0]?.nombre || id}`,
            dato:{antiguos: oldSector.rows[0]}
        })

        return res.sendStatus(204);
    } catch (error) {
        console.error(`Se elimino el sector con id ${id}`, error);
        next(error);
    }
};

module.exports = {
    getAllSector,
    getSector,
    getEstados,
    getMunicipios,
    getParroquias,
    createSector,
    updateSector,
    deleteSector
};