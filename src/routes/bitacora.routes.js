const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const { 
    listarBitacora,
    inicioSesion, 
    cierreSesion
} = require('../controllers/bitacora.controller');

const router = Router();

// Ruta para listar registros de la bitácora
router
    .route('/')
    .get(verificarToken, checkPermiso('bitacora', 'ver'), listarBitacora);

// Ruta para registrar inicio de sesión
router
    .route('/inicio-sesion')
    .post(inicioSesion);

// Ruta para registrar cierre de sesión
router 
    .route('/cierre-sesion')
    .post(cierreSesion);

module.exports = router;