const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllMunicipios = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.id AS id,
                m.nombre AS nombre,
                e.id AS estado_id,
                e.nombre AS estado_nombre
            FROM municipio m
            JOIN estado e ON m.estado_id = e.id
            ORDER BY m.id ASC
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo todos los municipios', error);
        next(error);
    }
};

const getEstados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM estado ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo los estados', error);
        next(error);
    }
};

const getMunicipio = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM municipio WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: `Municipio no existe o imposible de encontrar` });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo el municipio con el id ${id}:`, error);
        next(error);
    }
};

const createMunicipio = async (req, res, next) => {
    const { nombre, estado_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO municipio (nombre, estado_id) VALUES ($1, $2) RETURNING *',
            [nombre, estado_id]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'municipios',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el municipio ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando el municipio', error);
        next(error);
    }
};

const updateMunicipio = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, estado_id } = req.body;
        const oldMunicipio = await pool.query('SELECT * FROM municipio WHERE id = $1', [id]);
        const result = await pool.query(
            'UPDATE municipio SET nombre = $1, estado_id = $2 WHERE id = $3 RETURNING *',
            [nombre, estado_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--' });
        }
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'municipios',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el municipio ${nombre}`,
            dato: { antiguos: oldMunicipio.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando el municipio con el id ${id}:`, error);
        next(error);
    }
};

const deleteMunicipio = async (req, res, next) => {
    const { id } = req.params;
    const oldMunicipio = await pool.query('SELECT * FROM municipio WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM municipio WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'ERROR 404 --> Solicitud no existe o es imposible de encontrar <--' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'municipio',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el municipio ${oldMunicipio.rows[0]?.nombre || id}`,
            dato: { antiguos: oldMunicipio.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error eliminando el municipio con el id ${id}:`, error);
        next(error);
    }
};

module.exports = {
    getAllMunicipios,
    getMunicipio,
    getEstados,
    createMunicipio,
    updateMunicipio,
    deleteMunicipio
};