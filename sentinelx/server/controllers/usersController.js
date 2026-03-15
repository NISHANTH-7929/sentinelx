const User = require('../models/User');

const upsertUser = async (req, res) => {
  try {
    const {
      user_id,
      name = '',
      fcm_token = '',
      phone_number = '',
      sms_opt_in = false,
      latitude,
      longitude
    } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }

    const update = {
      name,
      fcm_token,
      phone_number,
      sms_opt_in: Boolean(sms_opt_in),
      last_seen_at: new Date()
    };

    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      update.location = {
        type: 'Point',
        coordinates: [Number(longitude), Number(latitude)]
      };
    }

    const user = await User.findOneAndUpdate(
      { user_id },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to upsert user profile' });
  }
};

/**
 * PATCH /api/users/location
 * Lightweight endpoint to update only a user's location without re-registering all fields.
 */
const updateUserLocation = async (req, res) => {
  try {
    const { user_id, latitude, longitude } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }

    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: 'Valid latitude and longitude are required' });
      return;
    }

    const user = await User.findOneAndUpdate(
      { user_id },
      {
        $set: {
          location: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          last_seen_at: new Date()
        }
      },
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: 'User not found. Register first via POST /api/users/register.' });
      return;
    }

    res.json({ ok: true, location: user.location, last_seen_at: user.last_seen_at });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unable to update location' });
  }
};

module.exports = {
  upsertUser,
  updateUserLocation
};
