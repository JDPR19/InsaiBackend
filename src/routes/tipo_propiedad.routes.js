const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAlltipoPropiedad,
    getTipoPropiedad,
    createTipoPropiedad,
    updateTipoPropiedad,
    deleteTipoPropiedad
} = require('../controllers/tipo_propiedad.controller');

const router = Router();

// rutas para tipo de propiedades

router
    .route('/')
    .get(verificarToken, checkPermiso('tipo_propiedad', 'ver'), getAlltipoPropiedad)
    .post(verificarToken, checkPermiso('tipo_propiedad', 'crear'), createTipoPropiedad);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('tipo_propiedad', 'ver'), getTipoPropiedad)
    .put(verificarToken, checkPermiso('tipo_propiedad', 'editar'), updateTipoPropiedad)
    .delete(verificarToken, checkPermiso('tipo_propiedad', 'eliminar'), deleteTipoPropiedad);

module.exports = router;