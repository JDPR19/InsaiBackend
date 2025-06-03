const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoPermiso = async(req,res,next) => {
    try {
        const alltipoPermiso = await pool.query('SELECT * FROM tipo_permiso ORDER BY id DESC');
        return res.json(alltipoPermiso.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de permiso:',error);
        next(error);
    }
};

const getTipoPermiso = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_permiso WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de permiso no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de permiso con id ${id}:`,error);
        next(error);
    }
};

const createTipoPermiso = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_permiso (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'tipo de permiso',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de permiso ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de permiso',error);
        next(error);
    }
};

const updateTipoPermiso = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoPermiso = await pool.query('SELECT * FROM tipo_permiso WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_permiso SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'tipo de permiso',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de permiso ${nombre}`,
            dato: {antiguos: oldTipoPermiso.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de permiso con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoPermiso = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoPermiso = await pool.query('SELECT * FROM tipo_permiso WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_permiso WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'tipo de permiso',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de permiso ${oldTipoPermiso.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoPermiso.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de permiso ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoPermiso,
    getTipoPermiso,
    createTipoPermiso,
    updateTipoPermiso,
    deleteTipoPermiso
};