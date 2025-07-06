const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllPlanificaciones,
    getPlanificacion,
    createPlanificacion,
    updatePlanificacion,
    deletePlanificacion
} = require('../controllers/planificacion.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('planificacion', 'ver'), getAllPlanificaciones)
    .post(verificarToken, checkPermiso('planificacion', 'crear'), createPlanificacion);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('planificacion', 'ver'), getPlanificacion)
    .put(verificarToken, checkPermiso('planificacion', 'editar'), updatePlanificacion)
    .delete(verificarToken, checkPermiso('planificacion', 'eliminar'), deletePlanificacion);

module.exports = router;