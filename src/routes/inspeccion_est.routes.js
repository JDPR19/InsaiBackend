const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const multer = require('multer');
const path = require('path');
const {
    getAllInspeccionEst,
    getInspeccionEstById,
    createInspeccionEst,
    updateInspeccionEst,
    deleteInspeccionEst,
    getAllEmpleados,
    getAllProgramas,
    getAllImagenes,
    getTiposInspeccion,
    getPropiedades,
    getEstados
} = require('../controllers/inspeccion_est.controller');

const router = Router();

// Configuración de multer para subir imágenes
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/inspeccion_est')); // <--- ¡Así!
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });


router
    .route('/')
    .get(verificarToken, checkPermiso('inspeccion_est', 'ver'), getAllInspeccionEst)
    .post(verificarToken, checkPermiso('inspeccion_est', 'crear'), upload.array('imagenes', 10), createInspeccionEst);

router
    .route('/empleados/all')
    .get(verificarToken, checkPermiso('empleados', 'ver'), getAllEmpleados);

router
    .route('/programas/all')
    .get(verificarToken, checkPermiso('programa', 'ver'), getAllProgramas);

router
    .route('/imagenes/:inspeccion_est_id')
    .get(verificarToken, checkPermiso('inspeccion_est', 'ver'), getAllImagenes);

router
    .route('/tipo-inspeccion/all')
    .get(verificarToken, checkPermiso('tipo_inspeccion', 'ver'), getTiposInspeccion);

router
    .route('/propiedades/all')
    .get(verificarToken, checkPermiso('propiedad', 'ver'), getPropiedades);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('inspeccion_est', 'ver'), getEstados);

    router
    .route('/:id')
    .get(verificarToken, checkPermiso('inspeccion_est', 'ver'), getInspeccionEstById)
    .put(verificarToken, checkPermiso('inspeccion_est', 'editar'), upload.array('imagenes', 10), updateInspeccionEst)
    .delete(verificarToken, checkPermiso('inspeccion_est', 'eliminar'), deleteInspeccionEst);

module.exports = router;