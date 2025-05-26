const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllTipoUsuario,
    getTipoUsuario,
    createTipoUsuario,
    updateTipoUsuario,
    deleteTipoUsuario
} = require ('../controllers/tipo_usuario.controller');

const router = Router();

// rutas tipo_usuario
router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_usuario', 'ver'), getAllTipoUsuario)
    .post(verificarToken, checkPermiso('tipo_usuario', 'crear'), createTipoUsuario);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_usuario', 'ver'), getTipoUsuario)
    .put(verificarToken, checkPermiso('tipo_usuario', 'editar'), updateTipoUsuario)
    .delete(verificarToken, checkPermiso('tipo_usuario', 'eliminar'), deleteTipoUsuario);

module.exports = router;