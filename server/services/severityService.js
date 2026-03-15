const Incident = require('../models/Incident');

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const HIGH_SEVERITY_TRIGGERS = ['terror', 'shooting', 'fire', 'major accident'];

/**
 * Check for a burst of same-type incidents within 500 m in the last 15 min.
 * Uses $geoWithin/$centerSphere instead of $near to avoid the
 * "not allowed in this context" restriction on countDocuments with filters.
 * $centerSphere expects [lng, lat] and radius in radians (meters / Earth radius).
 */
const hasNearbyBurst = async ({ latitude, longitude, type, datetime }) => {
  const windowStart = new Date(new Date(datetime).getTime() - FIFTEEN_MINUTES_MS);
  const EARTH_RADIUS_M = 6378100;
  const radiusRadians = 500 / EARTH_RADIUS_M;

  try {
    const count = await Incident.countDocuments({
      datetime: { $gte: windowStart },
      type,
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusRadians]
        }
      }
    });
    return count >= 2;
  } catch (_err) {
    // Geo index may not exist yet — degrade gracefully
    return false;
  }
};

const calculateSeverity = async ({ type, description, confidence, latitude, longitude, datetime }) => {
  const scanText = `${type || ''} ${description || ''}`.toLowerCase();

  if (HIGH_SEVERITY_TRIGGERS.some((token) => scanText.includes(token))) {
    return 3;
  }

  const nearbyBurst = await hasNearbyBurst({ latitude, longitude, type, datetime });

  if (confidence >= 0.7 || nearbyBurst) {
    return 2;
  }

  return 1;
};

module.exports = { calculateSeverity };
