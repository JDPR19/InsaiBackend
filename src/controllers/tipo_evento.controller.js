const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoEvento = async(req,res,next) => {
    try {
        const alltipoEvento = await pool.query('SELECT * FROM tipo_evento_epidemia ORDER BY id DESC');
        return res.json(alltipoEvento.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de evento:',error);
        next(error);
    }
};

const getTipoEvento = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_evento_epidemia WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de evento no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de evento con id ${id}:`,error);
        next(error);
    }
};

const createTipoEvento = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_evento_epidemia (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'tipo de evento',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de evento ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de evento',error);
        next(error);
    }
};

const updateTipoEvento = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoEvento = await pool.query('SELECT * FROM tipo_evento_epidemia WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_evento_epidemia SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'tipo de evento',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de evento ${nombre}`,
            dato: {antiguos: oldTipoEvento.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de evento con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoEvento = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoEvento = await pool.query('SELECT * FROM tipo_evento_epidemia WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_evento_epidemia WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'tipo de evento',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de evento ${oldTipoPropiedad.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoEvento.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de evento ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoEvento,
    getTipoEvento,
    createTipoEvento,
    updateTipoEvento,
    deleteTipoEvento
};