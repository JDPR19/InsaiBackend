const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllParroquias = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                p.id AS id,
                p.nombre AS nombre,
                m.id AS municipio_id,
                m.nombre AS municipio_nombre,
                e.id AS estado_id,
                e.nombre AS estado_nombre
            FROM parroquia p
            JOIN municipio m ON p.municipio_id = m.id
            JOIN estado e ON m.estado_id = e.id
            ORDER BY p.id ASC
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo todas las parroquias', error);
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

const getParroquia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM parroquia WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: `parroquia no existe o imposible de encontrar` });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo la parroquia con el id ${id}:`, error);
        next(error);
    }
};

const createParroquia = async (req, res, next) => {
    const { nombre, municipio_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO parroquia (nombre, municipio_id) VALUES ($1, $2) RETURNING *',
            [nombre, municipio_id]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Parroquias',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo la parroquia ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando la parroquia', error);
        next(error);
    }
};

const updateParroquia = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, municipio_id } = req.body;
        const oldParroquia = await pool.query('SELECT * FROM parroquia WHERE id = $1', [id]);
        const result = await pool.query(
            'UPDATE parroquia SET nombre = $1, municipio_id = $2 WHERE id = $3 RETURNING *',
            [nombre, municipio_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar <--' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Parroquias',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo la parroquia ${nombre}`,
            dato: { antiguos: oldParroquia.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando la parroquia con el id ${id}:`, error);
        next(error);
    }
};

const deleteParroquia = async (req, res, next) => {
    const { id } = req.params;
    const oldParroquia = await pool.query('SELECT * FROM parroquia WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM parroquia WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar <--' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Parroquias',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino la parroquia ${oldParroquia.rows[0]?.nombre || id}`,
            dato: { antiguos: oldParroquia.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error eliminando la parroquia con el id ${id}:`, error);
        next(error);
    }
};

module.exports = {
    getAllParroquias,
    getParroquia,
    getEstados,
    getMunicipios,
    createParroquia,
    updateParroquia,
    deleteParroquia
};