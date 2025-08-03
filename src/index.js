const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const empleadoRoutes = require('./routes/empleado.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const loginRoutes = require('./routes/auth.routes');
const recuperacionRoutes = require('./routes/recuperacion.routes');
const bitacoraRoutes = require('./routes/bitacora.routes');
const cargoRoutes = require('./routes/cargo.routes');
const tipo_usuario = require('./routes/tipo_usuario.routes');
const miusuario = require('./routes/miusuario.routes');
const tipo_propiedad = require('./routes/tipo_propiedad.routes');
const tipo_solicitud = require('./routes/tipo_solicitud.routes');
const tipo_programa = require('./routes/tipo_programa.routes');
const tipo_plaga = require('./routes/tipo_plaga.routes');
const tipo_permiso = require('./routes/tipo_permiso.routes');
const tipo_laboratorio = require('./routes/tipo_laboratorio.routes');
const tipo_inspeccion = require('./routes/tipo_inspeccion.routes');
const tipo_evento = require('./routes/tipo_evento.routes');
const tipo_cultivo = require('./routes/tipo_cultivo.routes');
const estado = require('./routes/estado.routes');
const municipio = require('./routes/municipio.routes');
const parroquia = require('./routes/parroquia.routes');
const sector = require('./routes/sector.routes');
const laboratorio = require('./routes/laboratorio.routes');
const plagas = require('./routes/plaga.routes');
const cultivo = require('./routes/cultivo.routes');
const programa = require('./routes/programa.routes');
const productor = require('./routes/productor.routes');
const propiedad = require('./routes/propiedad.routes');
const inspecciones = require('./routes/inspecciones.routes');
const solicitud = require('./routes/solicitud.routes');
const planificacion = require('./routes/planificacion.routes');
const notificacionRoutes = require('./routes/notificacion.routes');
const seguimiento = require('./routes/seguimiento.routes');

const app = express();
app.use(express.json());

// Middlewares
app.use(cors());
app.use(morgan('dev'));



// base para las rutas
app.use('/seguimiento', seguimiento);
app.use('/notificaciones', notificacionRoutes);
app.use('/planificacion', planificacion);
app.use('/solicitud', solicitud);
app.use('/uploads/inspeccion_est', express.static(path.join(__dirname, '../uploads/inspeccion_est')));
app.use('/inspecciones', inspecciones);
app.use('/propiedad', propiedad);
app.use('/productor', productor);
app.use('/programa', programa);
app.use('/cultivo', cultivo);
app.use('/plagas', plagas);
app.use('/laboratorio', laboratorio);
app.use('/estado', estado);
app.use('/municipio', municipio);
app.use('/parroquia', parroquia);
app.use('/sector', sector);
app.use('/tipo_cultivo', tipo_cultivo);
app.use('/tipo_evento', tipo_evento);
app.use('/tipo_inspeccion', tipo_inspeccion);
app.use('/tipo_laboratorio', tipo_laboratorio);
app.use('/tipo_permiso', tipo_permiso);
app.use('/tipo_programa', tipo_programa);
app.use('/tipo_solicitud', tipo_solicitud);
app.use('/tipo_plaga', tipo_plaga);
app.use('/tipopropiedad', tipo_propiedad);
app.use('/miusuario', miusuario);
app.use('/roles', tipo_usuario);
app.use('/cargo', cargoRoutes); 
app.use('/empleados', empleadoRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/auth', loginRoutes);
app.use('/recuperacion', recuperacionRoutes);
app.use('/bitacora', bitacoraRoutes);



//prueba de ruta
// app.get('/cargo/test', (req, res) => {
//     res.send('¡Ruta de prueba funcionando!');
// });

// Manejador de errores globales
app.use((req, res, next) => {
    res.status(404).json({
        message: 'Ruta no encontrada',
    });
});

app.use((err, req, res, next) => {
    console.error('Error capturado:', err.stack); // Log del error completo
    res.status(err.status || 500).json({
        message: 'Ocurrió un error interno en el servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Error interno', // Muestra más detalles en desarrollo
    });
});
// Escuchar en el puerto
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});
