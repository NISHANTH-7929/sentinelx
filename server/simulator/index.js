const fs = require('fs');
const path = require('path');
const { broadcastIncident } = require('../websocket');

// In memory fallback for the dataset in case file is absent
let fallbackData = [
    { type: "fire", description: "Large building fire", latitude: 13.0827, longitude: 80.2707, severity: 3, confidence: 0.9, status: "verified" },
    { type: "accident", description: "Car crash on highway", latitude: 13.05, longitude: 80.25, severity: 2, confidence: 0.85, status: "verified" },
    { type: "theft", description: "Purse snatched", latitude: 13.06, longitude: 80.23, severity: 1, confidence: 0.95, status: "verified" }
];

let data = fallbackData;
try {
    const filePath = path.join(__dirname, '../../datasets/chennai_crimes.json');
    if (fs.existsSync(filePath)) {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
} catch (error) {
    console.warn("Could not load chennai_crimes.json, using fallback data:", error.message);
}

let replayInterval = null;

const startReplay = (options = {}) => {
    const speed = options.replay_speed || 5;
    const loop = options.loop !== false;

    if (replayInterval) clearInterval(replayInterval);

    let i = 0;
    replayInterval = setInterval(async () => {
        if (i >= data.length) {
            if (loop) i = 0;
            else return stopReplay();
        }

        const rec = data[i++];

        const incidentOpt = {
            id: `sim-${Date.now()}-${i}`,
            source: "simulator",
            type: rec.type,
            description: rec.description,
            latitude: rec.latitude,
            longitude: rec.longitude,
            datetime: new Date(),
            severity: rec.severity || 1,
            confidence: rec.confidence || 0.9,
            status: "verified"
        };

        // Broadcast directly to clients
        broadcastIncident(incidentOpt);

        console.log(`[Simulator] Emitted incident: ${incidentOpt.type}`);
    }, 1000 / speed);
};

const stopReplay = () => {
    if (replayInterval) {
        clearInterval(replayInterval);
        replayInterval = null;
    }
    console.log('[Simulator] Stopped replay');
};

module.exports = { startReplay, stopReplay };
