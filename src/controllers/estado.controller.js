const pool = require('../db');
const { registrarBitacora } = require('../registerBitacora');

const getAllEstados = async (req, res, next) => {
    
    try{
        const allEstados = await pool.query('SELECT * FROM estado ORDER BY DESC');
        return res.json(allEstados.rows);
    }catch(error){
        console.error('Error obteniendo todos los estados',error);
        next(error);
    }
};

const getEstado = async (req, res, next) => {
    try {
        const { id } = req.params;

        const result = await pool.query('SELECT * FROM estado WHERE id = $1',
            [id]
        );
        
        if(result.rows.length === 0){
            return res.status(404).json({
                message: `estado no existe o imposible de encontrar`
            });
        }

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error obteniendo el estado con el id ${id}:`,error);
        next(error);
    }
};

const createEstado = async (req, res, next) => {
    const { nombre } = req.body;
    try{
        const result = pool.query('INSERT INTO estado (nombre) VALUES ($1) RETURNING *', 
            [nombre]
        );

        await registrarBitacora({
            accion: 'REGISTRO',
            tabla: 'estados',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se creo el estado ${nombre}`,
            dato: {nuevos: result.rows[0]} 
        });

        return res.status(201).json(result.rows[0]);
    }catch(error){
        console.error('Error creando el estado',error);
        next(error);
    }
};

const updateEstado = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        const oldEstado = await pool.query('SELECT * FROM estado WHERE id = $1',
            [id]
        );

        const result = await pool.query('UPDATE estado SET nombre = $1 WHERE id = $2 RETURNING *',
            [nombre, id]
        );

        if(result.rows.length === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar <--'
            });
        }

        await registrarBitacora({
            accion: 'ACTUALIZO',
            tabla: 'estados',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se actualizo el estado ${nombre}`,
            dato: {antiguos: oldEstado.rows[0], nuevos: result.rows[0]}
        });

        return res.json(result.rows[0]);
    } catch (error) {
        console.error(`Error actualizando el estado con el id ${id}:`,error);
        next(error);
    }
};

const deleteEstado = async (req, res, next) => {
    const { id } = req.params;

    const oldEstado = await pool.query('SELECT * FROM estado WHERE id = $1',
        [id]
    );

    try{
        const result = await pool.query('DELETE FROM estado WHERE id = $1',
            [id]
        );

        if(result.rowCount === 0){
            return res.status(404).json({
                message: 'ERROR 404 -->Solicitud no existe o es imposible de encontrar <--'
            });
        }

        await registrarBitacora({
            accion: 'ELIMINO',
            tabla: 'estado',
            usuario: req.user.username,
            usuario_id: req.user.id,
            descripcion: `Se elimino el estado ${oldEstado.rows[0]?.nombre || id}`,
            dato:{antiguos: oldEstado.rows[0]}
        });

        return res.sendStatus(204);
    }catch(error){
        console.error(`Error eliminando el estado con el id ${id}:`,error);
        next(error);
    }
};

module.exports = {
    getAllEstados,
    getEstado,
    createEstado,
    updateEstado,
    deleteEstado
};