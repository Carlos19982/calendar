// 1. Importar librerías (cambiamos sqlite3 por pg)
const express = require('express');
const { Pool } = require('pg'); // Usamos Pool de pg
const cors = require('cors');

// 2. Configuración inicial
const app = express();
const PORT = process.env.PORT || 3000; // Render usa una variable de entorno para el puerto

// 3. Middlewares
app.use(cors());
app.use(express.json());

// 4. Conectar a la base de datos PostgreSQL de Render
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Render nos dará esta URL como variable de entorno
    ssl: {
        rejectUnauthorized: false
    }
});

// Función para crear las tablas si no existen
const createTables = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre TEXT UNIQUE NOT NULL
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS eventos (
                id TEXT PRIMARY KEY,
                titulo TEXT NOT NULL,
                fecha_inicio TEXT NOT NULL,
                fecha_fin TEXT,
                descripcion TEXT,
                tipo TEXT NOT NULL,
                usuario_id INTEGER,
                FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
            );
        `);
        console.log('Tablas verificadas o creadas correctamente.');
    } catch (err) {
        console.error('Error al crear las tablas:', err);
    } finally {
        client.release();
    }
};


// --- 5. RUTAS DE LA API (Adaptadas para PostgreSQL) ---

app.post('/login', async (req, res) => {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });

    try {
        let user = await pool.query('SELECT * FROM usuarios WHERE nombre = $1', [nombre]);
        if (user.rows.length > 0) {
            res.json(user.rows[0]);
        } else {
            let newUser = await pool.query('INSERT INTO usuarios (nombre) VALUES ($1) RETURNING *', [nombre]);
            res.json(newUser.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/events/:userId/:calendarType', async (req, res) => {
    const { userId, calendarType } = req.params;
    let query;
    let params;

    if (calendarType === 'private') {
        query = 'SELECT e.id, e.titulo AS title, e.fecha_inicio AS "startDate", e.fecha_fin AS "endDate", e.descripcion AS description, u.nombre AS owner FROM eventos e JOIN usuarios u ON e.usuario_id = u.id WHERE e.tipo = $1 AND e.usuario_id = $2';
        params = ['private', userId];
    } else {
        query = 'SELECT e.id, e.titulo AS title, e.fecha_inicio AS "startDate", e.fecha_fin AS "endDate", e.descripcion AS description, u.nombre AS owner FROM eventos e JOIN usuarios u ON e.usuario_id = u.id WHERE e.tipo = $1';
        params = ['public'];
    }

    try {
        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/events', async (req, res) => {
    const { id, title, startDate, endDate, description, type, userId } = req.body;
    const query = 'INSERT INTO eventos (id, titulo, fecha_inicio, fecha_fin, descripcion, tipo, usuario_id) VALUES ($1, $2, $3, $4, $5, $6, $7)';
    try {
        await pool.query(query, [id, title, startDate, endDate, description, type, userId]);
        res.status(201).json({ id: id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/events/:id', async (req, res) => {
    const { id } = req.params;
    const { title, startDate, endDate, description } = req.body;
    const query = 'UPDATE eventos SET titulo = $1, fecha_inicio = $2, fecha_fin = $3, descripcion = $4 WHERE id = $5';
    try {
        const result = await pool.query(query, [title, startDate, endDate, description, id]);
        res.json({ updated: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/events/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM eventos WHERE id = $1', [id]);
        res.json({ deleted: result.rowCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 6. Iniciar el servidor
app.listen(PORT, '0.0.0.0', async () => {
    await createTables(); // Asegúrate de que las tablas existen al iniciar
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});