const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoPermiso,
    getTipoPermiso,
    createTipoPermiso,
    updateTipoPermiso,
    deleteTipoPermiso
} = require('../controllers/tipo_permiso.controller');

const router = Router();



router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_permiso', 'ver'), getAlltipoPermiso)
    .post(verificarToken, checkPermiso('tipo_permiso', 'crear'), createTipoPermiso);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_permiso', 'ver'), getTipoPermiso)
    .put(verificarToken, checkPermiso('tipo_permiso', 'editar'), updateTipoPermiso)
    .delete(verificarToken, checkPermiso('tipo_permiso', 'eliminar'), deleteTipoPermiso);

module.exports = router;