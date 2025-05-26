const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const empleadoRoutes = require('./routes/empleado.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const loginRoutes = require('./routes/auth.routes');
const bitacoraRoutes = require('./routes/bitacora.routes');
const cargoRoutes = require('./routes/cargo.routes');
const tipo_user = require('./routes/tipo_usuario.routes');



const app = express();
app.use(express.json());

// Middlewares
app.use(cors());
app.use(morgan('dev'));



// Define la base para las rutas
app.use('/tipo_usuario', tipo_user);
app.use('/cargo', cargoRoutes); 
app.use('/empleados', empleadoRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/auth', loginRoutes);
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
