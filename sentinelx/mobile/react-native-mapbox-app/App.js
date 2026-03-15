import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import TabNavigator from './navigation/TabNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme/ThemeContext';
import { Animated, Easing, StyleSheet, StatusBar, Text, View } from 'react-native';
import ProximityAlertPermissionModal from './components/ProximityAlertPermissionModal';
import ProximityAlertBanner from './components/ProximityAlertBanner';
import { useProximityAlerts } from './hooks/useProximityAlerts';
import { useUserLocation } from './hooks/useUserLocation';
import { IncidentSocketClient } from './services/incidentsSocket';
import { enrichIncident } from './services/incidentClassifier';
import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from './services/config';

// ─── Initialize Mapbox ONCE globally (not inside a component) ────────────────
// This must happen before any MapView is rendered. Running it here means
// it runs exactly once when the module is first loaded.
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Navigation ref — lets ProximityAlertBanner navigate without prop drilling
export const navigationRef = createNavigationContainerRef();

// ─── Animated Splash Screen ──────────────────────────────────────────────────
function SplashScreen({ onDone }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true })
    ]).start();

    // Fade out after 2.4 s
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }).start(onDone);
    }, 2400);

    return () => clearTimeout(timer);
  }, [fadeAnim, logoScale, logoOpacity, onDone]);

  return (
    <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#020a14" />
      <Animated.View style={{ transform: [{ scale: logoScale }], opacity: logoOpacity, alignItems: 'center' }}>
        {/* Animated logo ring */}
        <View style={styles.logoRing}>
          <View style={styles.logoInner}>
            <Text style={styles.logoX}>X</Text>
          </View>
        </View>
        <Text style={styles.brandTitle}>
          SENTINEL<Text style={styles.brandAccent}>X</Text>
        </Text>
        <Text style={styles.subTitle}>Urban Intelligence Platform</Text>
      </Animated.View>
    </Animated.View>
  );
}

// ─── Proximity Alert Controller ───────────────────────────────────────────────
function ProximityAlertsController() {
  const [splashVisible, setSplashVisible] = useState(true);

  const { coordinate } = useUserLocation();
  const [incidents, setIncidents] = useState([]);
  const socketRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const client = new IncidentSocketClient({
      mode: 'all',
      onStatusChange: () => {},
      onIncident: (incoming) => {
        if (!mountedRef.current) return;
        const enriched = enrichIncident(incoming);
        setIncidents((prev) => {
          const deduped = [enriched, ...prev.filter((i) => i.id !== enriched.id)];
          return deduped.slice(0, 100);
        });
      }
    });
    socketRef.current = client;
    client.connect();
    return () => client.disconnect();
  }, []);

  const {
    showPermissionModal,
    dismissPermissionModal,
    grantPermissions,
    activeAlert,
    dismissAlert
  } = useProximityAlerts({ userCoordinate: coordinate, incidents });

  const handleAlertTap = useCallback((incident) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Operations', { focusIncident: incident });
    }
  }, []);

  const handleSplashDone = useCallback(() => setSplashVisible(false), []);

  return (
    <>
      <TabNavigator />

      <ProximityAlertPermissionModal
        visible={showPermissionModal}
        onEnable={grantPermissions}
        onDismiss={dismissPermissionModal}
      />

      <ProximityAlertBanner
        alert={activeAlert}
        onDismiss={dismissAlert}
        onTap={handleAlertTap}
      />

      {splashVisible && <SplashScreen onDone={handleSplashDone} />}
    </>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer ref={navigationRef}>
            <ProximityAlertsController />
          </NavigationContainer>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020a14',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999
  },
  logoRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 10
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155'
  },
  logoX: {
    fontSize: 36,
    fontWeight: '900',
    color: '#3b82f6'
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 3
  },
  brandAccent: {
    color: '#3b82f6'
  },
  subTitle: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    letterSpacing: 3.5,
    textTransform: 'uppercase'
  }
});
