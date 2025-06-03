const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
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
    .get(verificarToken, checkPermiso('tipo_solicitud', 'ver'), getAllTipoSolicitud)
    .post(verificarToken, checkPermiso('tipo_solicitud', 'crear'), createTipoSolicitud);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_solicitud', 'ver'), getTipoSolicitud)
    .put(verificarToken, checkPermiso('tipo_solicitud', 'editar'), updateTipoSolicitud)
    .delete(verificarToken, checkPermiso('tipo_solicitud', 'eliminar'), deleteTipoSolicitud);

module.exports = router;
