const NotificationLog = require('../models/NotificationLog');

const startOfUtcDay = (date = new Date()) => {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  return dayStart;
};

const canSendSmsForIncident = async ({ incidentId, userId, dailyLimit }) => {
  const existing = await NotificationLog.findOne({
    incident_id: incidentId,
    user_id: userId,
    channel: 'sms'
  });

  if (existing) {
    return false;
  }

  const sentToday = await NotificationLog.countDocuments({
    user_id: userId,
    channel: 'sms',
    created_at: { $gte: startOfUtcDay(new Date()) }
  });

  return sentToday < dailyLimit;
};

const markNotificationSent = async ({ incidentId, userId, channel }) => {
  try {
    await NotificationLog.create({
      incident_id: incidentId,
      user_id: userId,
      channel
    });
  } catch (_error) {
    // Ignore duplicates.
  }
};

module.exports = {
  canSendSmsForIncident,
  markNotificationSent
};
