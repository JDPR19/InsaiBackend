const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');


const getAlltipoPlaga = async(req,res,next) => {
    try {
        const alltipoPlaga = await pool.query('SELECT * FROM tipo_plaga_fito ORDER BY DESC');
        return res.json(alltipoPlaga.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de plaga:',error);
        next(error);
    }
};

const getTipoPlaga = async (req,res,next) => {
    try {
        const {id} = req.params;
        const result = await pool.query('SELECT * FROM tipo_plaga_fito WHERE id = $1', 
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({message: 'tipo de plaga no encontrado o no existe'});
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error obteniendo el tipo de plaga con id ${id}:`,error);
        next(error);
    }
};

const createTipoPlaga = async (req, res, next) => {
    const {nombre} = req.body;
    try{
        const result = pool.query('INSERT INTO tipo_plaga_fito (nombre) VALUES ($1) RETURNING *',
            [nombre]
        );
        
        await registrarBitacora({
            accion: 'RESGISTRO',
            tabla: 'tipo de plaga',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de plaga ${nombre}`,
            dato: { nuevos: result.rows[0] }
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando un nuevo tipo de plaga',error);
        next(error);
    }
};

const updateTipoPlaga = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoPlaga = await pool.query('SELECT * FROM tipo_plaga_fito WHERE id = $1', [id]);

        const result = await pool.query('UPDATE tipo_plaga_fito SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0) {
            return res.status(404).json({
                message: 'ERROR  404 --> Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'tipo de plaga',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de plaga ${nombre}`,
            dato: {antiguos: oldTipoPlaga.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch (error){
        console.error(`Error actualizando el tipo de plaga con id ${id}:`,error);
        next(error);
    }
};

const deleteTipoPlaga = async (req, res, next) => {
    
    const { id } = req.params;

    const oldTipoPlaga = await pool.query('SELECT * FROM tipo_plaga_fito WHERE id = $1', [id]);
    
    try{
        const result = await pool.query('DELETE FROM tipo_plaga_fito WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'tipo de plaga',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de plaga ${oldTipoPlaga.rows[0]?.nombre || id}`,
            dato: { antiguos: oldTipoPlaga.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el tipo de plaga ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAlltipoPlaga,
    getTipoPlaga,
    createTipoPlaga,
    updateTipoPlaga,
    deleteTipoPlaga
};