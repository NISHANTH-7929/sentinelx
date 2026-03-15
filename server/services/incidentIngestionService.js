const { v4: uuidv4 } = require('uuid');

const Incident = require('../models/Incident');
const { classifyIncident, normalizeType } = require('./classifierService');
const { calculateSeverity } = require('./severityService');
const { getVerificationStatus } = require('./verificationService');
const { broadcastIncident } = require('../websocket/incidentsSocket');
const { notifyNearbyUsers } = require('../notifications');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseMediaUrls = (mediaUrls) => {
  if (Array.isArray(mediaUrls)) {
    return mediaUrls.filter(Boolean);
  }

  if (typeof mediaUrls === 'string') {
    if (mediaUrls.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(mediaUrls);
        return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
      } catch (_error) {
        return mediaUrls
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return mediaUrls
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const ingestIncident = async (payload, uploadedFiles = []) => {
  const latitude = toNumber(payload.latitude);
  const longitude = toNumber(payload.longitude);

  if (latitude === null || longitude === null) {
    throw new Error('latitude and longitude are required numbers');
  }

  const classification = classifyIncident({
    description: payload.description,
    category: payload.category,
    type: payload.type,
    confidence: payload.confidence
  });

  const type = normalizeType(payload.type || classification.type);
  const confidence = classification.confidence;
  const datetime = payload.datetime ? new Date(payload.datetime) : new Date();
  const status = getVerificationStatus(confidence);
  const severity = await calculateSeverity({
    type,
    description: payload.description,
    confidence,
    latitude,
    longitude,
    datetime
  });

  const mediaUrls = [
    ...parseMediaUrls(payload.media_urls),
    ...uploadedFiles.map((file) => `/uploads/${file.filename}`)
  ];

  const incident = await Incident.create({
    id: payload.id || uuidv4(),
    source: payload.source || 'user',
    type,
    description: payload.description || '',
    latitude,
    longitude,
    location: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    datetime,
    severity,
    confidence,
    media_urls: mediaUrls,
    status,
    reporter_id: payload.reporter_id || 'anonymous'
  });

  if (incident.status === 'verified') {
    broadcastIncident(incident.toObject());
    notifyNearbyUsers(incident.toObject()).catch((error) => {
      console.error('Notification failure:', error.message);
    });
  }

  return incident;
};

module.exports = {
  ingestIncident
};
