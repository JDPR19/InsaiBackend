const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllCultivos,
    getCultivo,
    getTiposCultivo,
    createCultivo,
    updateCultivo,
    deleteCultivo
} = require('../controllers/cultivo.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('cultivo', 'ver'), getAllCultivos)
    .post(verificarToken, checkPermiso('cultivo', 'crear'), createCultivo);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('tipo_cultivo', 'ver'), getTiposCultivo);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('cultivo', 'ver'), getCultivo)
    .put(verificarToken, checkPermiso('cultivo', 'editar'), updateCultivo)
    .delete(verificarToken, checkPermiso('cultivo', 'eliminar'), deleteCultivo);

module.exports = router;