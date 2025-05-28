const pool = require('../db');

// Obtener todos los tipos de usuario
const getAllTipoUsuario = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM tipo_usuario ORDER BY id DESC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de usuario:', error);
        next(error);
    }
};

// Obtener un tipo de usuario por id
const getTipoUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM tipo_usuario WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de usuario no encontrado' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo tipo de usuario ${id}:`, error);
        next(error);
    }
};

// Crear 
const createTipoUsuario = async (req, res, next) => {
    const { nombre, descripcion, permisos } = req.body;
    try {
        const permisosJson = permisos ? JSON.stringify(permisos) : JSON.stringify({});
        const result = await pool.query(
            `INSERT INTO tipo_usuario (nombre, descripcion, permisos)
             VALUES ($1, $2, $3) RETURNING *`,
            [nombre, descripcion, permisosJson || {}]
        );


        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando tipo de usuario:', error);
        next(error);
    }
};

// Actualizar 
const updateTipoUsuario = async (req, res, next) => {
    const { id } = req.params;
    let { nombre, descripcion, permisos } = req.body;

    try {
        // Si no se envía permisos, obtener el actual de la BD
        if (typeof permisos === 'undefined') {
            
            const current = await pool.query('SELECT permisos FROM tipo_usuario WHERE id = $1', [id]);
            
            if (current.rows.length === 0) {
                return res.status(404).json({ message: 'Tipo de usuario no encontrado' });
            }
            
            permisos = current.rows[0].permisos;
        }

        const result = await pool.query(
            `UPDATE tipo_usuario SET nombre = $1, descripcion = $2, permisos = $3
             WHERE id = $4 RETURNING *`,
            [nombre, descripcion, permisos, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de usuario no encontrado' });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando tipo de usuario ${id}:`, error);
        next(error);
    }
};

// Eliminar 
const deleteTipoUsuario = async (req, res, next) => {
    const { id } = req.params;
    try {

        const result = await pool.query(
            'DELETE FROM tipo_usuario WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Tipo de usuario no encontrado' });
        }

        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error eliminando tipo de usuario ${id}:`, error);
        next(error);
    }
};

module.exports = {
    getAllTipoUsuario,
    getTipoUsuario,
    createTipoUsuario,
    updateTipoUsuario,
    deleteTipoUsuario
};