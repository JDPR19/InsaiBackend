const pool = require('../db');
const bcrypt = require('bcrypt');

// Obtener todos los usuarios (con tipo_usuario y empleado)
const getAllUsuarios = async (req, res, next) => {
    try {
        const result = await pool.query(` 
            SELECT 
                usuarios.id,
                usuarios.username, 
                usuarios.email, 
                usuarios.tipo_usuario_id,
                usuarios.empleado_id,
                tipo_usuario.nombre AS tipo_usuario_nombre
            FROM usuarios
            LEFT JOIN tipo_usuario ON usuarios.tipo_usuario_id = tipo_usuario.id
            WHERE usuarios.estado = TRUE
            ORDER BY usuarios.id DESC
`);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo todos los usuarios:', error);
        next(error);
    }
};

// Obtener un usuario individual (por id, username o email)
const getUsuario = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT 
    usuarios.*, 
    tipo_usuario.nombre AS tipo_usuario_nombre, 
    tipo_usuario.permisos, 
    empleados.cedula, 
    empleados.nombre AS empleado_nombre, 
    empleados.apellido
FROM usuarios
LEFT JOIN tipo_usuario ON usuarios.tipo_usuario_id = tipo_usuario.id
LEFT JOIN empleados ON usuarios.empleado_id = empleados.id
WHERE 
    (usuarios.id = $1 OR usuarios.username = $2 OR usuarios.email = $3) 
    AND usuarios.estado = TRUE;

        `, [id, id, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo el usuario con id ${req.params.id}:`, error);
        next(error);
    }
};

const getCedulas = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, cedula, nombre, apellido
            FROM empleados
            WHERE estado = TRUE
            ORDER BY cedula ASC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo cédulas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// En tipo_usuario.controller.js
const getAllTipoUsuario = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre, permisos FROM tipo_usuario ORDER BY nombre ASC');
        return res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Crear un nuevo usuario
const createUsuario = async (req, res, next) => {
    try {
        const { username, password, email, tipo_usuario_id, empleado_id } = req.body;
        if (!username || !password || !email || !tipo_usuario_id || !empleado_id) {
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO usuarios (username, password, email, tipo_usuario_id, empleado_id, estado)
             VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *`,
            [username, hashedPassword, email, tipo_usuario_id, empleado_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando usuario:', error);
        next(error);
    }
};

// Actualizar un usuario existente
const updateUsuario = async (req, res, next) => {
    const { id } = req.params;
    const { username, password, email, tipo_usuario_id, empleado_id, estado = true } = req.body;
    try {
        let hashedPassword = null;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }
        const result = await pool.query(
            `UPDATE usuarios
            SET username = $1, password = COALESCE($2, password), email = $3, tipo_usuario_id = $4, empleado_id = $5, estado = $6
             WHERE id = $7 RETURNING *`,
            [username, hashedPassword, email, tipo_usuario_id, empleado_id, estado, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o inactivo' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando el usuario ${id}:`, error);
        next(error);
    }
};

// Eliminar (desactivar) un usuario
const deleteUsuario = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE usuarios SET estado = FALSE WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado o ya inactivo' });
        }
        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error desactivando el usuario ${id}:`, error);
        next(error);
    }
};

module.exports = {
    getAllUsuarios,
    getAllTipoUsuario,
    getCedulas,
    getUsuario,
    createUsuario,
    updateUsuario,
    deleteUsuario
};