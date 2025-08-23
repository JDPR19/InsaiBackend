const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');
const { crearYEmitirNotificacion } = require('../helpers/emitirNotificaciones');

// Listar todos los programas fitosanitarios
const getAllProgramasFito = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM programa_fito ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Listar programas asociados a una inspección
const getProgramasByInspeccion = async (req, res, next) => {
    try {
        const { inspeccion_est_id } = req.params;
        const result = await pool.query(`
            SELECT ipf.*, pf.nombre AS programa_nombre, tpf.nombre AS tipo_programa, ipf.estado,
            TO_CHAR(ipf.created_at, 'YYYY-MM-DD') AS fecha_asociacion
            FROM inspeccion_programa_fito ipf
            JOIN programa_fito pf ON ipf.programa_fito_id = pf.id
            LEFT JOIN tipo_programa_fito tpf ON pf.tipo_programa_fito_id = tpf.id
            WHERE ipf.inspeccion_est_id = $1
            ORDER BY ipf.created_at DESC
        `, [inspeccion_est_id]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Asociar un programa a una inspección
const addProgramaToInspeccion = async (req, res, next) => {
    try {
        const { inspeccion_est_id, programa_fito_id, observacion, estado } = req.body;
        if (!inspeccion_est_id || !programa_fito_id) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        const result = await pool.query(`
            INSERT INTO inspeccion_programa_fito (inspeccion_est_id, programa_fito_id, observacion, estado)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [inspeccion_est_id, programa_fito_id, observacion || null, estado || 'seguimiento']);

        // Si el estado es final, los triggers de la BD sincronizan los estados en todo el ciclo
        if (['finalizado', 'cuarentena', 'aprobada', 'rechazada'].includes(result.rows[0].estado)) {
            await crearYEmitirNotificacion(req, null, {
                mensaje: `El ciclo de inspección ha sido cerrado con estado: ${result.rows[0].estado}.`
            });
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Seguimiento',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se asoció el programa ${programa_fito_id} a la inspección ${inspeccion_est_id} en seguimiento`,
            dato: { nuevos: result.rows[0] }
        });

        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

// Actualizar programa asociado a inspección
const updateProgramaInInspeccion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { observacion, estado } = req.body;
        const oldRes = await pool.query('SELECT * FROM inspeccion_programa_fito WHERE id = $1', [id]);
        const result = await pool.query(
            `UPDATE inspeccion_programa_fito SET observacion = $1, estado = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
            [observacion, estado, id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'No encontrado' });
        }

        // Si el estado es final, los triggers de la BD sincronizan los estados en todo el ciclo
        if (['finalizado', 'cuarentena', 'aprobada', 'rechazada'].includes(result.rows[0].estado)) {
            await crearYEmitirNotificacion(req, null, {
                mensaje: `El ciclo de inspección ha sido cerrado con estado: ${result.rows[0].estado}.`
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Seguimiento',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó el programa asociado a la inspección ${id} en seguimiento`,
            dato: { antiguos: oldRes.rows[0], nuevos: result.rows[0] }
        });

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

// Eliminar programa asociado a inspección
const deleteProgramaFromInspeccion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const oldRes = await pool.query('SELECT * FROM inspeccion_programa_fito WHERE id = $1', [id]);
        await pool.query(`DELETE FROM inspeccion_programa_fito WHERE id = $1`, [id]);
        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Seguimiento',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó el programa asociado a la inspección ${id} en seguimiento`,
            dato: { antiguos: oldRes.rows[0] }
        });
        res.sendStatus(204);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getProgramasByInspeccion,
    getAllProgramasFito,
    addProgramaToInspeccion,
    updateProgramaInInspeccion,
    deleteProgramaFromInspeccion
};