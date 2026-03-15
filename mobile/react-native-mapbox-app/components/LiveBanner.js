import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function LiveBanner({ incident, onPress, onDismiss }) {
  if (!incident) {
    return null;
  }

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View>
        <Text style={styles.title}>New verified incident</Text>
        <Text style={styles.body}>{incident.type.toUpperCase()} near your area</Text>
      </View>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Text style={styles.dismiss}>x</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: '#1d3c34',
    borderColor: '#2ec27e',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: '#95f9c3',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7
  },
  body: {
    color: '#ffffff',
    marginTop: 2,
    fontWeight: '600'
  },
  dismiss: {
    color: '#9bd8bf',
    fontSize: 18,
    fontWeight: '700'
  }
});
