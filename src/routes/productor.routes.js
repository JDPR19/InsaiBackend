const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllProductores,
    getProductor,
    createProductor,
    updateProductor,
    deleteProductor,
    getAllTiposProductor
} = require('../controllers/productor.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('productor', 'ver'), getAllProductores)
    .post(verificarToken, checkPermiso('productor', 'crear'), createProductor);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('productor', 'ver'), getAllTiposProductor);


router
    .route('/:id')
    .get(verificarToken, checkPermiso('productor', 'ver'), getProductor)
    .put(verificarToken, checkPermiso('productor', 'editar'), updateProductor)
    .delete(verificarToken, checkPermiso('productor', 'eliminar'), deleteProductor);

module.exports = router;