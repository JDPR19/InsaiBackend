const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAllProgramas = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT pf.*, tpf.nombre AS tipo_programa_nombre
            FROM programa_fito pf
            LEFT JOIN tipo_programa_fito tpf ON pf.tipo_programa_fito_id = tpf.id
            ORDER BY pf.id DESC
        `);

        const programas = result.rows;
        for (const programa of programas) {
            
            const empleadosRes = await pool.query(`
                SELECT e.id, e.nombre, e.apellido, e.cedula, c.nombre AS cargo
                FROM programa_empleado pe
                JOIN empleados e ON pe.empleado_id = e.id
                LEFT JOIN cargo c ON e.cargo_id = c.id
                WHERE pe.programa_fito_id = $1
            `, [programa.id]);

            programa.empleados_detalle = empleadosRes.rows
            .map(e => `${e.nombre} ${e.apellido} (Cédula: ${e.cedula}, Cargo: ${e.cargo || 'Sin cargo'})`)
            .join('<br>');

            programa.empleados = empleadosRes.rows;

            
            const plagasRes = await pool.query(`
                SELECT p.id, p.nombre, p.nombre_cientifico, t.nombre AS tipo_plaga
                FROM programa_plaga pp
                JOIN plaga_fito p ON pp.plaga_fito_id = p.id
                LEFT JOIN tipo_plaga_fito t ON p.tipo_plaga_fito_id = t.id
                WHERE pp.programa_fito_id = $1
            `, [programa.id]);

            programa.plagas_detalle = plagasRes.rows
            .map(p => `${p.nombre} (${p.nombre_cientifico}, Tipo: ${p.tipo_plaga || 'Sin tipo'})`)
            .join('<br>');

            programa.plagas = plagasRes.rows;
        }

        res.json(programas);
    } catch (error) {
        console.error('Error obteniendo programas fito:', error);
        next(error);
    }
};

const getPrograma = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT pf.*, tpf.nombre AS tipo_programa_nombre
            FROM programa_fito pf
            LEFT JOIN tipo_programa_fito tpf ON pf.tipo_programa_fito_id = tpf.id
            WHERE pf.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Programa no encontrado' });
        }

        const programa = result.rows[0];

        
        const empleadosRes = await pool.query(`
            SELECT e.id, e.nombre FROM programa_empleado pe
            JOIN empleados e ON pe.empleado_id = e.id
            WHERE pe.programa_fito_id = $1
        `, [programa.id]);
        programa.empleados = empleadosRes.rows;

        
        const plagasRes = await pool.query(`
            SELECT p.id, p.nombre FROM programa_plaga pp
            JOIN plaga_fito p ON pp.plaga_fito_id = p.id
            WHERE pp.programa_fito_id = $1
        `, [programa.id]);
        programa.plagas = plagasRes.rows;

        res.json(programa);
    } catch (error) {
        console.error('Error obteniendo programa fito por id:', error);
        next(error);
    }
};

const getTiposPrograma = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM tipo_programa_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de programa fito:', error);
        next(error);
    }
};

const getAllEmpleados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM empleados ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const getAllPlagas = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM plaga_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};



const createPrograma = async (req, res, next) => {
    const { nombre, descripcion, tipo_programa_fito_id, empleados_ids, plaga_fito_ids } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `INSERT INTO programa_fito (nombre, descripcion, tipo_programa_fito_id)
             VALUES ($1, $2, $3) RETURNING *`,
            [nombre, descripcion, tipo_programa_fito_id]
        );
        const programaId = result.rows[0].id;

        
        if (Array.isArray(empleados_ids)) {
            for (const empleado_id of empleados_ids) {
                await client.query(
                    `INSERT INTO programa_empleado (programa_fito_id, empleado_id) VALUES ($1, $2)`,
                    [programaId, empleado_id]
                );
            }
        }

        
        if (Array.isArray(plaga_fito_ids)) {
            for (const plaga_fito_id of plaga_fito_ids) {
                await client.query(
                    `INSERT INTO programa_plaga (programa_fito_id, plaga_fito_id) VALUES ($1, $2)`,
                    [programaId, plaga_fito_id]
                );
            }
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó el programa fito ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando programa fito:', error);
        next(error);
    } finally {
        client.release();
    }
};


const updatePrograma = async (req, res, next) => {
    const { id } = req.params;
    const { nombre, descripcion, tipo_programa_fito_id, empleados_ids, plaga_fito_ids } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            `UPDATE programa_fito SET nombre = $1, descripcion = $2, tipo_programa_fito_id = $3 WHERE id = $4`,
            [nombre, descripcion, tipo_programa_fito_id, id]
        );

        await client.query(`DELETE FROM programa_empleado WHERE programa_fito_id = $1`, [id]);
        await client.query(`DELETE FROM programa_plaga WHERE programa_fito_id = $1`, [id]);

        
        if (Array.isArray(empleados_ids)) {
            for (const empleado_id of empleados_ids) {
                await client.query(
                    `INSERT INTO programa_empleado (programa_fito_id, empleado_id) VALUES ($1, $2)`,
                    [id, empleado_id]
                );
            }
        }

        if (Array.isArray(plaga_fito_ids)) {
            for (const plaga_fito_id of plaga_fito_ids) {
                await client.query(
                    `INSERT INTO programa_plaga (programa_fito_id, plaga_fito_id) VALUES ($1, $2)`,
                    [id, plaga_fito_id]
                );
            }
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el programa fito ${nombre}`,
            dato: { nuevos: { id, nombre, descripcion, tipo_programa_fito_id, empleados_ids, plaga_fito_ids } }
        });

        await client.query('COMMIT');
        res.json({ message: 'Programa actualizado correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando programa fito:', error);
        next(error);
    } finally {
        client.release();
    }
};

const deletePrograma = async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM programa_empleado WHERE programa_fito_id = $1`, [id]);
        await client.query(`DELETE FROM programa_plaga WHERE programa_fito_id = $1`, [id]);
        await client.query(`DELETE FROM programa_fito WHERE id = $1`, [id]);
        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error eliminando programa fito:', error);
        next(error);
    } finally {
        client.release();
    }
};


module.exports = {
    getAllProgramas,
    getPrograma,
    getTiposPrograma,
    getAllPlagas,
    getAllEmpleados,
    createPrograma,
    updatePrograma,
    deletePrograma
};