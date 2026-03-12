const mongoose = require('mongoose');

const NotificationLogSchema = new mongoose.Schema({
  incident_id: { type: String, required: true },
  user_id: { type: String, required: true },
  channel: { type: String, enum: ['push', 'sms'], required: true },
  created_at: { type: Date, default: Date.now }
});

NotificationLogSchema.index({ incident_id: 1, user_id: 1, channel: 1 }, { unique: true });
NotificationLogSchema.index({ user_id: 1, channel: 1, created_at: -1 });

module.exports = mongoose.model('NotificationLog', NotificationLogSchema);
