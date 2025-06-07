const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllProgramas,
    getPrograma,
    getPlagas,
    getTiposPrograma,
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
    .route('/plagas/all')
    .get(verificarToken, checkPermiso('plaga', 'ver'), getPlagas);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('tipo_programa', 'ver'), getTiposPrograma);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('programa', 'ver'), getPrograma)
    .put(verificarToken, checkPermiso('programa', 'editar'), updatePrograma)
    .delete(verificarToken, checkPermiso('programa', 'eliminar'), deletePrograma);

module.exports = router;