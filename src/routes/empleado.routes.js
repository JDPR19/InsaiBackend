const { Router } = require('express');
const checkPermiso = require('../checkPermisos');
const verificarToken = require('../verificarToken'); 
const { 
    getAllEmpleados, 
    getEmpleado, 
    getAllCargos,
    createEmpleado, 
    updateEmpleado, 
    deleteEmpleado 
} = require('../controllers/empleado.controller');

const router = Router();

// Rutas para los empleados
router
    .route('/')
    .get(verificarToken, checkPermiso('empleados', 'ver'), getAllEmpleados)
    .post(verificarToken, checkPermiso('empleados', 'crear'), createEmpleado);

router
    .route('/cargos')
    .get(verificarToken, getAllCargos);

router
    .route('/:id')
    .get(verificarToken, checkPermiso('empleados', 'ver'), getEmpleado)
    .put(verificarToken, checkPermiso('empleados', 'editar'), updateEmpleado)
    .delete(verificarToken, checkPermiso('empleados', 'eliminar'), deleteEmpleado);

module.exports = router;