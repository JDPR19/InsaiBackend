const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoCultivo,
    getTipoCultivo,
    createTipoCultivo,
    updateTipoCultivo,
    deleteTipoCultivo
} = require('../controllers/tipo_cultivo.controller');

const router = Router();


router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_cultivo', 'ver'), getAlltipoCultivo)
    .post(verificarToken, checkPermiso('tipo_cultivo', 'crear'), createTipoCultivo);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_cultivo', 'ver'), getTipoCultivo)
    .put(verificarToken, checkPermiso('tipo_cultivo', 'editar'), updateTipoCultivo)
    .delete(verificarToken, checkPermiso('tipo_cultivo', 'eliminar'), deleteTipoCultivo);

module.exports = router;