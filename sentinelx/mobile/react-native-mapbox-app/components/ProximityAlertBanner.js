import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Vibration
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AUTO_DISMISS_MS = 8000;

const SEVERITY_CONFIG = {
  3: { label: 'CRITICAL', color: '#ef4444', bg: 'rgba(239,68,68,0.14)', border: 'rgba(239,68,68,0.50)', glow: '#ef4444' },
  2: { label: 'HIGH',     color: '#f97316', bg: 'rgba(249,115,22,0.14)', border: 'rgba(249,115,22,0.50)', glow: '#f97316' },
  1: { label: 'MEDIUM',  color: '#eab308', bg: 'rgba(234,179,8,0.14)',  border: 'rgba(234,179,8,0.50)',  glow: '#eab308' }
};

const prettyType = (type = 'incident') =>
  type.split(/[\s_-]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/** Pulsing glow ring drawn around the alert emoji */
function PulsingGlowRing({ color }) {
  const scale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.55, duration: 700, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,    duration: 700, easing: Easing.in(Easing.sin),  useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0,   duration: 700, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.6, duration: 700, useNativeDriver: true })
        ])
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale, glowOpacity]);

  return (
    <View style={styles.emojiWrap}>
      <Animated.View
        style={{
          position: 'absolute',
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: color,
          transform: [{ scale }],
          opacity: glowOpacity
        }}
      />
      <Text style={styles.alertEmoji}>🚨</Text>
    </View>
  );
}

/** Countdown progress bar draining from full → empty over AUTO_DISMISS_MS */
function DismissProgressBar({ color, running }) {
  const width = useRef(new Animated.Value(100)).current;
  useEffect(() => {
    if (!running) return;
    width.setValue(100);
    Animated.timing(width, {
      toValue: 0,
      duration: AUTO_DISMISS_MS,
      easing: Easing.linear,
      useNativeDriver: false
    }).start();
  }, [running, width]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          {
            backgroundColor: color,
            width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
          }
        ]}
      />
    </View>
  );
}

export default function ProximityAlertBanner({ alert, onDismiss, onTap }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-220)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.94)).current;
  const dismissTimer = useRef(null);
  const [running, setRunning] = React.useState(false);

  const slideOut = useCallback(() => {
    setRunning(false);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    Animated.parallel([
      Animated.timing(translateY, { toValue: -220, duration: 280, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 0.94, duration: 240, useNativeDriver: true })
    ]).start(() => onDismiss?.());
  }, [translateY, opacity, cardScale, onDismiss]);

  useEffect(() => {
    if (!alert) {
      translateY.setValue(-220);
      opacity.setValue(0);
      cardScale.setValue(0.94);
      setRunning(false);
      return;
    }

    // Haptic feedback for urgency
    if (Platform.OS === 'android') {
      try {
        Vibration.vibrate([0, 80, 60, 80]);
      } catch (e) {
        console.warn('Vibration failed. Please rebuild the app for the android.permission.VIBRATE permission to take effect.', e);
      }
    }

    // Animate in with spring bounce
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, friction: 7, tension: 55, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, friction: 8, tension: 70, delay: 80, useNativeDriver: true })
    ]).start(() => setRunning(true));

    dismissTimer.current = setTimeout(slideOut, AUTO_DISMISS_MS);
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, [alert, translateY, opacity, cardScale, slideOut]);

  if (!alert) return null;

  const { incident, distanceMeters } = alert;
  const severity = Math.min(Math.max(Math.round(Number(incident.severity) || 1), 1), 3);
  const cfg = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG[1];
  const topPad = insets.top + (Platform.OS === 'android' ? 4 : 0);

  return (
    <Animated.View
      style={[styles.container, { top: topPad, transform: [{ translateY }], opacity }]}
      pointerEvents="box-none">
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => { slideOut(); onTap?.(incident); }}
          style={[styles.card, { borderColor: cfg.border, shadowColor: cfg.glow }]}>

          {/* Countdown drain bar at top */}
          <DismissProgressBar color={cfg.color} running={running} />

          {/* Top row: severity badge + verified tag + close */}
          <View style={styles.topRow}>
            <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
              <View style={[styles.badgeDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
            <Text style={styles.verifiedTag}>✓ AI Verified</Text>
            <TouchableOpacity onPress={slideOut} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Title with pulsing glow ring */}
          <View style={styles.titleRow}>
            <PulsingGlowRing color={cfg.glow} />
            <View style={styles.titleTextWrap}>
              <Text style={styles.alertTitle}>SentinelX Alert</Text>
              <Text style={styles.incidentType}>
                {prettyType(incident.type)} reported near your location
              </Text>
            </View>
          </View>

          {/* Description if available */}
          {!!incident.description && (
            <Text style={styles.description} numberOfLines={2}>{incident.description}</Text>
          )}

          {/* Meta chips */}
          <View style={styles.metaRow}>
            <View style={[styles.metaChip, { borderColor: cfg.border }]}>
              <Text style={styles.metaLabel}>📍 DISTANCE</Text>
              <Text style={[styles.metaValue, { color: cfg.color }]}>{distanceMeters} m</Text>
            </View>
            <View style={[styles.metaChip, { borderColor: 'rgba(34,197,94,0.4)' }]}>
              <Text style={styles.metaLabel}>🛡 STATUS</Text>
              <Text style={[styles.metaValue, { color: '#22c55e' }]}>Verified</Text>
            </View>
            <View style={[styles.metaChip, { borderColor: cfg.border }]}>
              <Text style={styles.metaLabel}>⚠️ SEVERITY</Text>
              <Text style={[styles.metaValue, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>

          <Text style={[styles.cta, { color: cfg.color }]}>Tap to view on map →</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 10,
    right: 10,
    zIndex: 99999,
    elevation: 99999
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(6,12,26,0.97)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden'
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
    marginHorizontal: -14
  },
  progressFill: {
    height: '100%',
    opacity: 0.75
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
    paddingVertical: 4,
    marginRight: 8
  },
  badgeDot: {
    width: 6,
    height: 6,
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
  closeBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  emojiWrap: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  alertEmoji: {
    fontSize: 26,
    zIndex: 1
  },
  titleTextWrap: { flex: 1 },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.2
  },
  incidentType: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
    marginTop: 1
  },
  description: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
    marginBottom: 10,
    marginLeft: 56
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10
  },
  metaChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.6)'
  },
  metaLabel: {
    fontSize: 9,
    color: '#475569',
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 2
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#e2e8f0'
  },
  cta: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center'
  }
});
