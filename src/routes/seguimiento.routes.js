const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getProgramasByInspeccion,
    getAllProgramasFito,
    addProgramaToInspeccion,
    updateProgramaInInspeccion,
    deleteProgramaFromInspeccion
} = require('../controllers/seguimiento.controller');

const router = Router();


router.get('/programas', verificarToken, checkPermiso('inspecciones', 'ver'), getAllProgramasFito);


router.get('/:inspeccion_est_id', verificarToken, checkPermiso('inspecciones', 'ver'), getProgramasByInspeccion);


router.post('/', verificarToken, checkPermiso('inspecciones', 'editar'), addProgramaToInspeccion);

router.put('/:id', verificarToken, checkPermiso('inspecciones', 'editar'), updateProgramaInInspeccion);

router.delete('/:id', verificarToken, checkPermiso('inspecciones', 'editar'), deleteProgramaFromInspeccion);

module.exports = router;