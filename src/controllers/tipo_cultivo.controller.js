const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoCultivo = async(req,res,next) => {
    try {
        const alltipoCultivo = await pool.query('SELECT * FROM tipo_cultivo ORDER BY id DESC');
        return res.json(alltipoCultivo.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de cultivo:',error);
        next(error);
    }
};

const getTipoCultivo = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_cultivo WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de cultivo no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de cultivo con id ${id}:`,error);
        next(error);
    }
};

const createTipoCultivo = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_cultivo (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'Tipos de cultivo',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de cultivo ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de cultivo',error);
        next(error);
    }
};

const updateTipoCultivo = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoCultivo = await pool.query('SELECT * FROM tipo_cultivo WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_cultivo SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Tipos de cultivo',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de cultivo ${nombre}`,
            dato: {antiguos: oldTipoCultivo.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de cultivo con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoCultivo = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoCultivo = await pool.query('SELECT * FROM tipo_cultivo WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_cultivo WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Tipos de cultivo',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de cultivo ${oldTipoCultivo.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoCultivo.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de cultivo ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoCultivo,
    getTipoCultivo,
    createTipoCultivo,
    updateTipoCultivo,
    deleteTipoCultivo
};