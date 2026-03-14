import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../theme/ThemeContext';
import { useProximityAlerts } from '../hooks/useProximityAlerts';

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const cardAnim = useRef(new Animated.Value(0)).current;

  // Access the global proximity alert hook state via a separate local instance.
  // toggleAlertEnabled will update the module-level singleton, 
  // which the App-level hook also references.
  const { alertEnabled, toggleAlertEnabled } = useProximityAlerts({
    userCoordinate: null,
    incidents: []
  });

  React.useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      friction: 8,
      tension: 45,
      useNativeDriver: true
    }).start();
  }, [cardAnim]);

  const slideStyle = (offset = 18) => ({
    opacity: cardAnim,
    transform: [
      {
        translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] })
      }
    ]
  });

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>System Preferences</Text>

      {/* Appearance */}
      <Animated.View style={[styles.card, isDarkMode && styles.darkCard, slideStyle(18)]}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Dark Theme Map</Text>
            <Text style={styles.meta}>High-contrast map style for operations.</Text>
          </View>
          <Switch value={isDarkMode} onValueChange={toggleTheme} />
        </View>
      </Animated.View>

      {/* Proximity Alerts */}
      <Animated.View style={[styles.card, isDarkMode && styles.darkCard, slideStyle(26)]}>
        {/* Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionIcon}>🚨</Text>
          <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Proximity Alerts</Text>
          <View style={[styles.statusDot, { backgroundColor: alertEnabled ? '#22c55e' : '#64748b' }]} />
          <Text style={[styles.statusText, { color: alertEnabled ? '#22c55e' : '#64748b' }]}>
            {alertEnabled ? 'Active' : 'Inactive'}
          </Text>
        </View>

        {/* Toggle */}
        <View style={[styles.row, styles.toggleRow]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, isDarkMode && styles.darkText]}>Enable Proximity Alerts</Text>
            <Text style={styles.meta}>
              Receive in-app alerts when verified emergencies occur near you.
            </Text>
          </View>
          <Switch
            value={alertEnabled}
            onValueChange={toggleAlertEnabled}
            trackColor={{ false: '#334155', true: '#3b82f6' }}
            thumbColor={alertEnabled ? '#ffffff' : '#94a3b8'}
          />
        </View>

        {/* Alert radius legend */}
        <View style={[styles.legendBox, isDarkMode && styles.darkLegendBox]}>
          <Text style={styles.legendTitle}>SMART ALERT RADII</Text>
          {[
            { color: '#ef4444', label: 'CRITICAL', radius: '500 m', note: 'fire, explosion, violent crime' },
            { color: '#f97316', label: 'HIGH',     radius: '250 m', note: 'robbery, assault, dangerous activity' },
            { color: '#eab308', label: 'MEDIUM',   radius: '150 m', note: 'minor accident, suspicious activity' }
          ].map(({ color, label, radius, note }) => (
            <View key={label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.legendLabel, { color }]}>{label} · {radius}</Text>
                <Text style={styles.legendNote}>{note}</Text>
              </View>
            </View>
          ))}
          <Text style={styles.legendFooter}>LOW severity incidents appear on map only — no alert.</Text>
        </View>
      </Animated.View>

      {/* Diagnostics */}
      <Animated.View style={[styles.card, isDarkMode && styles.darkCard, slideStyle(34)]}>
        <Text style={[styles.label, isDarkMode && styles.darkText]}>Diagnostics</Text>
        <Text style={styles.meta}>
          Connection and map status are shown directly on the map screen.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecf3fa', padding: 16 },
  darkContainer: { backgroundColor: '#020617' },
  title: { fontSize: 26, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  darkText: { color: '#f8fafc' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.84)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d3e4f6',
    shadowColor: '#0f172a',
    shadowOpacity: 0.09,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 5
  },
  darkCard: { backgroundColor: 'rgba(17,24,39,0.9)', borderColor: '#1f2937' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, color: '#0f172a', fontWeight: '700' },
  meta: { marginTop: 3, color: '#64748b', fontSize: 12, maxWidth: 250 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionIcon: { fontSize: 16, marginRight: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  toggleRow: { marginBottom: 12 },
  legendBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  darkLegendBox: { backgroundColor: 'rgba(15,23,42,0.5)', borderColor: '#1e293b' },
  legendTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 8
  },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, marginTop: 3 },
  legendLabel: { fontSize: 12, fontWeight: '700' },
  legendNote: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  legendFooter: { fontSize: 10, color: '#64748b', marginTop: 6, fontStyle: 'italic' }
});
