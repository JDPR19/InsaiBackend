const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getProgramasByInspeccion,
    getAllProgramasFito,
    addProgramaToInspeccion,
    deleteProgramaFromInspeccion
} = require('../controllers/seguimiento.controller');

const router = Router();

// Obtener programas asociados a una inspección
router
    .route('/:inspeccion_est_id')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getProgramasByInspeccion);

// Asociar un programa a una inspección
router
    .route('/')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getAllProgramasFito)
    .post(verificarToken, checkPermiso('inspecciones', 'editar'), addProgramaToInspeccion);

// Eliminar asociación
router
    .route('/:id')
    .delete( verificarToken, checkPermiso('inspecciones', 'editar'), deleteProgramaFromInspeccion);

module.exports = router;