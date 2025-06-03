const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoLaboratorio = async(req,res,next) => {
    try {
        const alltipoLaboratorio = await pool.query('SELECT * FROM tipo_laboratorio ORDER BY id DESC');
        return res.json(alltipoLaboratorio.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de laboratorio:',error);
        next(error);
    }
};

const getTipoLaboratorio = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_laboratorio WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de laboratorio no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de laboratorio con id ${id}:`,error);
        next(error);
    }
};

const createTipoLaboratorio = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = await pool.query('INSERT INTO tipo_laboratorio (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'tipo de laboratorio',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de laboratorio ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de laboratorio',error);
        next(error);
    }
};

const updateTipoLaboratorio = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoLaboratorio = await pool.query('SELECT * FROM tipo_laboratorio WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_laboratorio SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'tipo de laboratorio',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de laboratorio ${nombre}`,
            dato: {antiguos: oldTipoLaboratorio.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de laboratorio con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoLaboratorio = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoLaboratorio = await pool.query('SELECT * FROM tipo_laboratorio WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_laboratorio WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'tipo de laboratorio',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de laboratorio ${oldTipoLaboratorio.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoLaboratorio.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de laboratorio ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoLaboratorio,
    getTipoLaboratorio,
    createTipoLaboratorio,
    updateTipoLaboratorio,
    deleteTipoLaboratorio
};