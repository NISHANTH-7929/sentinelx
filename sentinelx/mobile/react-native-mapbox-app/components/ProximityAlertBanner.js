import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUTO_DISMISS_MS = 8000;

const SEVERITY_CONFIG = {
  3: { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
  2: { label: 'HIGH',     color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)' },
  1: { label: 'MEDIUM',  color: '#eab308', bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.35)'  }
};

const prettyType = (type = 'incident') =>
  type
    .split(/[\s_-]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

/**
 * ProximityAlertBanner
 *
 * A sliding-in-from-top alert banner displayed when a verified incident is
 * detected near the user via the WebSocket stream.
 *
 * Props:
 *   alert      – { incident, distanceMeters } | null
 *   onDismiss  – callback to clear activeAlert
 *   onTap      – callback(incident) — called when the user taps the banner
 */
export default function ProximityAlertBanner({ alert, onDismiss, onTap }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef(null);

  const slideOut = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
    }
    Animated.parallel([
      Animated.timing(translateY, { toValue: -200, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 280, useNativeDriver: true })
    ]).start(() => onDismiss?.());
  }, [translateY, opacity, onDismiss]);

  useEffect(() => {
    if (!alert) {
      translateY.setValue(-200);
      opacity.setValue(0);
      return;
    }

    // Slide in
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 60,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true
      })
    ]).start();

    // Auto-dismiss after 8 seconds
    dismissTimer.current = setTimeout(slideOut, AUTO_DISMISS_MS);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [alert, translateY, opacity, slideOut]);

  if (!alert) {
    return null;
  }

  const { incident, distanceMeters } = alert;
  const severity = Math.min(Math.max(Math.round(Number(incident.severity) || 1), 1), 3);
  const cfg = SEVERITY_CONFIG[severity];
  const topPad = insets.top + (Platform.OS === 'android' ? 4 : 0);

  const handleTap = () => {
    slideOut();
    onTap?.(incident);
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { top: topPad, transform: [{ translateY }], opacity }
      ]}
      pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleTap}
        style={[
          styles.card,
          {
            backgroundColor: 'rgba(8,16,32,0.97)',
            borderColor: cfg.border
          }
        ]}>
        {/* Top row: badge + dismiss */}
        <View style={styles.topRow}>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>
              {cfg.label}
            </Text>
          </View>
          <Text style={styles.verifiedTag}>✓ AI Verified</Text>
          <TouchableOpacity
            onPress={slideOut}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.alertEmoji}>🚨</Text>
          <View style={styles.titleTextWrap}>
            <Text style={styles.alertTitle}>SentinelX Alert</Text>
            <Text style={styles.incidentType}>{prettyType(incident.type)} reported near your location</Text>
          </View>
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>DISTANCE</Text>
            <Text style={styles.metaValue}>{distanceMeters} m</Text>
          </View>
          <View style={styles.metaSep} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>STATUS</Text>
            <Text style={[styles.metaValue, { color: '#22c55e' }]}>AI Verified</Text>
          </View>
          <View style={styles.metaSep} />
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>TYPE</Text>
            <Text style={styles.metaValue}>{prettyType(incident.type)}</Text>
          </View>
        </View>

        {/* CTA */}
        <Text style={styles.cta}>Tap to view details →</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 99999
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 5
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1
  },
  verifiedTag: {
    fontSize: 11,
    color: '#22c55e',
    fontWeight: '700',
    flex: 1
  },
  closeBtn: {
    padding: 2
  },
  closeBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  alertEmoji: {
    fontSize: 26,
    marginRight: 10,
    marginTop: 1
  },
  titleTextWrap: { flex: 1 },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 2
  },
  incidentType: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 10
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0'
  },
  metaSep: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  cta: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '700',
    textAlign: 'center'
  }
});
