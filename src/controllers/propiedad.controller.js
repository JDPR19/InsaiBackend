const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

// Obtener todas las propiedades con sus cultivos asociados
const getAllPropiedades = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT p.*, 
                tp.nombre AS tipo_propiedad_nombre,
                s.nombre AS sector_nombre,
                s.id AS sector_id,
                par.nombre AS parroquia_nombre,
                par.id AS parroquia_id,
                mun.nombre AS municipio_nombre,
                mun.id AS municipio_id,
                edo.nombre AS estado_nombre,
                edo.id AS estado_id,
                prod.nombre AS productor_nombre,
                prod.apellido AS productor_apellido,
                prod.codigo AS productor_codigo,
                prod.cedula AS productor_cedula
            FROM propiedad p
            LEFT JOIN tipo_propiedad tp ON p.tipo_propiedad_id = tp.id
            LEFT JOIN sector s ON p.sector_id = s.id
            LEFT JOIN parroquia par ON s.parroquia_id = par.id
            LEFT JOIN municipio mun ON par.municipio_id = mun.id
            LEFT JOIN estado edo ON mun.estado_id = edo.id
            LEFT JOIN productor prod ON p.productor_id = prod.id
            ORDER BY p.id DESC
        `);

        const propiedades = result.rows;
        for (const propiedad of propiedades) {
            
            const cultivosRes = await pool.query(`
                SELECT c.id, c.nombre, c.nombre_cientifico, tc.nombre AS tipo_cultivo
                FROM propiedad_cultivo pc
                JOIN cultivo c ON pc.cultivo_id = c.id
                LEFT JOIN tipo_cultivo tc ON c.tipo_cultivo_id = tc.id
                WHERE pc.propiedad_id = $1
            `, [propiedad.id]);

            propiedad.cultivos_detalle = cultivosRes.rows.map(c => `${c.nombre} (${c.nombre_cientifico || 'Sin nombre científico'}, Tipo: ${c.tipo_cultivo || 'Sin tipo'})`).join('<br>');
            propiedad.cultivos = cultivosRes.rows;
        }

        res.json(propiedades);
    } catch (error) {
        console.error('Error obteniendo propiedades:', error);
        next(error);
    }
};


const getPropiedad = async (req, res, next) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT p.*, 
                tp.nombre AS tipo_propiedad_nombre, 
                s.nombre AS sector_nombre, 
                prod.nombre AS productor_nombre,
                prod.apellido AS productor_apellido,
                prod.codigo AS productor_codigo,
                prod.cedula AS productor_cedula
            FROM propiedad p
            LEFT JOIN tipo_propiedad tp ON p.tipo_propiedad_id = tp.id
            LEFT JOIN sector s ON p.sector_id = s.id
            LEFT JOIN productor prod ON p.productor_id = prod.id
            WHERE p.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Propiedad no encontrada' });
        }

        const propiedad = result.rows[0];

        const cultivosRes = await pool.query(`
            SELECT c.id, c.nombre, c.nombre_cientifico, tc.nombre AS tipo_cultivo
            FROM propiedad_cultivo pc
            JOIN cultivo c ON pc.cultivo_id = c.id
            LEFT JOIN tipo_cultivo tc ON c.tipo_cultivo_id = tc.id
            WHERE pc.propiedad_id = $1
        `, [propiedad.id]);
        propiedad.cultivos = cultivosRes.rows;

        res.json(propiedad);
    } catch (error) {
        console.error('Error obteniendo propiedad:', error);
        next(error);
    }
};


const createPropiedad = async (req, res, next) => {
    const { rif, nombre, c_cultivo, hectareas, sitios_asociados, ubicación, tipo_propiedad_id, sector_id, productor_id, cultivos_ids, posee_certificado } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `INSERT INTO propiedad (rif, nombre, c_cultivo, hectareas, sitios_asociados, ubicación, tipo_propiedad_id, sector_id, productor_id, posee_certificado)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
            [rif, nombre, c_cultivo, hectareas, sitios_asociados, ubicación, tipo_propiedad_id, sector_id, productor_id, posee_certificado]
        );
        const propiedadId = result.rows[0].id;

        if (Array.isArray(cultivos_ids)) {
            for (const cultivo_id of cultivos_ids) {
                await client.query(
                    `INSERT INTO propiedad_cultivo (propiedad_id, cultivo_id) VALUES ($1, $2)`,
                    [propiedadId, cultivo_id]
                );
            }
        }

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'propiedad',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creó la propiedad ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creando propiedad:', error);
        next(error);
    } finally {
        client.release();
    }
};

