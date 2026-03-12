const User = require('../models/User');

const DEFAULT_RADIUS_METERS = 500;

const findUsersNearIncident = async (incident, radiusMeters = DEFAULT_RADIUS_METERS) => {
  const users = await User.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [incident.longitude, incident.latitude]
        },
        $maxDistance: radiusMeters
      }
    }
  });

  return users;
};

module.exports = {
  DEFAULT_RADIUS_METERS,
  findUsersNearIncident
};
