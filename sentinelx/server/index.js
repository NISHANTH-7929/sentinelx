require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const connectDB = require('./config/db');
const { wss } = require('./websocket');

connectDB();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api', require('./api/routes'));
app.use('/admin', require('./api/adminRoutes'));

// Attach websocket to the http server
server.on('upgrade', (request, socket, head) => {
    if (request.url === '/ws/incidents') {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit('connection', ws, request);
        });
    } else {
        socket.destroy();
    }
});

const PORT = 8088; // Hardcoded to bypass Windows PowerShell environment bleeding

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
