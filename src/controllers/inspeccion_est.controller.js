const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');
const fs = require('fs');
const path = require('path');


const getAllInspeccionEst = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ie.*, tif.nombre AS tipo_inspeccion_nombre, p.nombre AS propiedad_nombre,
            TO_CHAR(ie.fecha_inspeccion, 'YYYY-MM-DD') AS fecha_inspeccion, 
            TO_CHAR(ie.fecha_notificacion, 'YYYY-MM-DD') AS fecha_notificacion, 
            TO_CHAR(ie.fecha_proxima_inspeccion, 'YYYY-MM-DD') AS fecha_proxima_inspeccion
            FROM inspeccion_est ie
            LEFT JOIN tipo_inspeccion_fito tif ON ie.tipo_inspeccion_fito_id = tif.id
            LEFT JOIN propiedad p ON ie.propiedad_id = p.id
            ORDER BY ie.id DESC
        `);

        const inspecciones = result.rows;

        for (const inspeccion of inspecciones) {
            // Empleados
            const empleadosRes = await pool.query(`
                SELECT e.id, e.nombre, e.apellido, e.cedula
                FROM inspeccion_empleado iee
                JOIN empleados e ON iee.empleado_id = e.id
                WHERE iee.inspeccion_est_id = $1
            `, [inspeccion.id]);
            inspeccion.empleados = empleadosRes.rows;

            // Programas
            const programasRes = await pool.query(`
                SELECT p.id, p.nombre
                FROM inspeccion_programa ip
                JOIN programa_fito p ON ip.programa_fito_id = p.id
                WHERE ip.inspeccion_est_id = $1
            `, [inspeccion.id]);
            inspeccion.programas = programasRes.rows;

            // Imágenes
            const imagenesRes = await pool.query(`
                SELECT id, imagen FROM inspeccion_imagen WHERE inspeccion_est_id = $1
            `, [inspeccion.id]);
            inspeccion.imagenes = imagenesRes.rows;
        }

        res.json(inspecciones);
    } catch (error) {
        console.error('Error obteniendo inspecciones_est:', error);
        next(error);
    }
};


const getInspeccionEstById = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(`
            SELECT ie.*, 
                tif.nombre AS tipo_inspeccion_nombre, 
                p.nombre AS propiedad_nombre, 
                TO_CHAR(ie.fecha_notificacion, 'YYYY-MM-DD') AS fecha_notificacion, 
                TO_CHAR(ie.fecha_inspeccion, 'YYYY-MM-DD') AS fecha_inspeccion, 
                TO_CHAR(ie.fecha_proxima_inspeccion, 'YYYY-MM-DD') AS fecha_proxima_inspeccion
            FROM inspeccion_est ie
            LEFT JOIN tipo_inspeccion_fito tif ON ie.tipo_inspeccion_fito_id = tif.id
            LEFT JOIN propiedad p ON ie.propiedad_id = p.id
            WHERE ie.id = $1;

        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inspección no encontrada' });
        }

        const inspeccion = result.rows[0];


        const empleadosRes = await pool.query(`
            SELECT e.id, e.nombre, e.apellido, e.cedula
            FROM inspeccion_empleado iee
            JOIN empleados e ON iee.empleado_id = e.id
            WHERE iee.inspeccion_est_id = $1
        `, [inspeccion.id]);
        inspeccion.empleados = empleadosRes.rows;


        const programasRes = await pool.query(`
            SELECT p.id, p.nombre
            FROM inspeccion_programa ip
            JOIN programa_fito p ON ip.programa_fito_id = p.id
            WHERE ip.inspeccion_est_id = $1
        `, [inspeccion.id]);
        inspeccion.programas = programasRes.rows;


        const imagenesRes = await pool.query(`
            SELECT id, imagen FROM inspeccion_imagen WHERE inspeccion_est_id = $1
        `, [inspeccion.id]);
        inspeccion.imagenes = imagenesRes.rows;

        inspeccion.fecha_notificacion = inspeccion.fecha_notificacion || null;
        inspeccion.fecha_inspeccion = inspeccion.fecha_inspeccion || null;
        inspeccion.fecha_proxima_inspeccion = inspeccion.fecha_proxima_inspeccion || null;
        inspeccion.empleados = empleadosRes.rows.length ? empleadosRes.rows : [];
        inspeccion.programas = programasRes.rows.length ? programasRes.rows : [];
        inspeccion.imagenes = imagenesRes.rows.length ? imagenesRes.rows : [];

        res.json(inspeccion);
    } catch (error) {
        console.error('Error obteniendo inspección_est por id:', error);
        next(error);
    }
};


