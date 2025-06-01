const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoProductor,
    getTipoProductor,
    createTipoProductor,
    updateTipoProductor,
    deleteTipoProductor
} = require('../controllers/tipo_productor.controller');

const router = Router();



router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_productor', 'ver'), getAlltipoProductor)
    .post(verificarToken, checkPermiso('tipo_productor', 'crear'), createTipoProductor);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_productor', 'ver'), getTipoProductor)
    .put(verificarToken, checkPermiso('tipo_productor', 'editar'), updateTipoProductor)
    .delete(verificarToken, checkPermiso('tipo_productor', 'eliminar'), deleteTipoProductor);

module.exports = router;