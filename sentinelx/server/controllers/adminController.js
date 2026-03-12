const Incident = require('../models/Incident');
const { broadcastIncident } = require('../websocket/incidentsSocket');
const { notifyNearbyUsers } = require('../notifications');

const getPendingIncidents = async (_req, res) => {
  try {
    const incidents = await Incident.find({ status: 'pending' }).sort({ datetime: -1 }).lean();
    res.json(incidents);
  } catch (_error) {
    res.status(500).json({ error: 'Unable to fetch pending incidents' });
  }
};

const approveIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id });
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    incident.status = 'verified';
    incident.confidence = Math.max(incident.confidence, 0.8);
    await incident.save();

    const incidentPayload = incident.toObject();
    broadcastIncident(incidentPayload);
    notifyNearbyUsers(incidentPayload).catch((error) => {
      console.error('Notification failure:', error.message);
    });

    res.json(incidentPayload);
  } catch (_error) {
    res.status(500).json({ error: 'Unable to approve incident' });
  }
};

const rejectIncident = async (req, res) => {
  try {
    const incident = await Incident.findOne({ id: req.params.id });
    if (!incident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    incident.status = 'rejected';
    await incident.save();

    res.json(incident.toObject());
  } catch (_error) {
    res.status(500).json({ error: 'Unable to reject incident' });
  }
};

module.exports = {
  getPendingIncidents,
  approveIncident,
  rejectIncident
};
