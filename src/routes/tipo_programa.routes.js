const { Router } = require('express');
const  verificarToken  = require('../verificarToken');
const checkPermisos = require('../checkPermisos');
const {
    getAllTipoPrograma,
    getTipoPrograma,
    createTipoPrograma,
    updateTipoPrograma,
    deleteTipoPrograma
} = require('../controllers/tipo_programa.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermisos('tipo_programa', 'ver'), getAllTipoPrograma)
    .post(verificarToken, checkPermisos('tipo_programa', 'crear'), createTipoPrograma);

router
    .route('/:id')
    .get(verificarToken, checkPermisos('tipo_programa', 'ver'), getTipoPrograma)
    .update(verificarToken, checkPermisos('tipo_programa', 'editar'), updateTipoPrograma)
    .delete(verificarToken, checkPermisos('tipo_programa', 'eliminar'), deleteTipoPrograma);


module.exports = router;