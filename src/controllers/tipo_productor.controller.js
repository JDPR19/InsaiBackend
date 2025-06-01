const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoProductor = async(req,res,next) => {
    try {
        const alltipoProductor = await pool.query('SELECT * FROM tipo_productor ORDER BY DESC');
        return res.json(alltipoProductor.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de productores:',error);
        next(error);
    }
};

const getTipoProductor = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_productor WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de productor no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de productor con id ${id}:`,error);
        next(error);
    }
};

const createTipoProductor = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = pool.query('INSERT INTO tipo_productor (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'tipo de productor',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de productor ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de productor',error);
        next(error);
    }
};

const updateTipoProductor = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoProductor = await pool.query('SELECT * FROM tipo_productor WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_productor SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'tipo de productor',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de productor ${nombre}`,
            dato: {antiguos: oldTipoProductor.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de productor con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoProductor = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoProductor = await pool.query('SELECT * FROM tipo_productor WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_productor WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'tipo de productor',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de productor ${oldTipoProductor.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoProductor.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de productor ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoProductor,
    getTipoProductor,
    createTipoProductor,
    updateTipoProductor,
    deleteTipoProductor
};