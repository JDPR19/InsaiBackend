const { Router } = require('express');
const  verificarToken  = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllTipoPrograma,
    getTipoPrograma,
    createTipoPrograma,
    updateTipoPrograma,
    deleteTipoPrograma
} = require('../controllers/tipo_programa.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_programa', 'ver'), getAllTipoPrograma)
    .post(verificarToken, checkPermiso('tipo_programa', 'crear'), createTipoPrograma);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_programa', 'ver'), getTipoPrograma)
    .put(verificarToken, checkPermiso('tipo_programa', 'editar'), updateTipoPrograma)
    .delete(verificarToken, checkPermiso('tipo_programa', 'eliminar'), deleteTipoPrograma);


module.exports = router;