import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDistance } from '../services/geo';

const fallbackBySeverity = {
  3: '#ff3b30',
  2: '#ff9500',
  1: '#ffd60a'
};

export default function IncidentFeedCard({ incident, distance, onPress }) {
  const thumbnail = incident.media_urls?.[0];

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {thumbnail ? (
        <Image source={{ uri: thumbnail }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumbFallback, { backgroundColor: fallbackBySeverity[incident.severity] || '#9ca3af' }]}>
          <Text style={styles.thumbText}>{incident.type.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.type}>{incident.type.toUpperCase()}</Text>
          <Text style={styles.status}>{incident.status}</Text>
        </View>

        <Text style={styles.meta}>{formatDistance(distance)} away</Text>
        <Text style={styles.meta}>{new Date(incident.datetime).toLocaleTimeString()}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    marginBottom: 10,
    padding: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 8
  },
  thumbFallback: {
    width: 64,
    height: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  thumbText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 20
  },
  body: {
    flex: 1,
    marginLeft: 10
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  type: {
    color: '#f9fafb',
    fontWeight: '700'
  },
  status: {
    color: '#9ca3af',
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '600'
  },
  meta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4
  }
});
