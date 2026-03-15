import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const requestAndroidPermission = async () => {
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: 'Location Access',
    message: 'SentinelX needs location access to show nearby incidents and your exact position on the map.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny'
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
};

const requestPermission = async () => {
  if (Platform.OS === 'android') {
    return requestAndroidPermission();
  }

  const status = await Geolocation.requestAuthorization('whenInUse');
  return status === 'granted';
};

const getPosition = () =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0
    });
  });

const getPositionWithRetry = async (maxAttempts = 3) => {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxAttempts) {
    try {
      return await getPosition();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw lastError;
      }
      // Small delay between retries
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  throw lastError || new Error('Unable to resolve location');
};

export const useUserLocation = () => {
  const [coordinate, setCoordinate] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const watchIdRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const trackLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        if (mountedRef.current) {
          setCoordinate([position.coords.longitude, position.coords.latitude]);
          setManualMode(false);
          setLocationError('');
        }
      },
      () => {
        if (mountedRef.current) {
          setLocationError('Live tracking interrupted. Tap "Retry GPS" to reconnect.');
        }
      },
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000, fastestInterval: 2000 }
    );
  }, []);

  const resolveLocation = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsResolving(true);
    setLocationError('');

    try {
      const position = await getPositionWithRetry(3);
      if (!mountedRef.current) return;
      setCoordinate([position.coords.longitude, position.coords.latitude]);
      setManualMode(false);
      trackLocation();
    } catch (error) {
      if (!mountedRef.current) return;
      const code = error?.code;
      if (code === 1) {
        setLocationError('Location permission denied. Please enable it in Settings.');
      } else if (code === 2) {
        setLocationError('GPS signal unavailable. Move to an open area or use manual location.');
      } else if (code === 3) {
        setLocationError('Location request timed out. Tap "Retry GPS" or use manual location.');
      } else {
        setLocationError('Unable to get your location. Use manual location or retry.');
      }
      setManualMode(true);
    } finally {
      if (mountedRef.current) {
        setIsResolving(false);
      }
    }
  }, [trackLocation]);

  const initialize = useCallback(async () => {
    try {
      const granted = await requestPermission();
      if (!mountedRef.current) return;
      setPermissionGranted(granted);

      if (!granted) {
        setShowPermissionModal(true);
        setLocationError('Location permission required. Please allow access.');
        return;
      }

      await resolveLocation();
    } catch (_error) {
      if (mountedRef.current) {
        setLocationError('Unable to initialize location services.');
        setManualMode(true);
      }
    }
  }, [resolveLocation]);

  useEffect(() => {
    const handle = setTimeout(() => {
      initialize();
    }, 0);

    return () => {
      clearTimeout(handle);
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [initialize]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  const useManualLocation = useCallback(() => {
    setManualMode(true);
    setLocationError('');
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const setManualCoordinate = useCallback((nextCoordinate) => {
    setCoordinate(nextCoordinate);
    setManualMode(true);
    setLocationError('');
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const locationEnabled = useMemo(() => permissionGranted && Boolean(coordinate), [permissionGranted, coordinate]);

  return {
    coordinate,
    permissionGranted,
    showPermissionModal,
    setShowPermissionModal,
    manualMode,
    locationError,
    isResolving,
    locationEnabled,
    resolveLocation,
    openSettings,
    useManualLocation,
    setManualCoordinate
  };
};
