import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

const LOCATION_ERROR_MESSAGE = 'Location access required';

const requestAndroidPermission = async () => {
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
    title: 'Location access required',
    message: 'SentinelX needs location to show nearby incidents and exact coordinates.',
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
      timeout: 9000,
      maximumAge: 0
    });
  });

const getPositionWithRetry = async (maxAttempts = 3) => {
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      const position = await getPosition();
      return position;
    } catch (error) {
      attempt += 1;
      if (attempt >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error('Unable to resolve location');
};

export const useUserLocation = () => {
  const [coordinate, setCoordinate] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const watchIdRef = useRef(null);

  const trackLocation = useCallback(() => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        setCoordinate([position.coords.longitude, position.coords.latitude]);
        setManualMode(false);
        setLocationError('');
      },
      (error) => {
        setLocationError('Live tracking lost. Please check GPS.');
        console.warn('Geolocation Error:', error);
      },
      { enableHighAccuracy: true, distanceFilter: 10, interval: 5000, fastestInterval: 2000 }
    );
  }, []);

  const resolveLocation = useCallback(async () => {
    setIsResolving(true);
    setLocationError('');

    try {
      const position = await getPositionWithRetry(3);
      setCoordinate([position.coords.longitude, position.coords.latitude]);
      setManualMode(false);
      trackLocation();
    } catch (_error) {
      setLocationError('GPS unavailable after 3 retries. Use manual location.');
      setManualMode(true);
    } finally {
      setIsResolving(false);
    }
  }, [trackLocation]);

  const initialize = useCallback(async () => {
    const granted = await requestPermission();
    setPermissionGranted(granted);

    if (!granted) {
      setShowPermissionModal(true);
      setLocationError(LOCATION_ERROR_MESSAGE);
      return;
    }

    await resolveLocation();
  }, [resolveLocation]);

  useEffect(() => {
    initialize();
    return () => {
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
