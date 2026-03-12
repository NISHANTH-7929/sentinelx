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

module.exports = {
  upsertUser
};
