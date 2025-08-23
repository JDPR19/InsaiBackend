const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoPropiedad = async(req,res,next) => {
    try {
        const alltipoPropiedad = await pool.query('SELECT * FROM tipo_propiedad ORDER BY id DESC');
        return res.json(alltipoPropiedad.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de propiedad:',error);
        next(error);
    }
};

const getTipoPropiedad = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_propiedad WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de propiedad no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de propiedad con id ${id}:`,error);
        next(error);
    }
};

const createTipoPropiedad = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_propiedad (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'Tipos de propiedad',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de propiedad ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de propiedad',error);
        next(error);
    }
};

const updateTipoPropiedad = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoPropiedad = await pool.query('SELECT * FROM tipo_propiedad WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_propiedad SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Tipos de propiedad',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de propiedad ${nombre}`,
            dato: {antiguos: oldTipoPropiedad.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de propiedad con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoPropiedad = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoPropiedad = await pool.query('SELECT * FROM tipo_propiedad WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_propiedad WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Tipos de propiedad',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de propiedad ${oldTipoPropiedad.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoPropiedad.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de propiedad ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoPropiedad,
    getTipoPropiedad,
    createTipoPropiedad,
    updateTipoPropiedad,
    deleteTipoPropiedad
};