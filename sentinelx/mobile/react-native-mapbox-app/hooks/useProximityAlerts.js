import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, PermissionsAndroid } from 'react-native';
import { DEFAULT_USER_ID } from '../services/config';
import { registerDevice, updateLocation } from '../services/proximityAlertService';

// ---------------------------------------------------------------------------
// Module-level singleton store.
// Shared across ALL hook instances so SettingsScreen toggle stays in sync.
// ---------------------------------------------------------------------------
let _permissionModalShown = false;
let _alertEnabled = true;
const _listeners = new Set();

const _setState = (key, value) => {
  if (key === 'alertEnabled') _alertEnabled = value;
  if (key === 'permissionModalShown') _permissionModalShown = value;
  _listeners.forEach((fn) => fn(key, value));
};

const _subscribe = (fn) => {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
};

// Severity radius map — handles BOTH numeric server severity (1-3)
// AND the string severityLevel added by enrichIncident ('Critical','High','Medium','Low')
// mirrors server geofenceService.js
const SEVERITY_RADIUS = {
  // Numeric keys (from server DB / raw incident.severity)
  3: 500,
  2: 250,
  1: 150,
  0: 0,
  // String keys (from enrichIncident severityLevel)
  Critical: 500,
  High: 250,
  Medium: 150,
  Low: 0
};

/** Haversine distance in metres between two [lng, lat] pairs. */
const haversineMeters = ([lng1, lat1], [lng2, lat2]) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const requestNotificationPermissionAndroid = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    {
      title: 'Notification Access',
      message: 'SentinelX needs permission to send you emergency alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny'
    }
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

/**
 * Derive the alert radius for an incident.
 * Checks numeric `severity` (from DB) and string `severityLevel` (from enrichIncident).
 * Returns 0 if LOW / unrecognized → no alert.
 */
const getIncidentRadius = (incident) => {
  // Prefer numeric server severity first
  if (incident.severity !== undefined && incident.severity !== null) {
    const n = Math.round(Number(incident.severity));
    if (n in SEVERITY_RADIUS) return SEVERITY_RADIUS[n];
  }
  // Fall back to string severityLevel from enrichIncident
  if (incident.severityLevel && incident.severityLevel in SEVERITY_RADIUS) {
    return SEVERITY_RADIUS[incident.severityLevel];
  }
  return 150; // default MEDIUM if neither is available
};

/**
 * useProximityAlerts
 *
 * Manages the full Smart Proximity Alerts lifecycle.
 * Uses a module-level pub/sub store so multiple hook instances stay in sync.
 *
 * @param {object} opts
 * @param {Array|null} opts.userCoordinate  - [lng, lat] from useUserLocation
 * @param {Array}      opts.incidents        - live incidents array (all sources)
 */
export const useProximityAlerts = ({ userCoordinate, incidents = [] }) => {
  const [showPermissionModal, setShowPermissionModal] = useState(!_permissionModalShown);
  const [alertEnabled, setAlertEnabled] = useState(_alertEnabled);
  const [activeAlert, setActiveAlert] = useState(null);

  const shownAlerts = useRef(new Set());
  const lastSyncedCoord = useRef(null);
  const registeredRef = useRef(false);

  // ── Sync global state changes from other hook instances ──────────────────
  useEffect(() => {
    const unsub = _subscribe((key, value) => {
      if (key === 'alertEnabled') setAlertEnabled(value);
      if (key === 'permissionModalShown' && value) setShowPermissionModal(false);
    });
    return unsub;
  }, []);

  // ── Register device once we have a location ───────────────────────────────
  useEffect(() => {
    if (!userCoordinate || registeredRef.current) return;
    registeredRef.current = true;
    const [lng, lat] = userCoordinate;
    registerDevice({ userId: DEFAULT_USER_ID, fcmToken: '', latitude: lat, longitude: lng });
  }, [userCoordinate]);

  // ── Sync significant location changes (min 50 m) ─────────────────────────
  useEffect(() => {
    if (!userCoordinate || !alertEnabled) return;
    const last = lastSyncedCoord.current;
    if (last && haversineMeters(last, userCoordinate) < 50) return;
    lastSyncedCoord.current = userCoordinate;
    const [lng, lat] = userCoordinate;
    updateLocation({ userId: DEFAULT_USER_ID, latitude: lat, longitude: lng });
  }, [userCoordinate, alertEnabled]);

  // ── Also sync when app comes back to foreground ───────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && userCoordinate && alertEnabled) {
        const [lng, lat] = userCoordinate;
        updateLocation({ userId: DEFAULT_USER_ID, latitude: lat, longitude: lng });
      }
    });
    return () => sub.remove();
  }, [userCoordinate, alertEnabled]);

  // ── Evaluate incoming incidents for proximity alerts ──────────────────────
  useEffect(() => {
    if (!userCoordinate || !alertEnabled || activeAlert) return;

    for (const incident of incidents) {
      // Accept both 'verified' and 'VERIFIED' status values
      const status = (incident.status || '').toLowerCase();
      if (status !== 'verified') continue;
      if (shownAlerts.current.has(incident.id)) continue;

      const radius = getIncidentRadius(incident);
      if (radius === 0) continue; // LOW severity — map only, no alert

      const dist = haversineMeters(userCoordinate, [incident.longitude, incident.latitude]);
      if (dist <= radius) {
        shownAlerts.current.add(incident.id);
        setActiveAlert({ incident, distanceMeters: Math.round(dist) });
        break; // Show one alert at a time
      }
    }
  }, [incidents, userCoordinate, alertEnabled, activeAlert]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const dismissAlert = useCallback(() => setActiveAlert(null), []);

  const grantPermissions = useCallback(async () => {
    await requestNotificationPermissionAndroid();
    _setState('permissionModalShown', true);
    if (userCoordinate) {
      const [lng, lat] = userCoordinate;
      registerDevice({ userId: DEFAULT_USER_ID, fcmToken: '', latitude: lat, longitude: lng });
    }
  }, [userCoordinate]);

  const dismissPermissionModal = useCallback(() => {
    _setState('permissionModalShown', true);
  }, []);

  const toggleAlertEnabled = useCallback((value) => {
    _setState('alertEnabled', value);
  }, []);

  return {
    showPermissionModal,
    dismissPermissionModal,
    grantPermissions,
    activeAlert,
    dismissAlert,
    alertEnabled,
    toggleAlertEnabled
  };
};
