import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeContext } from '../theme/ThemeContext';
import { useProximityAlerts } from '../hooks/useProximityAlerts';

/** Fade+slide a card in with a configurable delay */
function AnimatedCard({ children, delay, dark, style }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View
      style={[
        styles.card,
        dark && styles.darkCard,
        style,
        { opacity, transform: [{ translateY }] }
      ]}>
      {children}
    </Animated.View>
  );
}

/** Pulsing status indicator dot */
function StatusDot({ active }) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) { pulse.setValue(1); return; }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.5, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [active, pulse]);

  return (
    <Animated.View
      style={[
        styles.statusDot,
        { backgroundColor: active ? '#22c55e' : '#64748b', transform: [{ scale: pulse }] }
      ]}
    />
  );
}

export default function SettingsScreen() {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const { alertEnabled, toggleAlertEnabled } = useProximityAlerts({ userCoordinate: null, incidents: [] });

  const dark = isDarkMode;

  return (
    <SafeAreaView style={[styles.container, dark && styles.darkContainer]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        {/* Title */}
        <Text style={[styles.title, dark && styles.darkText]}>System Preferences</Text>

        {/* Appearance */}
        <AnimatedCard delay={60} dark={dark}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, dark && styles.darkText]}>Dark Theme Map</Text>
              <Text style={styles.meta}>High-contrast map style for operations.</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e1', true: '#1d4ed8' }}
              thumbColor="#ffffff"
            />
          </View>
        </AnimatedCard>

        {/* Proximity Alerts */}
        <AnimatedCard delay={160} dark={dark}>
          {/* Header row */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionIcon}>🚨</Text>
            <Text style={[styles.sectionTitle, dark && styles.darkText]}>Proximity Alerts</Text>
            <StatusDot active={alertEnabled} />
            <Text style={[styles.statusText, { color: alertEnabled ? '#22c55e' : '#64748b' }]}>
              {alertEnabled ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {/* Toggle */}
          <View style={[styles.row, { marginBottom: 14 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, dark && styles.darkText]}>Enable Proximity Alerts</Text>
              <Text style={styles.meta}>Get notified when verified emergencies occur near you.</Text>
            </View>
            <Switch
              value={alertEnabled}
              onValueChange={toggleAlertEnabled}
              trackColor={{ false: '#334155', true: '#3b82f6' }}
              thumbColor={alertEnabled ? '#ffffff' : '#94a3b8'}
            />
          </View>

          {/* Alert radius legend */}
          <View style={[styles.legendBox, dark && styles.darkLegendBox]}>
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
        </AnimatedCard>

        {/* Diagnostics */}
        <AnimatedCard delay={260} dark={dark}>
          <Text style={[styles.label, dark && styles.darkText]}>Diagnostics</Text>
          <Text style={styles.meta}>Connection and map status are shown on the Live Map screen.</Text>
        </AnimatedCard>

        {/* Version footer */}
        <AnimatedCard delay={340} dark={dark} style={{ alignItems: 'center', paddingVertical: 16 }}>
          <Text style={[styles.versionLabel, dark && { color: '#334155' }]}>SentinelX</Text>
          <Text style={styles.versionText}>Public Safety Intelligence Platform  ·  v2.0</Text>
        </AnimatedCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ecf3fa' },
  darkContainer: { backgroundColor: '#020617' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: 0.3
  },
  darkText: { color: '#f1f5f9' },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#d3e4f6',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4
  },
  darkCard: { backgroundColor: 'rgba(15,23,42,0.92)', borderColor: '#1e293b' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 16, color: '#0f172a', fontWeight: '700' },
  meta: { marginTop: 3, color: '#64748b', fontSize: 12, maxWidth: 250, lineHeight: 17 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionIcon: { fontSize: 16, marginRight: 7 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusText: { fontSize: 12, fontWeight: '700' },
  legendBox: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  darkLegendBox: { backgroundColor: 'rgba(15,23,42,0.55)', borderColor: '#1e293b' },
  legendTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 10
  },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, marginTop: 3 },
  legendLabel: { fontSize: 12, fontWeight: '700' },
  legendNote: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  legendFooter: { fontSize: 10, color: '#64748b', marginTop: 6, fontStyle: 'italic' },
  versionLabel: { fontSize: 13, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
  versionText: { fontSize: 11, color: '#64748b', marginTop: 3 }
});
