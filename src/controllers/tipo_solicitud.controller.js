const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllTipoSolicitud = async (req, res, next) => {
    try{
        const allTipoSolicitud = await pool.query('SELECT * FROM tipo_solicitud ORDER BY id DESC');
        return res.json(allTipoSolicitud.rows);
    }catch(error){
        console.error('Error obteniendo todos los Tipos de solicitud', error);
        next(error);
    }
};

const getTipoSolicitud = async (req, res, next) => {
    try{
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM tipo_solicitud WHERE id = $1',
        [id]
    );

    if(result.rows.length === 0){
        return res.status(404).json({
            message: 'tipo de solicitud no encontrada o no existe'
        });
    }
    return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de solicitud con id ${id}:`,error);
        next(error);
    }
};

const createTipoSolicitud = async (req, res, next) => {
    const { nombre } = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_solicitud (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Tipos de solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de solicitud ${nombre}`,
            dato: {nuevo: result.rows[0]}
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('error creando el tipo de solicitud',error);
        next(error);
    }
};

const updateTipoSolicitud = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoSolicitud = await pool.query('SELECT * FROM tipo_solicitud WHERE id = $1', [id]);
        
        const result = await pool.query('UPDATE tipo_solicitud SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: 'ERROR -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Tipos de Solicitud',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de solicitud ${nombre}`,
            dato: {antiguo: oldTipoSolicitud.rows[0], nuevo: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error actualizando la tipo de solicitud con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoSolicitud = async (req, res, next) => {
    const { id } = req.params;
    
    const oldTipoSolicitud = await pool.query('SELECT * FROM tipo_solicitud WHERE id = $1', [id]);
    
    try {
        const result = await pool.query('DELETE FROM tipo_solicitud WHERE id = $1',
                [id]
            );

            if(result.rowCount === 0){
                return res.status(404).json({
                    message: 'ERROR -->Solicitud no existe o es imposible de encontrar<--'
                });
            }

            await registrarBitacora({
                accion: 'ELIMINO',
                tabla: 'Tipos de Solicitud',
                usuario: req.user.username,
                usuario_id: req.user.id,
                descripcion: `Se elimino el tipo de solicitud ${oldTipoSolicitud.rows[0]?.nombre || id}`,
                dato: {antiguos: oldTipoSolicitud.rows[0]}
            });
            return res.sendStatus(204);
    } catch (error) {
        if (error.code === '23505') { 
            return res.status(400).json({ message: 'Ya existe un tipo de solicitud con ese nombre.' });
        }
        console.error(`error eliminando el tipo de solicitud con id ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAllTipoSolicitud,
    getTipoSolicitud,
    createTipoSolicitud,
    updateTipoSolicitud,
    deleteTipoSolicitud
};