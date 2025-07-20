const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const {
    getAllPropiedades,
    getPropiedad,
    getProductoresConPropiedades,
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
    .route('/asociadas')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getProductoresConPropiedades);

router
    .route('/cultivos/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllCultivos);

router
    .route('/tipos/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllTipoPropiedad);

router
    .route('/sectores/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllSectores);

router
    .route('/parroquias/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllParroquias);

router
    .route('/municipios/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllMunicipios);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllEstados);

router
    .route('/productores/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getAllProductores);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getPropiedad)
    .put(verificarToken, checkPermiso('propiedad', 'editar'), updatePropiedad)
    .delete(verificarToken, checkPermiso('propiedad', 'eliminar'), deletePropiedad);

module.exports = router;