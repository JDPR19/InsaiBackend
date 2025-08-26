const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');
const { crearYEmitirNotificacion } = require('../helpers/emitirNotificaciones');
const fs = require('fs');
const path = require('path');

// Listar todas las inspecciones con datos relacionados
const getAllInspecciones = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT ie.*, 
                p.id AS planificacion_id, 
                p.fecha_programada AS planificacion_fecha,
                tif.id AS tipo_inspeccion_fito_id,
                tif.nombre AS tipo_inspeccion_nombre,
                TO_CHAR(ie.fecha_inspeccion, 'YYYY-MM-DD') AS fecha_inspeccion, 
                TO_CHAR(ie.fecha_notificacion, 'YYYY-MM-DD') AS fecha_notificacion, 
                TO_CHAR(ie.fecha_proxima_inspeccion, 'YYYY-MM-DD') AS fecha_proxima_inspeccion,
                (
                    SELECT COALESCE(json_agg(h), '[]'::json)
                    FROM historial_estado h
                    WHERE h.entidad = 'inspeccion_est' AND h.entidad_id = ie.id
                ) AS historial_estados
            FROM inspeccion_est ie
            LEFT JOIN planificacion p ON ie.planificacion_id = p.id
            LEFT JOIN tipo_inspeccion_fito tif ON p.tipo_inspeccion_fito_id = tif.id
            ORDER BY ie.id DESC
        `);

        const inspecciones = result.rows;

        for (const inspeccion of inspecciones) {
            // Imágenes
            const imagenesRes = await pool.query(`
                SELECT id, imagen FROM inspeccion_imagen WHERE inspeccion_est_id = $1
            `, [inspeccion.id]);
            inspeccion.imagenes = imagenesRes.rows;

            // Finalidades
            const finalidadesRes = await pool.query(`
                SELECT fi.id, fc.nombre AS finalidad, fi.objetivo
                FROM finalidad_inspeccion fi
                JOIN finalidad_catalogo fc ON fi.finalidad_id = fc.id
                WHERE fi.inspeccion_est_id = $1
            `, [inspeccion.id]);
            inspeccion.finalidades = finalidadesRes.rows;
        }

        res.json(inspecciones);
    } catch (error) {
        console.error('Error obteniendo inspecciones_est:', error);
        next(error);
    }
};

// Obtener inspección por ID con todos los datos relacionados
const getInspeccionesById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT 
                ie.*, 
                tif.nombre AS tipo_inspeccion_nombre,
                solicitud.id AS solicitud_id,
                solicitud.codigo AS solicitud_codigo, 
                plan.id AS planificacion_id,
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
                (
                    SELECT COALESCE(json_agg(h), '[]'::json)
                    FROM historial_estado h
                    WHERE h.entidad = 'inspeccion_est' AND h.entidad_id = ie.id
                ) AS historial_estados,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', ipf.id,
                            'programa_id', pf.id,
                            'nombre', pf.nombre,
                            'tipo_programa', tpf.nombre,
                            'observacion', ipf.observacion,
                            'estado', ipf.estado,
                            'created_at', ipf.created_at
                        )
                    ) FILTER (WHERE ipf.id IS NOT NULL), '[]'::json)
                    FROM inspeccion_programa_fito ipf
                    JOIN programa_fito pf ON ipf.programa_fito_id = pf.id
                    LEFT JOIN tipo_programa_fito tpf ON pf.tipo_programa_fito_id = tpf.id
                    WHERE ipf.inspeccion_est_id = ie.id
                ) AS programas_asociados,
                (
                    SELECT COALESCE(json_agg(
                        json_build_object(
                            'id', fi.id,
                            'finalidad', fc.nombre,
                            'objetivo', fi.objetivo
                        )
                    ) FILTER (WHERE fi.id IS NOT NULL), '[]'::json)
                    FROM finalidad_inspeccion fi
                    JOIN finalidad_catalogo fc ON fi.finalidad_id = fc.id
                    WHERE fi.inspeccion_est_id = ie.id
                ) AS finalidades,
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

// Crear inspección (con imágenes y finalidades)
const createInspecciones = async (req, res, next) => {
    const {
        n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
        responsable_e, cedula_res, tlf, norte, este, zona, correo,
        aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
        planificacion_id,
        finalidades // Array de { finalidad_id, objetivo }
    } = req.body;

    const norteVal = norte ? parseFloat(String(norte).replace(',', '.')) : null;
    const esteVal = este ? parseFloat(String(este).replace(',', '.')) : null;
    const zonaVal = zona ? parseFloat(String(zona).replace(',', '.')) : null;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(`
            INSERT INTO inspeccion_est (
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
                responsable_e, cedula_res, tlf, norte, este, zona, correo,
                aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
                planificacion_id
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
            ) RETURNING *
        `, [
            n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
            responsable_e, cedula_res, tlf, norteVal, esteVal, zonaVal, correo,
            aspectos, ordenamientos, fecha_proxima_inspeccion, estado,
            planificacion_id
        ]);
        const inspeccionEstId = result.rows[0].id;
        const codigoInspeccion = result.rows[0].codigo_inspeccion || inspeccionEstId;

        // Guardar imágenes
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                await client.query(
                    `INSERT INTO inspeccion_imagen (inspeccion_est_id, imagen) VALUES ($1, $2)`,
                    [inspeccionEstId, file.filename]
                );
            }
        }

        // Guardar finalidades
        if (Array.isArray(finalidades)) {
            for (const fin of finalidades) {
                await client.query(
                    `INSERT INTO finalidad_inspeccion (inspeccion_est_id, finalidad_id, objetivo) VALUES ($1, $2, $3)`,
                    [inspeccionEstId, fin.finalidad_id, fin.objetivo]
                );
            }
        }
        // Notificación por registro de inspección
        const usuario_id = req.user?.id;
        if (usuario_id) {
            await crearYEmitirNotificacion(req, null, {
                usuario_id,
                mensaje: `Se ha registrado una nueva inspección con código ${codigoInspeccion}.`
            });
        }

        // Notificación si el estado es especial
        if (['finalizada', 'cuarentena', 'rechazada'].includes(estado)) {
            await crearYEmitirNotificacion(req, null, {
                usuario_id,
                mensaje: `La inspección ${codigoInspeccion} ha cambiado a estado: ${estado}.`
            });
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Inspecciones',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la inspección ${codigoInspeccion}`,
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

