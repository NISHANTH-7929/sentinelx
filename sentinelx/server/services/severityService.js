const Incident = require('../models/Incident');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const HIGH_SEVERITY_TRIGGERS = ['terror', 'shooting', 'fire', 'major accident'];

const hasNearbyBurst = async ({ latitude, longitude, type, datetime }) => {
  const windowStart = new Date(new Date(datetime).getTime() - FIFTEEN_MINUTES_MS);

  const count = await Incident.countDocuments({
    datetime: { $gte: windowStart },
    type,
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: 500
      }
    }
  });

  return count >= 2;
};

const calculateSeverity = async ({ type, description, confidence, latitude, longitude, datetime }) => {
  const scanText = `${type || ''} ${description || ''}`.toLowerCase();

  if (HIGH_SEVERITY_TRIGGERS.some((token) => scanText.includes(token))) {
    return 3;
  }

  const nearbyBurst = await hasNearbyBurst({
    latitude,
    longitude,
    type,
    datetime
  });

  if (confidence >= 0.7 || nearbyBurst) {
    return 2;
  }

  return 1;
};

module.exports = {
  calculateSeverity
};
