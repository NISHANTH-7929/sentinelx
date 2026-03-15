const { getAlertRadius, findUsersNearIncident } = require('../services/geofenceService');
const {
  canSendPushForIncident,
  canSendSmsForIncident,
  markNotificationSent
} = require('../services/notificationPolicyService');
const { sendPushNotification } = require('./fcm');
const { sendSmsAlert } = require('./sms');

/**
 * Returns a human-readable severity label for use in notifications.
 */
const severityLabel = (severity) => {
  if (severity >= 3) return 'CRITICAL';
  if (severity === 2) return 'HIGH';
  if (severity === 1) return 'MEDIUM';
  return 'LOW';
};

/**
 * Capitalise the first letter of each word in the incident type.
 */
const prettyType = (type = 'incident') =>
  type
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const notifyNearbyUsers = async (incident) => {
  if (incident.status !== 'verified') {
    return;
  }

  // Determine alert radius based on severity; radius 0 = skip all alerts.
  const radius = getAlertRadius(incident.severity);
  if (radius === 0) {
    return;
  }

  const users = await findUsersNearIncident(incident, radius);
  const dailySmsLimit = Number(process.env.SMS_DAILY_LIMIT || 3);
  const typeName = prettyType(incident.type);

  await Promise.all(
    users.map(async (user) => {
      // ── Push notification ──────────────────────────────────────────────
      const canPush = await canSendPushForIncident({
        incidentId: incident.id,
        userId: user.user_id
      });

      if (canPush) {
        const title = '🚨 SentinelX Alert';
        const body = `${typeName} reported near your location. Tap to view details.`;

        try {
          const pushSent = await sendPushNotification({
            token: user.fcm_token,
            title,
            body,
            data: {
              incidentId: String(incident.id),
              type: incident.type,
              severity: String(incident.severity),
              latitude: String(incident.latitude),
              longitude: String(incident.longitude),
              status: 'AI Verified'
            }
          });

          if (pushSent) {
            await markNotificationSent({
              incidentId: incident.id,
              userId: user.user_id,
              channel: 'push'
            });
            // Push sent — skip SMS fallback for this user.
            return;
          }
        } catch (error) {
          console.warn(`[FCM] Failed for user ${user.user_id}: ${error.message}`);
        }
      }

      // ── SMS fallback ───────────────────────────────────────────────────
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
          text: `SentinelX Alert [${severityLabel(incident.severity)}]: ${typeName} reported near your location. Open the app for details.`
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
