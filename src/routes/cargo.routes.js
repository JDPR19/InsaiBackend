const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllCargos,
    getCargo,
    createCargo,
    updateCargo,
    deleteCargo
} = require ('../controllers/cargo.controller');

const router = Router();

// Rutas para cargo
router
    .route('/')
    .get(verificarToken, checkPermiso('cargos', 'ver'), getAllCargos)
    .post(verificarToken, checkPermiso('cargos', 'crear'), createCargo);

router 
    .route('/:id')
    .get(verificarToken, checkPermiso('cargos', 'ver'), getCargo)
    .put(verificarToken, checkPermiso('cargos', 'editar'), updateCargo)
    .delete(verificarToken, checkPermiso('cargos', 'eliminar'), deleteCargo);

module.exports = router;