const User = require('../models/User');

/**
 * Severity → alert radius mapping (metres).
 * severity 3 (critical) → 500 m
 * severity 2 (high)     → 250 m
 * severity 1 (medium)   → 150 m
 * severity 0 (low)      →   0 m  (no alert)
 */
const SEVERITY_RADIUS_MAP = { 3: 500, 2: 250, 1: 150, 0: 0 };
const DEFAULT_RADIUS_METERS = 500;

const getAlertRadius = (severity) => {
  const s = Math.round(Number(severity));
  if (s in SEVERITY_RADIUS_MAP) return SEVERITY_RADIUS_MAP[s];
  return s >= 3 ? 500 : 0;
};

/**
 * Find users whose stored location is within `radiusMeters` of the incident.
 *
 * Prefers $near (requires 2dsphere index) for accuracy.
 * Falls back to $geoWithin/$centerSphere if the index is absent or the
 * operator is rejected in the current query context.
 */
const findUsersNearIncident = async (incident, radiusMeters = DEFAULT_RADIUS_METERS) => {
  if (radiusMeters <= 0) return [];

  // --- Primary: $near (accurate, sorted by distance) ----------------------
  try {
    const users = await User.find({
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [incident.longitude, incident.latitude] },
          $maxDistance: radiusMeters
        }
      }
    }).lean();
    return users;
  } catch (_nearErr) {
    // Fall through to $geoWithin if $near fails (no 2dsphere index, or context issue)
  }

  // --- Fallback: $geoWithin/$centerSphere (no index required) --------------
  try {
    const EARTH_RADIUS_M = 6378100;
    const users = await User.find({
      location: {
        $geoWithin: {
          $centerSphere: [
            [incident.longitude, incident.latitude],
            radiusMeters / EARTH_RADIUS_M
          ]
        }
      }
    }).lean();
    return users;
  } catch (_err) {
    return [];
  }
};

module.exports = { DEFAULT_RADIUS_METERS, getAlertRadius, findUsersNearIncident };
