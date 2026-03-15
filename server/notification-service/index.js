// const admin = require('firebase-admin');
// const twilio = require('twilio');

// Initialize placeholders
let twilioClient = null;
let msgServiceVars = { twilioPhone: process.env.TWILIO_PHONE_NUMBER };

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    // twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

const notifyUsers = async (incident) => {
    console.log(`[Notification Service] Triggered for incident ${incident.id}`);

    // In a real app we would query MongoDB for users within 500m
    // Example: User.find({ location: { $near: { $geometry: { type: "Point", coordinates: [incident.longitude, incident.latitude] }, $maxDistance: 500 } } })

    console.log(`[FCM] Sending Push Notification: [SentinelX] ${incident.type} nearby. ${incident.description} reported near you.`);

    // SMS Fallback
    if (twilioClient && msgServiceVars.twilioPhone) {
        console.log(`[Twilio] Sending SMS: SentinelX alert: ${incident.type} nearby.`);
    }
};

module.exports = { notifyUsers };
