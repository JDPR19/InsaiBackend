const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoInspeccion = async(req,res,next) => {
    try {
        const alltipoInspeccion = await pool.query('SELECT * FROM tipo_inspeccion_fito ORDER BY id DESC');
        return res.json(alltipoInspeccion.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de Inspeccion:',error);
        next(error);
    }
};

const getTipoInspeccion = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_inspeccion_fito WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de inspeccion no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de inspeccion con id ${id}:`,error);
        next(error);
    }
};

const createTipoInspeccion = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_inspeccion_fito (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'Tipos de inspección',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de inspección ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de propiedad',error);
        next(error);
    }
};

const updateTipoInspeccion = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoInspeccion = await pool.query('SELECT * FROM tipo_inspeccion_fito WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_inspeccion_fito SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Tipos de inspección',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de inspeccion ${nombre}`,
            dato: {antiguos: oldTipoInspeccion.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de inspeccion con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoInspeccion = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoInspeccion = await pool.query('SELECT * FROM tipo_inspeccion_fito WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_inspeccion_fito WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Tipos de inspección',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de inspeccion ${oldTipoInspeccion.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoInspeccion.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de inspeccion ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoInspeccion,
    getTipoInspeccion,
    createTipoInspeccion,
    updateTipoInspeccion,
    deleteTipoInspeccion
};