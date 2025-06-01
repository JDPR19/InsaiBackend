const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoLaboratorio,
    getTipoLaboratorio,
    createTipoLaboratorio,
    updateTipoLaboratorio,
    deleteTipoLaboratorio
} = require('../controllers/tipo_laboratorio.controller');

const router = Router();



router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_laboratorio', 'ver'), getAlltipoLaboratorio)
    .post(verificarToken, checkPermiso('tipo_laboratorio', 'crear'), createTipoLaboratorio);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_laboratorio', 'ver'), getTipoLaboratorio)
    .put(verificarToken, checkPermiso('tipo_laboratorio', 'editar'), updateTipoLaboratorio)
    .delete(verificarToken, checkPermiso('tipo_laboratorio', 'eliminar'), deleteTipoLaboratorio);

module.exports = router;