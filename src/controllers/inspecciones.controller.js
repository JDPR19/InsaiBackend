const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');
const fs = require('fs');
const path = require('path');

// Listar todas las inspecciones
const getAllInspecciones = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ie.*, tif.nombre AS tipo_inspeccion_nombre, p.nombre AS planificacion_nombre,
            TO_CHAR(ie.fecha_inspeccion, 'YYYY-MM-DD') AS fecha_inspeccion, 
            TO_CHAR(ie.fecha_notificacion, 'YYYY-MM-DD') AS fecha_notificacion, 
            TO_CHAR(ie.fecha_proxima_inspeccion, 'YYYY-MM-DD') AS fecha_proxima_inspeccion
            FROM inspeccion_est ie
            LEFT JOIN tipo_inspeccion_fito tif ON ie.tipo_inspeccion_fito_id = tif.id
            LEFT JOIN planificacion p ON ie.planificacion_id = p.id
            ORDER BY ie.id DESC
        `);

        const inspecciones = result.rows;

        for (const inspeccion of inspecciones) {
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

// Obtener inspección por ID
const getInspeccionesById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                ie.*, 
                tif.nombre AS tipo_inspeccion_nombre, 
                plan.id AS planificacion_id,
                plan.nombre AS planificacion_nombre,
                plan.fecha_programada AS planificacion_fecha,
                plan.estado AS planificacion_estado,
                TO_CHAR(ie.fecha_notificacion, 'YYYY-MM-DD') AS fecha_notificacion, 
                TO_CHAR(ie.fecha_inspeccion, 'YYYY-MM-DD') AS fecha_inspeccion, 
                TO_CHAR(ie.fecha_proxima_inspeccion, 'YYYY-MM-DD') AS fecha_proxima_inspeccion,
                prop.id AS propiedad_id,
                prop.nombre AS propiedad_nombre,
                prop.ubicación AS propiedad_ubicacion,
                prop.rif AS propiedad_rif,
                prop.hectareas AS propiedad_hectareas,
                prod.id AS productor_id,
                prod.nombre AS productor_nombre,
                prod.apellido AS productor_apellido,
                prod.cedula AS productor_cedula,
                -- Programas asociados a la inspección
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', ipf.id,
                            'programa_id', pf.id,
                            'nombre', pf.nombre,
                            'tipo_programa', tpf.nombre,
                            'observacion', ipf.observacion,
                            'created_at', ipf.created_at
                        )
                    ) FILTER (WHERE ipf.id IS NOT NULL), '[]'::json)
                    FROM inspeccion_programa_fito ipf
                    JOIN programa_fito pf ON ipf.programa_fito_id = pf.id
                    LEFT JOIN tipo_programa_fito tpf ON pf.tipo_programa_fito_id = tpf.id
                    WHERE ipf.inspeccion_est_id = ie.id
                ) AS programas_asociados,
                -- Empleados responsables de la planificación
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', e.id,
                            'nombre', e.nombre,
                            'apellido', e.apellido,
                            'cedula', e.cedula,
                            'cargo', c.nombre
                        )
                    ) FILTER (WHERE e.id IS NOT NULL), '[]'::json)
                    FROM planificacion_empleado pe
                    JOIN empleados e ON pe.empleado_id = e.id
                    LEFT JOIN cargo c ON e.cargo_id = c.id
                    WHERE pe.planificacion_id = plan.id
                ) AS empleados_responsables,
                -- Imágenes asociadas a la inspección
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', ii.id,
                            'imagen', ii.imagen
                        )
                    ) FILTER (WHERE ii.id IS NOT NULL), '[]'::json)
                    FROM inspeccion_imagen ii
                    WHERE ii.inspeccion_est_id = ie.id
                ) AS imagenes
            FROM inspeccion_est ie
            LEFT JOIN tipo_inspeccion_fito tif ON ie.tipo_inspeccion_fito_id = tif.id
            LEFT JOIN planificacion plan ON ie.planificacion_id = plan.id
            LEFT JOIN solicitud sol ON plan.solicitud_id = sol.id
            LEFT JOIN propiedad prop ON sol.propiedad_id = prop.id
            LEFT JOIN productor prod ON prop.productor_id = prod.id
            WHERE ie.id = $1;
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Inspección no encontrada' });
        }

        const inspeccion = result.rows[0];
        res.json(inspeccion);
    } catch (error) {
        console.error('Error obteniendo inspección_est por id:', error);
        next(error);
    }
};

// Crear inspección (con imágenes)
const createInspecciones = async (req, res, next) => {
    const {
        n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
        responsable_e, cedula_res, tlf, norte, este, zona, correo,
        finalidad1 = null, finalidad2 = null, finalidad3 = null, finalidad4 = null, finalidad5 = null, finalidad6 = null,
        aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
        tipo_inspeccion_fito_id, planificacion_id
    } = req.body;

    // Manejo de decimales/float
    const norteRaw = Array.isArray(norte) ? norte[0] : norte;
    const esteRaw = Array.isArray(este) ? este[0] : este;
    const zonaRaw = Array.isArray(zona) ? zona[0] : zona;

    const norteVal = norteRaw && typeof norteRaw === 'string' ? parseFloat(norteRaw.replace(',', '.')) : (norteRaw ? parseFloat(norteRaw) : null);
    const esteVal = esteRaw && typeof esteRaw === 'string' ? parseFloat(esteRaw.replace(',', '.')) : (esteRaw ? parseFloat(esteRaw) : null);
    const zonaVal = zonaRaw && typeof zonaRaw === 'string' ? parseFloat(zonaRaw.replace(',', '.')) : (zonaRaw ? parseFloat(zonaRaw) : null);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            INSERT INTO inspeccion_est (
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
                responsable_e, cedula_res, tlf, norte, este, zona, correo,
                finalidad1, finalidad2, finalidad3, finalidad4, finalidad5,
                finalidad6, aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
                tipo_inspeccion_fito_id, planificacion_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
            ) RETURNING *
        `, [
            n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
            responsable_e, cedula_res, tlf, norteVal, esteVal, zonaVal, correo,
            finalidad1, finalidad2, finalidad3, finalidad4, finalidad5, finalidad6,
            aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
            tipo_inspeccion_fito_id, planificacion_id
        ]);
        const inspeccionEstId = result.rows[0].id;

        // Guardar imágenes
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

