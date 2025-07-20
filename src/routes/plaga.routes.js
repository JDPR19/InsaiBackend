const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllPlagasFito,
    getPlagaFito,
    getTiposPlagaFito,
    createPlagaFito,
    updatePlagaFito,
    deletePlagaFito
} = require('../controllers/plaga.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('plaga', 'ver'), getAllPlagasFito)
    .post(verificarToken, checkPermiso('plaga', 'crear'), createPlagaFito);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('plaga', 'ver'), getTiposPlagaFito);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('plaga', 'ver'), getPlagaFito)
    .put(verificarToken, checkPermiso('plaga', 'editar'), updatePlagaFito)
    .delete(verificarToken, checkPermiso('plaga', 'eliminar'), deletePlagaFito);

module.exports = router;