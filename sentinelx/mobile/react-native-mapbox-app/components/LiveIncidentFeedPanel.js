import React, { useRef, useState, useEffect } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions
} from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HEADER_HEIGHT = 50;
const MAX_PANEL_HEIGHT = Math.min(SCREEN_HEIGHT * 0.42, 340);

const TYPE_COLORS = {
  theft: '#f59e0b',
  robbery: '#ef4444',
  assault: '#dc2626',
  murder: '#7f1d1d',
  fire: '#f97316',
  accident: '#f59e0b',
  flood: '#3b82f6',
  medical: '#10b981',
  harassment: '#8b5cf6',
  cyber: '#6366f1',
  vandalism: '#a78bfa',
  violent: '#ef4444',
  sexual: '#9333ea',
  property: '#f97316',
  women: '#ec4899',
  default: '#64748b'
};

const getTypeColor = (type = '') =>
  TYPE_COLORS[type.toLowerCase()] || TYPE_COLORS.default;

export default function LiveIncidentFeedPanel({
  incidents = [],
  onSelectIncident,
  isDarkMode,
  insets
}) {
  const [expanded, setExpanded] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const recentIncidents = React.useMemo(
    () =>
      [...incidents]
        .sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
        .slice(0, 30),
    [incidents]
  );

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: expanded ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true
    }).start();
  }, [expanded, slideAnim]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [MAX_PANEL_HEIGHT, 0]
  });

  const bg = isDarkMode ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.95)';
  const border = isDarkMode ? '#1e293b' : '#e2e8f0';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBg = isDarkMode ? '#1e293b' : '#f8fafc';

  return (
    // Anchored to bottom-right corner
    <View
      style={[
        styles.cornerAnchor,
        { bottom: insets.bottom + 70 /* clear tab bar */ }
      ]}
      pointerEvents="box-none">
      
      {/* Collapsed pill button (always visible) */}
      {!expanded && (
        <Pressable
          style={[styles.pillButton, { backgroundColor: bg, borderColor: border }]}
          onPress={() => setExpanded(true)}>
          <View style={styles.liveDot} />
          <Text style={[styles.pillText, { color: textColor }]}>
            Live Feed{recentIncidents.length > 0 ? ` (${recentIncidents.length})` : ''}
          </Text>
          <Text style={{ color: mutedColor, fontSize: 14, marginLeft: 2 }}>▲</Text>
        </Pressable>
      )}

      {/* Expanded side panel – tallish drawer from bottom-right */}
      <Animated.View
        style={[
          styles.panel,
          { backgroundColor: bg, borderColor: border },
          { height: MAX_PANEL_HEIGHT + HEADER_HEIGHT, transform: [{ translateY }] }
        ]}>

        {/* Header */}
        <Pressable style={styles.panelHeader} onPress={() => setExpanded(false)}>
          <View style={styles.headerRow}>
            <View style={styles.liveDot} />
            <Text style={[styles.headerTitle, { color: textColor }]}>Live Incident Feed</Text>
            <Text style={{ color: mutedColor, fontSize: 14, marginLeft: 'auto' }}>▼ Close</Text>
          </View>
          <Text style={[styles.headerSub, { color: mutedColor }]}>
            {recentIncidents.length} events · tap to fly to location
          </Text>
        </Pressable>

        {/* List */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 8, paddingBottom: 16 }}>
          {recentIncidents.length === 0 ? (
            <Text style={[styles.emptyText, { color: mutedColor }]}>
              Start simulation to see live events here.
            </Text>
          ) : (
            recentIncidents.map((incident) => {
              const color = getTypeColor(incident.type || incident.category);
              const time = incident.datetime
                ? new Date(incident.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--';
              return (
                <Pressable
                  key={incident.id}
                  style={({ pressed }) => [
                    styles.card,
                    { backgroundColor: cardBg, borderColor: border },
                    pressed && { opacity: 0.7 }
                  ]}
                  onPress={() => onSelectIncident(incident)}>
                  
                  <View style={styles.cardTop}>
                    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
                      <Text style={[styles.badgeText, { color }]}>
                        {(incident.type || incident.category || 'UNKNOWN').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.timeText, { color: mutedColor }]}>{time}</Text>
                  </View>

                  <Text style={[styles.descText, { color: textColor }]} numberOfLines={2}>
                    {incident.description || 'No description.'}
                  </Text>

                  {incident.confidence > 0 && (
                    <Text style={[styles.confText, { color: mutedColor }]}>
                      AI confidence: {(incident.confidence * 100).toFixed(0)}%
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  cornerAnchor: {
    position: 'absolute',
    right: 10,
    width: 220,
    alignItems: 'flex-end'
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#38bdf8',
    marginRight: 6
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 4
  },
  panel: {
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: -3, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10
  },
  panelHeader: {
    height: HEADER_HEIGHT,
    paddingHorizontal: 12,
    paddingTop: 10,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800'
  },
  headerSub: {
    fontSize: 10,
    marginTop: 2
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
    fontStyle: 'italic',
    paddingHorizontal: 8
  },
  card: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  timeText: {
    fontSize: 10,
    fontWeight: '600'
  },
  descText: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 3
  },
  confText: {
    fontSize: 10
  }
});