// Actualizar inspección (con imágenes)
const updateInspecciones = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
            responsable_e, cedula_res, correo, tlf, norte, este, zona, aspectos, finalidad1, finalidad2,
            finalidad3, finalidad4, finalidad5, finalidad6, ordenamientos, fecha_proxima_inspeccion,
            estado, tipo_inspeccion_fito_id, planificacion_id, imagenesAEliminar = []
        } = req.body;

        // Manejo de decimales/float
        const norteRaw = Array.isArray(norte) ? norte[0] : norte;
        const esteRaw = Array.isArray(este) ? este[0] : este;
        const zonaRaw = Array.isArray(zona) ? zona[0] : zona;

        const norteVal = norteRaw && typeof norteRaw === 'string' ? parseFloat(norteRaw.replace(',', '.')) : (norteRaw ? parseFloat(norteRaw) : null);
        const esteVal = esteRaw && typeof esteRaw === 'string' ? parseFloat(esteRaw.replace(',', '.')) : (esteRaw ? parseFloat(esteRaw) : null);
        const zonaVal = zonaRaw && typeof zonaRaw === 'string' ? parseFloat(zonaRaw.replace(',', '.')) : (zonaRaw ? parseFloat(zonaRaw) : null);

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
                tipo_inspeccion_fito_id = $24,
                planificacion_id = $25
            WHERE id = $26`,
            [
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
                responsable_e, cedula_res, correo, tlf, norteVal, esteVal, zonaVal, aspectos, finalidad1, finalidad2,
                finalidad3, finalidad4, finalidad5, finalidad6, ordenamientos, fecha_proxima_inspeccion,
                estado, tipo_inspeccion_fito_id, planificacion_id, id
            ]
        );

        // Eliminar imágenes seleccionadas
        if (imagenesAEliminar && imagenesAEliminar.length > 0) {
            for (const imgName of imagenesAEliminar) {
                const filePath = path.join(__dirname, '../../uploads/inspeccion_est', imgName);
                if (fs.existsSync(filePath)) {
                    try { fs.unlinkSync(filePath); } catch (err) { console.error('No se pudo borrar:', filePath, err); }
                }
                await client.query(
                    `DELETE FROM inspeccion_imagen WHERE inspeccion_est_id = $1 AND imagen = $2`,
                    [id, imgName]
                );
            }
        }

        // Agregar nuevas imágenes
        if (req.files && req.files.length > 0) {
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

// Eliminar inspección (y sus imágenes)
const deleteInspecciones = async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Eliminar imágenes físicas
        const imagenesRes = await client.query(
            `SELECT imagen FROM inspeccion_imagen WHERE inspeccion_est_id = $1`,
            [id]
        );
        for (const row of imagenesRes.rows) {
            const filePath = path.join(__dirname, '../../uploads/inspeccion_est', row.imagen);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (err) { console.error('No se pudo borrar:', filePath, err); }
            }
        }
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

// Obtener imágenes de una inspección
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

// Listar tipos de inspección
const getTiposInspeccion = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM tipo_inspeccion_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de inspección:', error);
        next(error);
    }
};

// Listar planificaciones
const getAllPlanificaciones = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.*, s.descripcion AS solicitud_descripcion, s.estado AS solicitud_estado
            FROM planificacion p
            LEFT JOIN solicitud s ON p.solicitud_id = s.id
            ORDER BY p.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo planificaciones:', error);
        next(error);
    }
};

module.exports = {
    getAllInspecciones,
    getInspeccionesById,
    createInspecciones,
    updateInspecciones,
    deleteInspecciones,
    getAllImagenes,
    getTiposInspeccion,
    getAllPlanificaciones
};