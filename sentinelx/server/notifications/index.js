const { findUsersNearIncident } = require('../services/geofenceService');
const { canSendSmsForIncident, markNotificationSent } = require('../services/notificationPolicyService');
const { sendPushNotification } = require('./fcm');
const { sendSmsAlert } = require('./sms');

const buildDistanceHint = (meters = 200) => `${Math.round(meters)}m`;

const notifyNearbyUsers = async (incident) => {
  if (incident.status !== 'verified') {
    return;
  }

  const users = await findUsersNearIncident(incident, 500);
  const dailySmsLimit = Number(process.env.SMS_DAILY_LIMIT || 3);

  await Promise.all(
    users.map(async (user) => {
      const title = `[SentinelX] ${incident.type} nearby`;
      const body = `${incident.type} reported ${buildDistanceHint()} from you.`;

      let pushSent = false;

      try {
        pushSent = await sendPushNotification({
          token: user.fcm_token,
          title,
          body,
          data: {
            incidentId: incident.id,
            type: incident.type
          }
        });

        if (pushSent) {
          await markNotificationSent({
            incidentId: incident.id,
            userId: user.user_id,
            channel: 'push'
          });
        }
      } catch (error) {
        console.warn(`[FCM] Failed for user ${user.user_id}: ${error.message}`);
      }

      if (pushSent) {
        return;
      }

      const canSms =
        user.sms_opt_in &&
        user.phone_number &&
        (await canSendSmsForIncident({
          incidentId: incident.id,
          userId: user.user_id,
          dailyLimit: dailySmsLimit
        }));

      if (!canSms) {
        return;
      }

      try {
        const smsSent = await sendSmsAlert({
          phoneNumber: user.phone_number,
          text: `SentinelX alert: ${incident.type} ~${buildDistanceHint()} from you.`
        });

        if (smsSent) {
          await markNotificationSent({
            incidentId: incident.id,
            userId: user.user_id,
            channel: 'sms'
          });
        }
      } catch (error) {
        console.warn(`[Twilio] Failed for user ${user.user_id}: ${error.message}`);
      }
    })
  );
};

module.exports = {
  notifyNearbyUsers
};
