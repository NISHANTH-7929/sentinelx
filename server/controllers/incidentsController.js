const Incident = require('../models/Incident');
const { ingestIncident } = require('../services/incidentIngestionService');

const createIncident = async (req, res) => {
  try {
    const incident = await ingestIncident(req.body, req.files || []);
    res.status(201).json(incident);
  } catch (error) {
    res.status(400).json({ error: error.message || 'Unable to create incident' });
  }
};

const getIncidents = async (req, res) => {
  try {
    const { bbox, since, type, status, source, exclude_source } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (source) {
      query.source = source;
    }

    if (exclude_source) {
      query.source = { $ne: exclude_source };
    }

    if (since) {
      query.datetime = { $gte: new Date(since) };
    }

    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = String(bbox)
        .split(',')
        .map(Number);

      if ([minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
        query.location = {
          $geoWithin: {
            $box: [
              [minLng, minLat],
              [maxLng, maxLat]
            ]
          }
        };
      }
    }

    const incidents = await Incident.find(query).sort({ datetime: -1 }).limit(1000).lean();
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Unable to fetch incidents' });
  }
};

module.exports = {
  createIncident,
  getIncidents
};
