import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNavigationContainerRef } from '@react-navigation/native';
import TabNavigator from './navigation/TabNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme/ThemeContext';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import XLoadingAnimation from './components/XLoadingAnimation';
import ProximityAlertPermissionModal from './components/ProximityAlertPermissionModal';
import ProximityAlertBanner from './components/ProximityAlertBanner';
import { useProximityAlerts } from './hooks/useProximityAlerts';
import { useUserLocation } from './hooks/useUserLocation';
import { IncidentSocketClient } from './services/incidentsSocket';
import { enrichIncident } from './services/incidentClassifier';

// Navigation ref lets the ProximityAlertBanner navigate without the navigation prop
export const navigationRef = createNavigationContainerRef();

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#040b16" />
      <XLoadingAnimation size={90} color="#3b82f6" style={{ marginBottom: 24 }} />
      <Text style={styles.brandTitle}>
        SENTINEL<Text style={styles.brandAccent}>X</Text>
      </Text>
      <Text style={styles.subTitle}>Urban Intelligence</Text>
    </View>
  );
}

/**
 * ProximityAlertsController
 * Lives inside NavigationContainer so it can access the navigation ref,
 * and inside SafeAreaProvider so ProximityAlertBanner can use useSafeAreaInsets.
 */
function ProximityAlertsController() {
  const [isSplashVisible, setSplashVisible] = useState(true);

  // Root-level location tracking (shared with proximity alerts)
  const { coordinate } = useUserLocation();

  // Root-level incident stream (verified incidents only go to the alert engine)
  const [incidents, setIncidents] = useState([]);
  const socketRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const client = new IncidentSocketClient({
      mode: 'all', // receive both live AND simulator events for proximity alert evaluation
      onStatusChange: () => {},
      onIncident: (incoming) => {
        if (!mountedRef.current) return;
        const enriched = enrichIncident(incoming);
        setIncidents((prev) => {
          const deduped = [enriched, ...prev.filter((i) => i.id !== enriched.id)];
          return deduped.slice(0, 100); // cap memory
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

  // Splash timer
  useEffect(() => {
    const timer = setTimeout(() => setSplashVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <TabNavigator />

      {/* First-launch permission modal */}
      <ProximityAlertPermissionModal
        visible={showPermissionModal}
        onEnable={grantPermissions}
        onDismiss={dismissPermissionModal}
      />

      {/* In-app proximity alert banner */}
      <ProximityAlertBanner
        alert={activeAlert}
        onDismiss={dismissAlert}
        onTap={handleAlertTap}
      />

      {/* Splash screen overlay */}
      {isSplashVisible && <SplashScreen />}
    </>
  );
}

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
    backgroundColor: '#040b16',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999
  },
  brandTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2
  },
  brandAccent: {
    color: '#3b82f6'
  },
  subTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 4,
    textTransform: 'uppercase'
  }
});
