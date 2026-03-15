const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

let firebaseReady = false;

const bootstrapFirebase = () => {
  if (firebaseReady) {
    return true;
  }

  try {
    if (admin.apps.length > 0) {
      firebaseReady = true;
      return true;
    }

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const fileValue = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      const serviceAccount = fs.existsSync(fileValue)
        ? JSON.parse(fs.readFileSync(path.resolve(fileValue), 'utf8'))
        : JSON.parse(fileValue);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseReady = true;
      return true;
    }
  } catch (error) {
    console.warn('FCM initialization skipped:', error.message);
  }

  return false;
};

const sendPushNotification = async ({ token, title, body, data }) => {
  if (!token) {
    return false;
  }

  const ready = bootstrapFirebase();
  if (!ready) {
    console.log('[FCM] Skipped push (Firebase not configured).');
    return false;
  }

  await admin.messaging().send({
    token,
    notification: {
      title,
      body
    },
    data
  });

  return true;
};

module.exports = {
  sendPushNotification
};
