const { Pool } = require('pg');
const { db } = require('./config');

const pool = new Pool({
    user: db.user,
    password: db.password,
    host: db.host,
    port: db.port,
    database: db.database,
});
console.log('Conectando a la base de datos:', db);
// Prueba la conexión a PostgreSQL
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err);
    } else {
        console.log('Conexión exitosa a PostgreSQL:', res.rows[0].now);
    }
});

module.exports = pool;
