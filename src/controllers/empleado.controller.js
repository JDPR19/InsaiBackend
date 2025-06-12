const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// Obtener todos los empleados con el nombre del cargo
const getAllEmpleados = async (req, res, next) => {
    try {
        const allEmpleados = await pool.query(
            "SELECT empleados.*, cargo.nombre AS cargo_nombre FROM empleados LEFT JOIN cargo ON empleados.cargo_id = cargo.id WHERE empleados.estado = TRUE ORDER BY empleados.id DESC"
        );
        return res.json(allEmpleados.rows);
    } catch (error) {
        console.error('Error obteniendo todos los empleados:', error);
        next(error);
    }
};

// Obtener un empleado individual
const getEmpleado = async (req, res, next) => {
    try {
        const { id } = req.params;
        const empleadoId = parseInt(id, 10);
        const result = await pool.query(
            "SELECT empleados.*, cargo.nombre AS cargo_nombre FROM empleados LEFT JOIN cargo ON empleados.cargo_id = cargo.id WHERE empleados.id = $1 AND empleados.estado = TRUE",
            [empleadoId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado o inactivo' });
        }
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo el empleado con id ${req.params.id}:`, error);
        next(error);
    }
};


// Obtener todos los cargos (para el select en el frontend)
const getAllCargos = async (req, res, next) => {
    try {
        const allCargos = await pool.query('SELECT id, nombre FROM cargo ORDER BY nombre ASC');
        return res.json(allCargos.rows);
    } catch (error) {
        console.error('Error obteniendo todos los cargos:', error);
        next(error);
    }
};

// Crear un nuevo empleado
const createEmpleado = async (req, res, next) => {
    const { cedula, nombre, apellido, contacto, cargo_id } = req.body;

    if (!cedula || !nombre || !apellido || !cargo_id) {
        return res.status(400).json({ message: 'Todos los campos obligatorios deben ser completados' });
    }
    
    try {
        // Validar unicidad de la cédula
        const existe = await pool.query(
            'SELECT id FROM empleados WHERE cedula = $1',
            [cedula]
        );
        if (existe.rows.length > 0) {
            return res.status(409).json({ message: 'La cédula ya está registrada' });
        }

        const result = await pool.query(
            "INSERT INTO empleados (cedula, nombre, apellido, contacto, cargo_id, estado) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *",
            [cedula, nombre, apellido, contacto, cargo_id]
        );
        
        const empleadoId = result.rows[0].id;
        
        // Traer el empleado con el JOIN para incluir cargo_nombre
        const empleadoCompleto = await pool.query(
            "SELECT empleados.*, cargo.nombre AS cargo_nombre FROM empleados LEFT JOIN cargo ON empleados.cargo_id = cargo.id WHERE empleados.id = $1",
            [empleadoId]
        );

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'empleados',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el empleado ${nombre} ${apellido}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(empleadoCompleto.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ message: 'El cargo especificado no existe' });
        }
        console.error('Error creando un nuevo empleado:', error);
        next(error);
    }
};

// Actualizar un empleado existente
const updateEmpleado = async (req, res, next) => {
    const { id } = req.params;
    const empleadoId = parseInt(id, 10);
    const { cedula, nombre, apellido, contacto, cargo_id, estado } = req.body;


    try {

        const oldEmpleado = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);
        if (oldEmpleado.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }

        // Validar unicidad de la cédula (excepto para el propio registro)
        const existe = await pool.query(
            'SELECT id FROM empleados WHERE cedula = $1 AND id <> $2',
            [cedula, empleadoId]
        );
        if (existe.rows.length > 0) {
            return res.status(409).json({ message: 'La cédula ya está registrada en otro empleado' });
        }

        const result = await pool.query(
            "UPDATE empleados SET cedula = $1, nombre = $2, apellido = $3, contacto = $4, cargo_id = $5, estado = $6 WHERE id = $7 RETURNING *",
            [cedula, nombre, apellido, contacto, cargo_id, estado, empleadoId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado o inactivo' });
        }

        // Traer el empleado actualizado con el JOIN para incluir cargo_nombre
        const empleadoCompleto = await pool.query(
            "SELECT empleados.*, cargo.nombre AS cargo_nombre FROM empleados LEFT JOIN cargo ON empleados.cargo_id = cargo.id WHERE empleados.id = $1",
            [empleadoId]
        );

         // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'empleados',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el empleado ${nombre} ${apellido}`,
            dato: { antiguos: oldEmpleado.rows[0], nuevos: result.rows[0] }
        });

        return res.json(empleadoCompleto.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(400).json({ message: 'El cargo especificado no existe' });
        }
        console.error(`Error actualizando el empleado ${id}:`, error);
        next(error);
    }
};

// Eliminar un empleado (eliminación lógica)
const deleteEmpleado = async (req, res, next) => {
    const { id } = req.params;
    const empleadoId = parseInt(id, 10);

    try {

        const oldEmpleado = await pool.query('SELECT * FROM empleados WHERE id = $1', [id]);
        if (oldEmpleado.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado' });
        }
        
        const result = await pool.query(
            'DELETE FROM empleados WHERE id = $1 RETURNING *',
            // 'UPDATE empleados SET estado = FALSE WHERE id = $1 RETURNING *',
            [empleadoId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Empleado no encontrado o ya inactivo' });
        }

        // REGISTRO EN BITÁCORA
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'empleados',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el empleado ${oldEmpleado.rows[0]?.nombre || id}`,
            dato: { antiguos: oldEmpleado.rows[0] }
        });
        
        return res.sendStatus(204);
    } catch (error) {
        console.error(`Error desactivando el empleado ${id}:`, error);
        next(error);
    }
};

// Exportar los controladores
module.exports = {
    getAllEmpleados,
    getEmpleado,
    getAllCargos,
    createEmpleado,
    updateEmpleado,
    deleteEmpleado
};