import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PermissionRow = ({ icon, label, description }) => (
  <View style={styles.permRow}>
    <View style={styles.permIconWrap}>
      <Text style={styles.permIcon}>{icon}</Text>
    </View>
    <View style={styles.permText}>
      <Text style={styles.permLabel}>{label}</Text>
      <Text style={styles.permDesc}>{description}</Text>
    </View>
  </View>
);

export default function ProximityAlertPermissionModal({ visible, onEnable, onDismiss }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 9,
          tension: 55,
          useNativeDriver: true
        })
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      statusBarTranslucent
      onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.shieldWrap}>
                <Text style={styles.shieldEmoji}>🛡️</Text>
              </View>
              <Text style={styles.appName}>SENTINEL<Text style={styles.accent}>X</Text></Text>
            </View>

            {/* Title & body */}
            <Text style={styles.title}>Stay Safe,{'\n'}Stay Informed</Text>
            <Text style={styles.body}>
              SentinelX can notify you when emergencies occur near your
              location. Enable the permissions below to receive real-time
              safety alerts.
            </Text>

            {/* Permission rows */}
            <View style={styles.permList}>
              <PermissionRow
                icon="📍"
                label="Location Access"
                description="Used to calculate your distance from verified incidents."
              />
              <View style={styles.permDivider} />
              <PermissionRow
                icon="🔔"
                label="Notification Access"
                description="Allows SentinelX to alert you even when the app is closed."
              />
            </View>

            {/* Alert levels legend */}
            <View style={styles.legendBox}>
              <Text style={styles.legendTitle}>SMART ALERT RADII</Text>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.legendText}>Critical  ·  500 m</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: '#f97316' }]} />
                <Text style={styles.legendText}>High  ·  250 m</Text>
              </View>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: '#eab308' }]} />
                <Text style={styles.legendText}>Medium  ·  150 m</Text>
              </View>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.enableBtn}
              onPress={onEnable}
              activeOpacity={0.85}>
              <Text style={styles.enableBtnText}>Enable Alerts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.laterBtn}
              onPress={onDismiss}
              activeOpacity={0.7}>
              <Text style={styles.laterBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.85)',
    justifyContent: 'flex-end'
  },
  safeArea: {
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'android' ? 12 : 4
  },
  card: {
    backgroundColor: '#0c1825',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18
  },
  shieldWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(59,130,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  shieldEmoji: { fontSize: 22 },
  appName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f8fafc',
    letterSpacing: 2
  },
  accent: { color: '#3b82f6' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#f8fafc',
    lineHeight: 34,
    marginBottom: 10
  },
  body: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 18
  },
  permList: {
    backgroundColor: 'rgba(30,41,59,0.7)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.12)'
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  permIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59,130,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  permIcon: { fontSize: 16 },
  permText: { flex: 1 },
  permLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0'
  },
  permDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1
  },
  permDivider: {
    height: 1,
    backgroundColor: 'rgba(59,130,246,0.1)',
    marginHorizontal: -2
  },
  legendBox: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)'
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 1.5,
    marginBottom: 8
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 8
  },
  legendText: {
    fontSize: 12,
    color: '#94a3b8'
  },
  enableBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6
  },
  enableBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3
  },
  laterBtn: {
    alignItems: 'center',
    paddingVertical: 10
  },
  laterBtnText: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600'
  }
});
