const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// Obtener todos los programas con sus relaciones
const getAllProgramas = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                programa_fito.id,
                programa_fito.nombre,
                programa_fito.tiempo_duracion,
                programa_fito.descripcion,
                programa_fito.plaga_fito_id,
                plaga_fito.nombre AS plaga_fito_nombre,
                plaga_fito.nombre_cientifico AS plaga_fito_nombre_cientifico,
                plaga_fito.tipo_plaga_fito_id,
                tipo_plaga_fito.nombre AS tipo_plaga_fito_nombre,
                programa_fito.tipo_programa_fito_id,
                tipo_programa_fito.nombre AS tipo_programa_fito_nombre
            FROM programa_fito
            LEFT JOIN plaga_fito ON programa_fito.plaga_fito_id = plaga_fito.id
            LEFT JOIN tipo_plaga_fito ON plaga_fito.tipo_plaga_fito_id = tipo_plaga_fito.id
            LEFT JOIN tipo_programa_fito ON programa_fito.tipo_programa_fito_id = tipo_programa_fito.id
            ORDER BY programa_fito.id ASC;
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo programas:', error);
        next(error);
    }
};


const getPrograma = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM programa_fito WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Programa no encontrado' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error obteniendo programa:', error);
        next(error);
    }
};


const getPlagas = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM plaga_fito ORDER BY nombre ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo plagas:', error);
        next(error);
    }
};


const getTiposPrograma = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM tipo_programa_fito ORDER BY nombre ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de programa:', error);
        next(error);
    }
};

const createPrograma = async (req, res, next) => {
    const { nombre, tiempo_duracion, descripcion, plaga_fito_id, tipo_programa_fito_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO programa_fito (nombre, tiempo_duracion, descripcion, plaga_fito_id, tipo_programa_fito_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre, tiempo_duracion, descripcion, plaga_fito_id, tipo_programa_fito_id]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el programa ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando programa:', error);
        next(error);
    }
};


const updatePrograma = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, tiempo_duracion, descripcion, plaga_fito_id, tipo_programa_fito_id } = req.body;
        const oldPrograma = await pool.query('SELECT * FROM programa_fito WHERE id = $1', [id]);
        const result = await pool.query(
            'UPDATE programa_fito SET nombre = $1, tiempo_duracion = $2, descripcion = $3, plaga_fito_id = $4, tipo_programa_fito_id = $5 WHERE id = $6 RETURNING *',
            [nombre, tiempo_duracion, descripcion, plaga_fito_id, tipo_programa_fito_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Programa no encontrado' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el programa ${nombre}`,
            dato: { antiguos: oldPrograma.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando programa:', error);
        next(error);
    }
};


const deletePrograma = async (req, res, next) => {
    const { id } = req.params;
    const oldPrograma = await pool.query('SELECT * FROM programa_fito WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM programa_fito WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Programa no encontrado' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el programa ${oldPrograma.rows[0]?.nombre || id}`,
            dato: { antiguos: oldPrograma.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error('Error eliminando programa:', error);
        next(error);
    }
};

module.exports = {
    getAllProgramas,
    getPrograma,
    getPlagas,
    getTiposPrograma,
    createPrograma,
    updatePrograma,
    deletePrograma
};