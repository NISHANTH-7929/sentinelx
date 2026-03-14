import React, { useContext } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import { Pressable, StyleSheet, Text, View } from 'react-native';

const severityDot = (severity) => {
  if (severity === 'Critical') return '#dc2626';
  if (severity === 'High') return '#f97316';
  if (severity === 'Medium') return '#eab308';
  return '#16a34a';
};

export default function IncidentTapPopup({ coordinate, incidents, radiusMeters = 250, onDismiss }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = getStyles(isDarkMode);

  if (!coordinate) {
    return null;
  }

  const topIncident = incidents?.[0];
  const topType = topIncident?.normalizedType || topIncident?.type || 'Unknown';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{`${radiusMeters}m Scan`}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{incidents.length}</Text>
        </View>
        {onDismiss ? (
          <Pressable onPress={onDismiss} style={styles.dismissBtn} hitSlop={8}>
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.subtitle}>
        {incidents.length === 0
          ? 'No incidents in this radius'
          : `${incidents.length} incident${incidents.length > 1 ? 's' : ''} nearby`}
      </Text>

      {topIncident ? (
        <View style={styles.topRow}>
          <View style={[styles.severityDot, { backgroundColor: severityDot(topIncident.severityLevel) }]} />
          <Text style={styles.detail} numberOfLines={1}>
            {topType.toUpperCase()}
          </Text>
        </View>
      ) : null}

      {incidents.length > 1 ? (
        <Text style={styles.moreText}>+{incidents.length - 1} more</Text>
      ) : null}
    </View>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 92,
    left: 14,
    right: 14,
    backgroundColor: isDarkMode ? 'rgba(8,22,40,0.92)' : 'rgba(255, 255, 255, 0.95)',
    borderColor: isDarkMode ? '#2d5a8a' : '#e2e8f0',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  title: {
    color: isDarkMode ? '#f4f8fc' : '#0f172a',
    fontWeight: '800',
    fontSize: 14,
    flex: 1
  },
  countBadge: {
    backgroundColor: isDarkMode ? '#1e3a8a' : '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8
  },
  countText: {
    color: isDarkMode ? '#dbeafe' : '#1e3a8a',
    fontWeight: '800',
    fontSize: 12
  },
  dismissBtn: {
    padding: 2
  },
  dismissText: {
    color: isDarkMode ? '#94a3b8' : '#64748b',
    fontSize: 14,
    fontWeight: '700'
  },
  subtitle: {
    color: isDarkMode ? '#8fb0d0' : '#475569',
    marginTop: 3,
    fontSize: 12
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  detail: {
    color: isDarkMode ? '#c2d9ef' : '#0f172a',
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  moreText: {
    marginTop: 4,
    color: isDarkMode ? '#6b8fb5' : '#64748b',
    fontSize: 11
  }
});