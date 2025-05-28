const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getMiUsuario,
    updateMiUsuario,
    deleteMiUsuario
} = require('../controllers/miusuario.controller');

const router = Router();

// Todas las rutas usan el permiso 'miusuario'
router
    .route('/')
    .get(verificarToken, checkPermiso('miusuario', 'ver'), getMiUsuario)
    .put(verificarToken, checkPermiso('miusuario', 'editar'), updateMiUsuario)
    .delete(verificarToken, checkPermiso('miusuario', 'eliminar'), deleteMiUsuario);

module.exports = router;