const createInspeccionEst = async (req, res, next) => {
    const {
        n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
        responsable_e, cedula_res, tlf, norte, este, zona, correo,
        finalidad1 = null, finalidad2 = null, finalidad3 = null, finalidad4 = null, finalidad5 = null, finalidad6 = null, // ← Agregado aquí
        aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
        tipo_inspeccion_fito_id, propiedad_id, 
        empleados_ids = [], programas_ids = [], aplica_programa 
    } = req.body;
    console.log('Valores recibidos:', req.body);

    
    const client = await pool.connect();
    try {
        const norteRaw = Array.isArray(req.body.norte) ? req.body.norte[0] : req.body.norte;
        const esteRaw = Array.isArray(req.body.este) ? req.body.este[0] : req.body.este;
        const norte = norteRaw && typeof norteRaw === 'string' ? parseFloat(norteRaw.replace(',', '.')) : (norteRaw ? parseFloat(norteRaw) : null);
        const este = esteRaw && typeof esteRaw === 'string' ? parseFloat(esteRaw.replace(',', '.')) : (esteRaw ? parseFloat(esteRaw) : null);
        const fecha_notificacion = req.body.fecha_notificacion && req.body.fecha_notificacion !== '' ? req.body.fecha_notificacion : null;
        const fecha_inspeccion = req.body.fecha_inspeccion && req.body.fecha_inspeccion !== '' ? req.body.fecha_inspeccion : null;
        const fecha_proxima_inspeccion = req.body.fecha_proxima_inspeccion && req.body.fecha_proxima_inspeccion !== '' ? req.body.fecha_proxima_inspeccion : null;


        await client.query('BEGIN');
        const result = await client.query(`
            INSERT INTO inspeccion_est (
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
                responsable_e, cedula_res, tlf, norte, este, zona, correo,
                finalidad1, finalidad2, finalidad3, finalidad4, finalidad5,
                finalidad6, aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
                tipo_inspeccion_fito_id, propiedad_id, aplica_programa
            ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
            ) RETURNING *
        `, [
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
            responsable_e, cedula_res, tlf, norte, este, zona, correo,
            finalidad1, finalidad2, finalidad3, finalidad4, finalidad5, finalidad6, 
            aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
            tipo_inspeccion_fito_id, propiedad_id, aplica_programa
        ]);
        const inspeccionEstId = result.rows[0].id;
        
        let empleados_ids = req.body.empleados_ids;
        let programas_ids = req.body.programas_ids;
        if (!Array.isArray(empleados_ids)) empleados_ids = empleados_ids ? [empleados_ids] : [];
        if (!Array.isArray(programas_ids)) programas_ids = programas_ids ? [programas_ids] : [];
        // Ahora siempre son arrays, aunque solo haya uno
        for (const empleado_id of empleados_ids) {
            await client.query(
                `INSERT INTO inspeccion_empleado (inspeccion_est_id, empleado_id) VALUES ($1, $2)`,
                [inspeccionEstId || id, empleado_id]
            );
        }
        for (const programa_id of programas_ids) {
            await client.query(
                `INSERT INTO inspeccion_programa (inspeccion_est_id, programa_fito_id) VALUES ($1, $2)`,
                [inspeccionEstId || id, programa_id]
            );
        }

    
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await client.query(
                    `INSERT INTO inspeccion_imagen (inspeccion_est_id, imagen) VALUES ($1, $2)`,
                    [inspeccionEstId, file.filename]
                );
            }
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'inspeccion',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la inspección ${codigo_inspeccion}`,
            dato: { nuevos: result.rows[0] }
        });

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando inspección_est:', error);
        next(error);
    } finally {
        client.release();
    }
};


const updateInspeccionEst = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;

        const {
            n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
            responsable_e, cedula_res, correo, tlf, norte, este, zona, aspectos, finalidad1, finalidad2,
            finalidad3, finalidad4, finalidad5, finalidad6, ordenamientos, fecha_proxima_inspeccion,
            estado, aplica_programa, tipo_inspeccion_fito_id, propiedad_id, imagenesAEliminar = []
        } = req.body;

        let empleados_ids = req.body.empleados_ids;
        let programas_ids = req.body.programas_ids;
        if (!Array.isArray(empleados_ids)) empleados_ids = empleados_ids ? [empleados_ids] : [];
        if (!Array.isArray(programas_ids)) programas_ids = programas_ids ? [programas_ids] : [];

        const norteRaw = Array.isArray(norte) ? norte[0] : norte;
        const esteRaw = Array.isArray(este) ? este[0] : este;
        const zonaRaw = Array.isArray(zona) ? zona[0] : zona;

        const norteVal = norteRaw && typeof norteRaw === 'string' ? parseFloat(norteRaw.replace(',', '.')) : (norteRaw ? parseFloat(norteRaw) : null);
        const esteVal = esteRaw && typeof esteRaw === 'string' ? parseFloat(esteRaw.replace(',', '.')) : (esteRaw ? parseFloat(esteRaw) : null);
        const zonaVal = zonaRaw && typeof zonaRaw === 'string' ? zonaRaw : (zonaRaw ? zonaRaw : null);

        await client.query('BEGIN');

        await client.query(
            `UPDATE inspeccion_est SET
                n_control = $1,
                codigo_inspeccion = $2,
                area = $3,
                fecha_notificacion = $4,
                fecha_inspeccion = $5,
                hora_inspeccion = $6,
                responsable_e = $7,
                cedula_res = $8,
                correo = $9,
                tlf = $10,
                norte = $11,
                este = $12,
                zona = $13,
                aspectos = $14,
                finalidad1 = $15,
                finalidad2 = $16,
                finalidad3 = $17,
                finalidad4 = $18,
                finalidad5 = $19,
                finalidad6 = $20,
                ordenamientos = $21,
                fecha_proxima_inspeccion = $22,
                estado = $23,
                aplica_programa = $24,
                tipo_inspeccion_fito_id = $25,
                propiedad_id = $26
            WHERE id = $27`,
            [
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
                responsable_e, cedula_res, correo, tlf, norteVal, esteVal, zonaVal, aspectos, finalidad1, finalidad2,
                finalidad3, finalidad4, finalidad5, finalidad6, ordenamientos, fecha_proxima_inspeccion,
                estado, aplica_programa, tipo_inspeccion_fito_id, propiedad_id, id
            ]
        );

        await client.query(`DELETE FROM inspeccion_empleado WHERE inspeccion_est_id = $1`, [id]);
        await client.query(`DELETE FROM inspeccion_programa WHERE inspeccion_est_id = $1`, [id]);

        for (const empleado_id of empleados_ids) {
            await client.query(
                `INSERT INTO inspeccion_empleado (inspeccion_est_id, empleado_id) VALUES ($1, $2)`,
                [id, empleado_id]
            );
        }

        for (const programa_id of programas_ids) {
            await client.query(
                `INSERT INTO inspeccion_programa (inspeccion_est_id, programa_fito_id) VALUES ($1, $2)`,
                [id, programa_id]
            );
        }

        if (imagenesAEliminar && imagenesAEliminar.length > 0) {
            for (const imgName of imagenesAEliminar) {
                // Elimina archivo físico
                const filePath = path.join(__dirname, '../../uploads/inspeccion_est', imgName);
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (err) { console.error('No se pudo borrar:', filePath, err); }
                }
                // Elimina registro en BD
                await client.query(
                    `DELETE FROM inspeccion_imagen WHERE inspeccion_est_id = $1 AND imagen = $2`,
                    [id, imgName]
                );
            }
        }

        
        if (req.files && req.files.length > 0) {
            const oldImagesRes = await client.query(
                `SELECT imagen FROM inspeccion_imagen WHERE inspeccion_est_id = $1`,
                [id]
            );

            for (const row of oldImagesRes.rows) {
                const filePath = path.join(__dirname, '../../uploads/inspeccion_est', row.imagen);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (err) {
                        console.error('No se pudo borrar:', filePath, err);
                    }
                }
            }

            await client.query(`DELETE FROM inspeccion_imagen WHERE inspeccion_est_id = $1`, [id]);
            
            for (const file of req.files) {
                await client.query(
                    `INSERT INTO inspeccion_imagen (inspeccion_est_id, imagen) VALUES ($1, $2)`,
                    [id, file.filename]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ message: 'Inspección actualizada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando inspección:', error);
        next(error);
    } finally {
        client.release();
    }
};


const deleteInspeccionEst = async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM inspeccion_empleado WHERE inspeccion_est_id = $1`, [id]);
        await client.query(`DELETE FROM inspeccion_programa WHERE inspeccion_est_id = $1`, [id]);
        await client.query(`DELETE FROM inspeccion_imagen WHERE inspeccion_est_id = $1`, [id]);
        await client.query(`DELETE FROM inspeccion_est WHERE id = $1`, [id]);

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'inspeccion',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó la inspección con ID ${id}`,
            dato: { eliminados: { id } }
        });

        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error eliminando inspección_est:', error);
        next(error);
    } finally {
        client.release();
    }
};


const getAllEmpleados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre, apellido FROM empleados ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo empleados:', error);
        next(error);
    }
};


const getAllProgramas = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM programa_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo programas:', error);
        next(error);
    }
};


const getAllImagenes = async (req, res, next) => {
    try {
        const { inspeccion_est_id } = req.params;
        const result = await pool.query(`
            SELECT id, imagen FROM inspeccion_imagen WHERE inspeccion_est_id = $1
        `, [inspeccion_est_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo imágenes:', error);
        next(error);
    }
};


const getTiposInspeccion = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM tipo_inspeccion_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de inspección:', error);
        next(error);
    }
};


const getPropiedades = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM propiedad ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo propiedades:', error);
        next(error);
    }
};


const getEstados = async (req, res, next) => {
    try {
        const estados = [
            { value: 'Pendiente', label: 'Pendiente' },
            { value: 'En Proceso', label: 'En Proceso' },
            { value: 'Aprobada', label: 'Aprobada' },
            { value: 'Rechazada', label: 'Rechazada' }
        ];
        res.json(estados);
    } catch (error) {
        console.error('Error obteniendo estados:', error);
        next(error);
    }
};

module.exports = {
    getAllInspeccionEst,
    getInspeccionEstById,
    createInspeccionEst,
    updateInspeccionEst,
    deleteInspeccionEst,
    getAllEmpleados,
    getAllImagenes,
    getAllProgramas,
    getTiposInspeccion,
    getPropiedades,
    getEstados
};