const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllProgramas,
    getPrograma,
    getTiposPrograma,
    getAllPlagas,
    getAllEmpleados,
    getAllCultivos,
    createPrograma,
    updatePrograma,
    deletePrograma
} = require('../controllers/programa.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('programa', 'ver'), getAllProgramas)
    .post(verificarToken, checkPermiso('programa', 'crear'), createPrograma);


router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('tipo_programa', 'ver'), getTiposPrograma);

router
    .route('/plagas/all')
    .get(verificarToken, checkPermiso('plaga', 'ver'), getAllPlagas);

router
    .route('/empleados/all')
    .get(verificarToken, checkPermiso('empleados', 'ver'), getAllEmpleados);

router
    .route('/cultivos/all')
    .get(verificarToken, checkPermiso('cultivo', 'ver'), getAllCultivos);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('programa', 'ver'), getPrograma)
    .put(verificarToken, checkPermiso('programa', 'editar'), updatePrograma)
    .delete(verificarToken, checkPermiso('programa', 'eliminar'), deletePrograma);

module.exports = router;