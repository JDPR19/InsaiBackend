const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllEstados,
    getEstado,
    createEstado,
    updateEstado,
    deleteEstado
} = require('../controllers/estado.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('estado','ver'), getAllEstados)
    .post(verificarToken, checkPermiso('estado','crear'), createEstado);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('estado','ver'), getEstado)
    .update(verificarToken, checkPermiso('estado','editar'), updateEstado)
    .delete(verificarToken, checkPermiso('estado','eliminar'), deleteEstado);


module.exports = router;