const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoPlaga,
    getTipoPlaga,
    createTipoPlaga,
    updateTipoPlaga,
    deleteTipoPlaga
} = require('../controllers/tipo_plaga.controller');

const router = Router();



router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_plaga', 'ver'), getAlltipoPlaga)
    .post(verificarToken, checkPermiso('tipo_plaga', 'crear'), createTipoPlaga);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_plaga', 'ver'), getTipoPlaga)
    .put(verificarToken, checkPermiso('tipo_plaga', 'editar'), updateTipoPlaga)
    .delete(verificarToken, checkPermiso('tipo_plaga', 'eliminar'), deleteTipoPlaga);

module.exports = router;