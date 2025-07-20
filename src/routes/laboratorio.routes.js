const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllLaboratorios,
    getLaboratorio,
    getTiposLaboratorio,
    getEstados,
    getMunicipios,
    getParroquias,
    getSectores,
    createLaboratorio,
    updateLaboratorio,
    deleteLaboratorio
} = require('../controllers/laboratorio.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getAllLaboratorios)
    .post(verificarToken, checkPermiso('laboratorio', 'crear'), createLaboratorio);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getTiposLaboratorio);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getEstados);

router
    .route('/municipios/all')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getMunicipios);

router
    .route('/parroquias/all')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getParroquias);

router
    .route('/sectores/all')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getSectores);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('laboratorio', 'ver'), getLaboratorio)
    .put(verificarToken, checkPermiso('laboratorio', 'editar'), updateLaboratorio)
    .delete(verificarToken, checkPermiso('laboratorio', 'eliminar'), deleteLaboratorio);

module.exports = router;