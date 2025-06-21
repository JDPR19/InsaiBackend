const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllPropiedades,
    getPropiedad,
    createPropiedad,
    updatePropiedad,
    deletePropiedad,
    getAllCultivos,
    getAllTipoPropiedad,
    getAllSectores,
    getAllEstados,
    getAllMunicipios,
    getAllParroquias,
    getAllProductores
} = require('../controllers/propiedad.controller');

const router = Router();

router
    .route('/')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllPropiedades)
    .post(verificarToken, checkPermiso('propiedad', 'crear'), createPropiedad);

router
    .route('/cultivos/all')
    .get(verificarToken, checkPermiso('cultivo', 'ver'), getAllCultivos);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('tipo_propiedad', 'ver'), getAllTipoPropiedad);

router
    .route('/sectores/all')
    .get(verificarToken, checkPermiso('sector', 'ver'), getAllSectores);

router
    .route('/parroquias/all')
    .get(verificarToken, checkPermiso('parroquia', 'ver'), getAllParroquias);

router
    .route('/municipios/all')
    .get(verificarToken, checkPermiso('municipio', 'ver'), getAllMunicipios);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('estado', 'ver'), getAllEstados);

router
    .route('/productores/all')
    .get(verificarToken, checkPermiso('productor', 'ver'), getAllProductores);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getPropiedad)
    .put(verificarToken, checkPermiso('propiedad', 'editar'), updatePropiedad)
    .delete(verificarToken, checkPermiso('propiedad', 'eliminar'), deletePropiedad);

module.exports = router;