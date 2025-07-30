const { Router } = require('express');
const verificarToken = require('../verificarToken');
const {
    getNotificacionesByUsuario,
    marcarLeida
} = require('../controllers/notificacion.controller');

const router = Router();

router.get('/', verificarToken, getNotificacionesByUsuario);

router.put('/:id/leida', verificarToken, marcarLeida);

module.exports = router;