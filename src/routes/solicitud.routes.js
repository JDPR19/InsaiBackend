const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllSolicitudes,
    getAllPropiedades,
    getAllTipoPermisos,
    getAllUsuarios,
    getAllTipoSolicitudes,
    getSolicitud,
    createSolicitud,
    updateSolicitud,
    deleteSolicitud
} = require('../controllers/solicitud.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('solicitud', 'ver'), getAllSolicitudes)
    .post(verificarToken, checkPermiso('solicitud', 'crear'), createSolicitud);

router
    .route('/tipo_solicitud/all')
    .get(verificarToken,checkPermiso('solicitud','ver'), getAllTipoSolicitudes);

router
    .route('/tipo_permiso/all')
    .get(verificarToken,checkPermiso('solicitud','ver'), getAllTipoPermisos);

router
    .route('/usuarios/all')
    .get(verificarToken,checkPermiso('solicitud','ver'), getAllUsuarios);

router
    .route('/propiedad/all')
    .get(verificarToken,checkPermiso('solicitud','ver'), getAllPropiedades);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('solicitud', 'ver'), getSolicitud)
    .put(verificarToken, checkPermiso('solicitud', 'editar'), updateSolicitud)
    .delete(verificarToken, checkPermiso('solicitud', 'eliminar'), deleteSolicitud);

module.exports = router;