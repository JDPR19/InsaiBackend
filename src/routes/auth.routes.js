const { Router } = require('express');
const { loginUsuario, logoutUsuario  } = require('../controllers/login.controller');
const verificarToken = require('../verificarToken'); 
const router = Router();

// Ruta para el login
router.post('/login', loginUsuario);
// Ruta para el logout
router.post('/logout', logoutUsuario);
// Ruta protegida para obtener el perfil del usuario autenticado
router.get('/perfil', verificarToken, (req, res) => {
    res.json({ message: 'Acceso permitido', user: req.user });
});


module.exports = router;