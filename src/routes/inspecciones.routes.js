const { Router } = require('express');
const verificarToken = require('../verificarToken');
const checkPermiso = require('../checkPermisos');
const multer = require('multer');
const path = require('path');
const {
    getAllInspecciones,
    getInspeccionesById,
    createInspecciones,
    updateInspecciones,
    deleteInspecciones,
    getAllEmpleados,
    getAllProgramas,
    getAllImagenes,
    getTiposInspeccion,
    getPropiedades,
    getEstados
} = require('../controllers/inspecciones.controller');

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
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getAllInspecciones)
    .post(verificarToken, checkPermiso('inspecciones', 'crear'), upload.array('imagenes', 10), createInspecciones);

router
    .route('/empleados/all')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getAllEmpleados);

router
    .route('/programas/all')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getAllProgramas);

router
    .route('/imagenes/:inspeccion_est_id')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getAllImagenes);

router
    .route('/tipo-inspeccion/all')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getTiposInspeccion);

router
    .route('/propiedades/all')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getPropiedades);

router
    .route('/estados/all')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getEstados);

    router
    .route('/:id')
    .get(verificarToken, checkPermiso('inspecciones', 'ver'), getInspeccionesById)
    .put(verificarToken, checkPermiso('inspecciones', 'editar'), upload.array('imagenes', 10), updateInspecciones)
    .delete(verificarToken, checkPermiso('inspecciones', 'eliminar'), deleteInspecciones);

module.exports = router;