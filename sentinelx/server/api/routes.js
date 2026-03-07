const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Incident = require('../models/Incident');
const { classifyIncident } = require('../classifier');
const { broadcastIncident } = require('../websocket');
const { notifyUsers } = require('../notification-service');
const { startReplay, stopReplay } = require('../simulator');

// Create incident
router.post('/incidents', async (req, res) => {
    try {
        const payload = req.body;

        // 1. Run classifier
        const { type, confidence, severity, status } = classifyIncident(payload);

        let finalType = type || payload.type || 'other';
        const validTypes = ['murder', 'rape', 'theft', 'fire', 'accident', 'assault', 'other'];
        if (!validTypes.includes(finalType)) {
            finalType = 'other';
        }

        const newIncident = new Incident({
            id: payload.id || crypto.randomUUID(),
            source: payload.source || 'user',
            type: finalType,
            description: payload.description || '',
            latitude: payload.latitude,
            longitude: payload.longitude,
            location: {
                type: 'Point',
                coordinates: [payload.longitude, payload.latitude]
            },
            datetime: payload.datetime || new Date(),
            severity: severity,
            confidence: confidence,
            media_urls: payload.media_urls || [],
            status: status,
            reporter_id: payload.reporter_id || null,
        });

        await newIncident.save();

        // 2. If verified, broadcast and notify
        if (newIncident.status === 'verified') {
            broadcastIncident(newIncident);
            notifyUsers(newIncident).catch(err => console.error('Notification error', err));
        }

        res.status(201).json(newIncident);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Query incidents
router.get('/incidents', async (req, res) => {
    try {
        const { bbox, since, type, status } = req.query;
        let query = {};

        if (status) query.status = status;
        if (type) query.type = type;
        if (since) query.datetime = { $gte: new Date(since) };

        if (bbox) {
            // bbox = minLng,minLat,maxLng,maxLat
            const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(Number);
            query.location = {
                $geoWithin: {
                    $box: [
                        [minLng, minLat],
                        [maxLng, maxLat]
                    ]
                }
            };
        }

        const incidents = await Incident.find(query).sort({ datetime: -1 }).limit(500);
        res.json(incidents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Simulator endpoints
router.post('/simulate/start', (req, res) => {
    startReplay(req.body);
    res.json({ message: 'Simulator started' });
});

router.post('/simulate/stop', (req, res) => {
    stopReplay();
    res.json({ message: 'Simulator stopped' });
});

module.exports = router;
