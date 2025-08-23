const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// Obtener todos los laboratorios con datos asociados
const getAllLaboratorios = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT 
                laboratorio.id,
                laboratorio.nombre,
                laboratorio.descripcion,
                laboratorio.ubicación,
                laboratorio.tipo_laboratorio_id,
                tipo_laboratorio.nombre AS tipo_laboratorio_nombre,
                laboratorio.sector_id,
                sector.nombre AS sector_nombre,
                parroquia.id AS parroquia_id,
                parroquia.nombre AS parroquia_nombre,
                municipio.id AS municipio_id,
                municipio.nombre AS municipio_nombre,
                estado.id AS estado_id,
                estado.nombre AS estado_nombre
            FROM laboratorio
            JOIN tipo_laboratorio ON laboratorio.tipo_laboratorio_id = tipo_laboratorio.id
            JOIN sector ON laboratorio.sector_id = sector.id
            JOIN parroquia ON sector.parroquia_id = parroquia.id
            JOIN municipio ON parroquia.municipio_id = municipio.id
            JOIN estado ON municipio.estado_id = estado.id
            ORDER BY laboratorio.id ASC;
        `);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo laboratorios:', error);
        next(error);
    }
};

// Obtener un laboratorio individual
const getLaboratorio = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM laboratorio WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Laboratorio no encontrado' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo el laboratorio con id ${req.params.id}:`, error);
        next(error);
    }
};


const getTiposLaboratorio = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_laboratorio ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de laboratorio:', error);
        next(error);
    }
};

const getEstados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM estado ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estados:', error);
        next(error);
    }
};

const getMunicipios = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM municipio ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo municipios:', error);
        next(error);
    }
};

const getParroquias = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM parroquia ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo parroquias:', error);
        next(error);
    }
};

const getSectores = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM sector ORDER BY id ASC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo sectores:', error);
        next(error);
    }
};

// Crear laboratorio
const createLaboratorio = async (req, res, next) => {
    const { nombre, descripcion, ubicación, tipo_laboratorio_id, sector_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO laboratorio (nombre, descripcion, ubicación, tipo_laboratorio_id, sector_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nombre, descripcion, ubicación, tipo_laboratorio_id, sector_id]
        );
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Laboratorios',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el laboratorio ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando laboratorio:', error);
        next(error);
    }
};


const updateLaboratorio = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, ubicación, tipo_laboratorio_id, sector_id } = req.body;
        
        const oldLab = await pool.query('SELECT * FROM laboratorio WHERE id = $1', [id]);
        
        const result = await pool.query(
            'UPDATE laboratorio SET nombre = $1, descripcion = $2, ubicación = $3, tipo_laboratorio_id = $4, sector_id = $5 WHERE id = $6 RETURNING *',
            [nombre, descripcion, ubicación, tipo_laboratorio_id, sector_id, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Laboratorio no encontrado' });
        }
        
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Laboratorios',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el laboratorio ${nombre}`,
            dato: { antiguos: oldLab.rows[0], nuevos: result.rows[0] }
        });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando laboratorio con id ${req.params.id}:`, error);
        next(error);
    }
};


const deleteLaboratorio = async (req, res, next) => {
    const { id } = req.params;
    const oldLab = await pool.query('SELECT * FROM laboratorio WHERE id = $1', [id]);
    try {
        const result = await pool.query('DELETE FROM laboratorio WHERE id = $1', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Laboratorio no encontrado' });
        }
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Laboratorios',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el laboratorio ${oldLab.rows[0]?.nombre || id}`,
            dato: { antiguos: oldLab.rows[0] }
        });
        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error eliminando laboratorio con id ${id}:`, error);
        next(error);
    }
};

module.exports = {
    getAllLaboratorios,
    getLaboratorio,
    getTiposLaboratorio,
    getEstados,
    getMunicipios,
    getParroquias,
    getSectores,
    createLaboratorio,
    updateLaboratorio,
    deleteLaboratorio
};