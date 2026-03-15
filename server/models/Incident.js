const mongoose = require('mongoose');

const IncidentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  source: {
    type: String,
    enum: ['simulator', 'user', 'news', 'social', 'manual'],
    default: 'user'
  },
  type: {
    type: String,
    enum: ['murder', 'rape', 'theft', 'fire', 'accident', 'assault', 'other'],
    default: 'other'
  },
  description: { type: String, default: '' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  datetime: { type: Date, default: Date.now },
  severity: { type: Number, default: 1 },
  confidence: { type: Number, default: 0 },
  media_urls: [{ type: String }],
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  reporter_id: { type: String, default: 'anonymous' },
  created_at: { type: Date, default: Date.now }
});

IncidentSchema.index({ location: '2dsphere' });
IncidentSchema.index({ datetime: -1 });
IncidentSchema.index({ status: 1, datetime: -1 });

module.exports = mongoose.model('Incident', IncidentSchema);
