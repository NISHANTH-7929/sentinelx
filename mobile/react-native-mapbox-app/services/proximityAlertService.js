import { API_BASE_URL, DEFAULT_USER_ID } from './config';

const REQUEST_TIMEOUT_MS = 8000;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Network timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Register or update this device on the server.
 * Stores the FCM token (or a placeholder), name, and initial location.
 * Safe to call on every app launch — the server upserts by user_id.
 */
export const registerDevice = async ({ userId, fcmToken = '', latitude, longitude }) => {
  const body = {
    user_id: userId || DEFAULT_USER_ID,
    fcm_token: fcmToken,
    name: 'SentinelX Mobile User'
  };

  if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    body.latitude = latitude;
    body.longitude = longitude;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'Registration failed');
    }

    return await response.json();
  } catch (error) {
    // Non-fatal — the app works without registration; alerts via WebSocket still function.
    console.warn('[ProximityAlerts] Device registration failed:', error.message);
    return null;
  }
};

/**
 * Lightweight location push — updates only the user's coordinates on the server.
 * Called whenever the device location changes significantly.
 */
export const updateLocation = async ({ userId, latitude, longitude }) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return;
  }

  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/location`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId || DEFAULT_USER_ID,
        latitude,
        longitude
      })
    });

    if (!response.ok) {
      // Swallow silently — not critical for UX.
      console.warn('[ProximityAlerts] Location update returned non-OK status:', response.status);
    }
  } catch (error) {
    console.warn('[ProximityAlerts] Location update failed:', error.message);
  }
};
