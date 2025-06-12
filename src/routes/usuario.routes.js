const { Router } = require('express');
const verificarToken = require('../verificarToken'); 
const checkPermiso = require('../checkPermisos');

const { 
    getAllUsuarios, 
    getUsuario,
    getAllTipoUsuario, 
    getCedulas,
    createUsuario, 
    updateUsuario, 
    deleteUsuario,
    disableUsuario 
} = require('../controllers/usuario.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('usuarios', 'ver'), getAllUsuarios)
    .post(verificarToken, checkPermiso('usuarios', 'crear'), createUsuario);

router
    .route('/empleados/cedulas')
    .get(verificarToken, checkPermiso('usuarios', 'ver'), getCedulas);

router
    .route('/tipos')
    .get(verificarToken, checkPermiso('usuarios', 'ver'), getAllTipoUsuario);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('usuarios', 'ver'), getUsuario)
    .put(verificarToken, checkPermiso('usuarios', 'editar'), updateUsuario)
    .delete(verificarToken, checkPermiso('usuarios', 'eliminar'), deleteUsuario);

router
    .route('/:id/estado')
    .patch(verificarToken, checkPermiso('usuarios', 'deshabilitar'), disableUsuario);

module.exports = router;