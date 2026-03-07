const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    source: { type: String, enum: ['simulator', 'user', 'news', 'social', 'manual'], required: true },
    type: { type: String, enum: ['murder', 'rape', 'theft', 'fire', 'accident', 'assault', 'other'], required: true },
    description: { type: String },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true } // [longitude, latitude]
    },
    datetime: { type: Date, default: Date.now },
    severity: { type: Number, default: 1 },
    confidence: { type: Number, default: 0.0 },
    media_urls: [{ type: String }],
    status: { type: String, enum: ['pending', 'verified', 'rejected', 'expired'], default: 'pending' },
    reporter_id: { type: String, default: null },
    created_at: { type: Date, default: Date.now }
});

incidentSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Incident', incidentSchema);
