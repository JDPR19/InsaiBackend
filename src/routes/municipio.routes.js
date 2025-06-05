const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllMunicipios,
    getMunicipio,
    getEstados,
    createMunicipio,
    updateMunicipio,
    deleteMunicipio
} = require('../controllers/municipio.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('municipio','ver'), getAllMunicipios)
    .post(verificarToken, checkPermiso('municipio','crear'), createMunicipio);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('estado', 'ver'), getEstados);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('municipio','ver'), getMunicipio)
    .put(verificarToken, checkPermiso('municipio','editar'), updateMunicipio)
    .delete(verificarToken, checkPermiso('municipio','eliminar'), deleteMunicipio);

module.exports = router;