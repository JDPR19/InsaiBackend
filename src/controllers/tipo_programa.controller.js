const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllTipoPrograma = async (req, res, next) => {
    try {
        const allTipoPrograma = await pool.query('SELECT * FROM tipo_programa_fito ORDER BY id DESC');
        return res.json(allTipoPrograma.rows);
    } catch (error) {
        console.error('Error obteniendo todos los tipos de programa',error);
        next(error);
    }
};

const getTipoPrograma = async (req, res, next) => {
    try{
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM tipo_programa_fito WHERE id = $1', 
            [id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }
        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error al obtener el tipo de programa con id ${id}:`,error)
        next(error);
    }
};

const createTipoPrograma = async (req, res, next) => {
    const { nombre } = req.body;
    try{
        const result = await pool.query('INSERT INTO  tipo_programa_fito  (nombre) VALUES ($1) RETURNING *', 
            [nombre]
        );

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'Tipos de programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el tipo de programa ${nombre}`,
            dato: {nuevo: result.rows[0]}
        });
        
        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error al crear el tipo de programa',error);
        next(error);
    }
}

const updateTipoPrograma = async (req, res, next) => {
    try{
        const { id } = req.params;
        const { nombre } = req.body;

        const oldTipoPrograma = await pool.query('SELECT * FROM tipo_programa_fito WHERE id = $1 ',
            [id]
        );

        const result = await pool.query('UPDATE tipo_programa_fito SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'Tipos de programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el tipo de programa ${nombre}`,
            dato: {antiguos: oldTipoPrograma.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    }catch(error){
        console.error(`Error al actualizar el tipo de programa con el id ${id}:`, error),
        next(error);
    }
};

const deleteTipoPrograma = async (req, res, next) => {
    const { id } = req.params;
    
    const oldTipoPrograma = await pool.query('SELECT * FROM tipo_programa_fito WHERE id = $1',[id]);
    
    try{

        const result = await pool.query('DELETE FROM tipo_programa_fito WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar<--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'Tipos de programa',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el tipo de programa ${oldTipoPrograma.rows[0]?.nombre || id}`,
            dato: {antiguos: oldTipoPrograma.rows[0], nuevos: result.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Se elimino el tipo de programa con id ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAllTipoPrograma,
    getTipoPrograma,
    createTipoPrograma,
    updateTipoPrograma,
    deleteTipoPrograma
};