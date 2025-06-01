const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoInspeccion,
    getTipoInspeccion,
    createTipoInspeccion,
    updateTipoInspeccion,
    deleteTipoInspeccion
} = require('../controllers/tipo_inspeccion.controller');

const router = Router();



router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_inspeccion', 'ver'), getAlltipoInspeccion)
    .post(verificarToken, checkPermiso('tipo_inspeccion', 'crear'), createTipoInspeccion);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_inspeccion', 'ver'), getTipoInspeccion)
    .put(verificarToken, checkPermiso('tipo_inspeccion', 'editar'), updateTipoInspeccion)
    .delete(verificarToken, checkPermiso('tipo_inspeccion', 'eliminar'), deleteTipoInspeccion);

module.exports = router;