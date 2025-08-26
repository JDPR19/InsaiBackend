const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const { getAllFinalidades } = require('../controllers/finalidad.controller');

const router = Router();

router.get('/', verificarToken, checkPermiso('inspecciones', 'ver'), getAllFinalidades);

module.exports = router;