// Actualizar propiedad y sus cultivos asociados
const updatePropiedad = async (req, res, next) => {
    const { id } = req.params;
    const { rif, nombre, c_cultivo, hectareas, sitios_asociados, ubicación, tipo_propiedad_id, sector_id, productor_id, cultivos_ids, posee_certificado } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const oldData = await client.query('SELECT * FROM propiedad WHERE id = $1', [id]);
        await client.query(
            `UPDATE propiedad SET
                rif=$1, nombre=$2, c_cultivo=$3, hectareas=$4, sitios_asociados=$5, ubicación=$6, tipo_propiedad_id=$7, sector_id=$8, productor_id=$9, posee_certificado=$10
            WHERE id=$11`,
            [rif, nombre, c_cultivo, hectareas, sitios_asociados, ubicación, tipo_propiedad_id, sector_id, productor_id, posee_certificado,id]
        );

        // Actualizar cultivos asociados
        await client.query(`DELETE FROM propiedad_cultivo WHERE propiedad_id = $1`, [id]);
        if (Array.isArray(cultivos_ids)) {
            for (const cultivo_id of cultivos_ids) {
                await client.query(
                    `INSERT INTO propiedad_cultivo (propiedad_id, cultivo_id) VALUES ($1, $2)`,
                    [id, cultivo_id]
                );
            }
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'propiedad',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizó la propiedad ${nombre}`,
            dato: { anteriores: oldData.rows[0], nuevos: { id, nombre, rif } }
        });

        await client.query('COMMIT');
        res.json({ message: 'Propiedad actualizada correctamente' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error actualizando propiedad:', error);
        next(error);
    } finally {
        client.release();
    }
};


const deletePropiedad = async (req, res, next) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(`DELETE FROM propiedad_cultivo WHERE propiedad_id = $1`, [id]);
        const oldData = await client.query('SELECT * FROM propiedad WHERE id = $1', [id]);
        await client.query('DELETE FROM propiedad WHERE id = $1', [id]);

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'propiedad',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se eliminó la propiedad con id ${id}`,
            dato: { eliminados: oldData.rows[0] }
        });

        await client.query('COMMIT');
        res.sendStatus(204);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error eliminando propiedad:', error);
        next(error);
    } finally {
        client.release();
    }
};

const getAllCultivos = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM cultivo ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo cultivos:', error);
        next(error);
    }
};

const getAllTipoPropiedad = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM tipo_propiedad ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo tipos de propiedad:', error);
        next(error);
    }
};

const getAllSectores = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre, parroquia_id FROM sector ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo sectores:', error);
        next(error);
    }
};

const getAllParroquias = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre, municipio_id FROM parroquia ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo parroquias:', error);
        next(error);
    }
};

const getAllMunicipios = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre, estado_id FROM municipio ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo municipios:', error);
        next(error);
    }
};

const getAllEstados = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM estado ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo estados:', error);
        next(error);
    }
};

const getAllProductores = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, nombre FROM productor ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo productores:', error);
        next(error);
    }
};

module.exports = {
    getAllPropiedades,
    getPropiedad,
    createPropiedad,
    updatePropiedad,
    deletePropiedad,
    getAllCultivos,
    getAllTipoPropiedad,
    getAllSectores,
    getAllParroquias,
    getAllMunicipios,
    getAllEstados,
    getAllProductores
};