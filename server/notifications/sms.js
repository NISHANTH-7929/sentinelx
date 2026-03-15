const twilio = require('twilio');

let smsClient;

const getSmsClient = () => {
  if (smsClient) {
    return smsClient;
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return null;
  }

  smsClient = twilio(sid, token);
  return smsClient;
};

const sendSmsAlert = async ({ phoneNumber, text }) => {
  const client = getSmsClient();
  if (!client || !process.env.TWILIO_PHONE_NUMBER || !phoneNumber) {
    console.log('[Twilio] Skipped SMS (Twilio not configured).');
    return false;
  }

  await client.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phoneNumber,
    body: text
  });

  return true;
};

module.exports = {
  sendSmsAlert
};
