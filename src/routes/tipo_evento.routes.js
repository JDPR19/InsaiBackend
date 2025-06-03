const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoEvento,
    getTipoEvento,   
    createTipoEvento,
    updateTipoEvento,
    deleteTipoEvento} = require('../controllers/tipo_evento.controller');

const router = Router();

// rutas para tipo de propiedades

router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_evento', 'ver'), getAlltipoEvento)
    .post(verificarToken, checkPermiso('tipo_evento', 'crear'), createTipoEvento);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_evento', 'ver'), getTipoEvento)
    .put(verificarToken, checkPermiso('tipo_evento', 'editar'), updateTipoEvento)
    .delete(verificarToken, checkPermiso('tipo_evento', 'eliminar'), deleteTipoEvento);

module.exports = router;