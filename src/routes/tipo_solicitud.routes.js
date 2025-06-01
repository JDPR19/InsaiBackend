const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermisos = require('../checkPermisos');
const {
    getAllTipoSolicitud,
    getTipoSolicitud,
    createTipoSolicitud,
    updateTipoSolicitud,
    deleteTipoSolicitud
} = require('../controllers/tipo_solicitud.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermisos('tipo_solicitud', 'ver'), getAllTipoSolicitud)
    .post(verificarToken, checkPermisos('tipo_solicitud', 'crear'), createTipoSolicitud);

router
    .route('/:id')
    .get(verificarToken, checkPermisos('tipo_solicitud', 'ver'), getTipoSolicitud)
    .put(verificarToken, checkPermisos('tipo_solicitud', 'editar'), updateTipoSolicitud)
    .delete(verificarToken, checkPermisos('tipo_solicitud', 'eliminar'), deleteTipoSolicitud);

module.exports = router;
