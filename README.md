# SentinelX: Urban Intelligence Platform 🌍🚨

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React Native](https://img.shields.io/badge/React_Native-0.84.1-blue.svg)](https://reactnative.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-Frontend-purple.svg)](https://vitejs.dev/)

**SentinelX** is an advanced, real-time Urban Intelligence Platform built to enhance public safety. It allows users to report incidents, verifies media using advanced AI (Gemini), and broadcasts verified alerts instantly to users in proximity and the central moderation dashboard.

---

## 🚀 Key Features

- **Live Incident Mapping**: Real-time integration with Mapbox to display crime data, accidents, and emergencies seamlessly.
- **AI-Powered Incident Verification**: Uses Google Gemini Vision AI to instantly analyze reported photos/videos for validity.
- **Proximity Alerts System**: Broadcasts instant push notifications & SMS alerts directly to citizens near an emergency.
- **Moderation Dashboard**: Admin web interface to monitor, verify, and broadcast regional incidents across a city.
- **Safety Overlays**: Heatmap generation and real-time safety scores based on current crime trends.

---

## 🏗️ Architecture

The platform architecture is divided into three distinct zones:
- **📱 Mobile App (`/mobile/react-native-mapbox-app`)**: A Bare React Native application prioritizing maps (Mapbox), geolocation, gesture handlers, and push notifications.
- **🖥️ Admin Panel (`/admin`)**: A React (Vite) single-page application orchestrating map dashboards, managing real-time websocket queues, and giving dispatchers full situational awareness.
- **🗄️ Backend API (`/server`)**: A Node.js + Express backend powered by MongoDB. Hosts REST/WebSocket endpoints and orchestrates third-party integrations (Twilio, Firebase, Gemini AI).

---

## ⚙️ Environment Variables

For security, all secrets are isolated into `.env` files. Ensure you have the following environments configured before running:

### `server/.env`
```env
PORT=8088
MONGO_URI=mongodb://127.0.0.1:27017/sentinelx
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_phone
FIREBASE_SERVICE_ACCOUNT_JSON=./path_to_service_account.json
```

### `mobile/react-native-mapbox-app/.env`
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```
*(Note: Mapbox fallback tokens or custom environments can be configured as needed)*

---

## 🛠️ Setup & Installation

Ensure you have Node.js (`>= 22.x`), npm/yarn, and MongoDB running on your system.

### 1. Server Setup
```bash
cd server
npm install
npm start
```
*The API will run natively on `http://localhost:8088`.*

### 2. Admin Dashboard Setup
```bash
cd admin
npm install
npm run dev
```
*The web dashboard is served natively on the standard Vite port `5173`.*

### 3. Mobile App Setup
Depending on your OS and the targeted platform (iOS/Android):
```bash
cd mobile/react-native-mapbox-app
npm install

# For Android
npx react-native run-android

# For iOS
cd ios && pod install && cd ..
npx react-native run-ios
```
*(Change `API_HOST` in `mobile/react-native-mapbox-app/services/config.js` to your specific local network IP if debugging physical devices).*

---

## 🤝 Contribution Guidelines

We highly encourage contributions. To contribute:
1. Fork the project.
2. Create a specific feature branch (`git switch -c feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a new Pull Request.

---

*Stay safe, stay connected with SentinelX.* 
