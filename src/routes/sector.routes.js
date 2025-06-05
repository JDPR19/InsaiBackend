const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const { 
    getAllSector,
    getSector,
    getEstados,
    getMunicipios,
    getParroquias,
    createSector,
    updateSector,
    deleteSector
} = require('../controllers/sector.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('sector', 'ver'), getAllSector)
    .post(verificarToken, checkPermiso('sector', 'crear'), createSector);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('estado', 'ver'), getEstados);

    router
    .route('/municipios/all')
    .get(verificarToken, checkPermiso('municipio', 'ver'), getMunicipios);

    router
    .route('/parroquias/all')
    .get(verificarToken, checkPermiso('parroquia', 'ver'), getParroquias);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('sector', 'ver'), getSector)
    .put(verificarToken, checkPermiso('sector', 'editar'), updateSector)
    .delete(verificarToken, checkPermiso('sector', 'eliminar'), deleteSector);

module.exports = router;