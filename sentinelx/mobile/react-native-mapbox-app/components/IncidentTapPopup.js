import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function IncidentTapPopup({ coordinate, incidents, radiusMeters = 250 }) {
  if (!coordinate) {
    return null;
  }

  const topIncident = incidents?.[0];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{`${radiusMeters}m Radius Scan`}</Text>
      <Text style={styles.subtitle}>{incidents.length} incidents nearby</Text>
      {topIncident ? (
        <Text style={styles.detail}>
          {topIncident.normalizedType.toUpperCase()} at {topIncident.latitude.toFixed(4)}, {topIncident.longitude.toFixed(4)}
        </Text>
      ) : (
        <Text style={styles.detail}>No incidents found within radius.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 236,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(10,25,45,0.88)',
    borderColor: '#275079',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  title: {
    color: '#f4f8fc',
    fontWeight: '800'
  },
  subtitle: {
    color: '#8fb0d0',
    marginTop: 3
  },
  detail: {
    color: '#c2d9ef',
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17
  }
});

