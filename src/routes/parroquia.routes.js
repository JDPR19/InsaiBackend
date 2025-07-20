const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllParroquias,
    getParroquia,
    getEstados,
    getMunicipios,
    createParroquia,
    updateParroquia,
    deleteParroquia
} = require('../controllers/parroquia.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('parroquia','ver'), getAllParroquias)
    .post(verificarToken, checkPermiso('parroquia','crear'), createParroquia);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('parroquia','ver'), getEstados);

router
    .route('/municipios/all')
    .get(verificarToken, checkPermiso('parroquia','ver'), getMunicipios);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('parroquia','ver'), getParroquia)
    .put(verificarToken, checkPermiso('parroquia','editar'), updateParroquia)
    .delete(verificarToken, checkPermiso('parroquia','eliminar'), deleteParroquia);

module.exports = router;