const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const { broadcastIncident } = require('../websocket');
const { notifyUsers } = require('../notification-service');

router.get('/incidents/pending', async (req, res) => {
    try {
        const incidents = await Incident.find({ status: 'pending' }).sort({ datetime: -1 });
        res.json(incidents);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.patch('/incidents/:id/approve', async (req, res) => {
    try {
        const incident = await Incident.findOne({ id: req.params.id });
        if (!incident) return res.status(404).json({ error: 'Not found' });

        incident.status = 'verified';
        incident.confidence = Math.max(incident.confidence, 0.8);
        await incident.save();

        broadcastIncident(incident);
        notifyUsers(incident).catch(err => console.error(err));

        res.json(incident);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

router.patch('/incidents/:id/reject', async (req, res) => {
    try {
        const incident = await Incident.findOne({ id: req.params.id });
        if (!incident) return res.status(404).json({ error: 'Not found' });

        incident.status = 'rejected';
        await incident.save();

        res.json(incident);
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
