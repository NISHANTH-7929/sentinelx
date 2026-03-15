require('dotenv').config();

const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const connectDB = require('./config/db');
const incidentsRoutes = require('./routes/incidentsRoutes');
const simulatorRoutes = require('./routes/simulatorRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const { attachIncidentsWebsocket } = require('./websocket/incidentsSocket');

const PORT = Number(process.env.PORT || 8088);

const app = express();
const server = http.createServer(app);

connectDB();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'sentinelx-server' });
});

app.use('/api', incidentsRoutes);
app.use('/api', simulatorRoutes);
app.use('/api', userRoutes);
app.use('/admin', adminRoutes);

attachIncidentsWebsocket(server);

server.listen(PORT, () => {
  console.log(`SentinelX server listening on port ${PORT}`);
});
