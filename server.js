
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware para parsear el cuerpo de las solicitudes como JSON
app.use(express.json());

// Servir archivos estáticos (como tu index.html)
app.use(express.static(__dirname));

// --- API Endpoints ---

// Obtener todos los eventos
app.get('/api/events', (req, res) => {
    fs.readFile(DB_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') { // Si el archivo no existe, devuelve un array vacío
                return res.json([]);
            }
            console.error('Error reading database file:', err);
            return res.status(500).json({ message: 'Error reading database' });
        }
        res.json(JSON.parse(data));
    });
});

// Guardar todos los eventos
app.post('/api/events', (req, res) => {
    const events = req.body;
    fs.writeFile(DB_FILE, JSON.stringify(events, null, 2), 'utf8', (err) => {
        if (err) {
            console.error('Error writing to database file:', err);
            return res.status(500).json({ message: 'Error saving events' });
        }
        res.status(200).json({ message: 'Events saved successfully' });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