// Actualizar inspección (con imágenes y finalidades)
const updateInspecciones = async (req, res, next) => {
    const client = await pool.connect();
    try {
        const { id } = req.params;
        const {
            n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
            responsable_e, cedula_res, correo, tlf, norte, este, zona, aspectos,
            ordenamientos, fecha_proxima_inspeccion, estado, planificacion_id,
            finalidades, imagenesAEliminar = []
        } = req.body;

        const norteVal = norte ? parseFloat(String(norte).replace(',', '.')) : null;
        const esteVal = este ? parseFloat(String(este).replace(',', '.')) : null;
        const zonaVal = zona ? parseFloat(String(zona).replace(',', '.')) : null;

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
                ordenamientos = $15,
                fecha_proxima_inspeccion = $16,
                estado = $17,
                planificacion_id = $18,
                updated_at = NOW()
            WHERE id = $19`,
            [
                n_control, codigo_inspeccion, area, fecha_notificacion, fecha_inspeccion, hora_inspeccion,
                responsable_e, cedula_res, correo, tlf, norteVal, esteVal, zonaVal, aspectos,
                ordenamientos, fecha_proxima_inspeccion, estado, planificacion_id, id
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

        // Actualizar finalidades
        await client.query(`DELETE FROM finalidad_inspeccion WHERE inspeccion_est_id = $1`, [id]);
        if (Array.isArray(finalidades)) {
            for (const fin of finalidades) {
                await client.query(
                    `INSERT INTO finalidad_inspeccion (inspeccion_est_id, finalidad_id, objetivo) VALUES ($1, $2, $3)`,
                    [id, fin.finalidad_id, fin.objetivo]
                );
            }
        }

        // Notificación si el estado es especial
        const codigoInspeccion = codigo_inspeccion || id;
        if (['finalizada', 'cuarentena', 'rechazada'].includes(estado)) {
            await crearYEmitirNotificacion(req, null, {
                mensaje: `La inspección ${codigoInspeccion} ha cambiado a estado: ${estado}.`
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Inspecciones',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la inspección ${codigoInspeccion}`,
            dato: { nuevos: { id } }
        });

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

// Eliminar inspección (y sus imágenes y finalidades)
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
        await client.query(`DELETE FROM finalidad_inspeccion WHERE inspeccion_est_id = $1`, [id]);
        await client.query(`DELETE FROM inspeccion_est WHERE id = $1`, [id]);

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Inspecciones',
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
            SELECT p.*, s.descripcion AS solicitud_descripcion, s.estado AS solicitud_estado, s.codigo AS solicitud_codigo
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
    getAllPlanificaciones,
};