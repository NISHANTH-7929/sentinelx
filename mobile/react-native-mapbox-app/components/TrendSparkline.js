import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function TrendSparkline({ points }) {
  const safePoints = Array.isArray(points) && points.length > 0 ? points : [1, 1, 1, 1, 1, 1];
  const max = Math.max(...safePoints, 1);

  return (
    <View style={styles.container}>
      {safePoints.map((value, index) => (
        <View
          key={`${index}-${value}`}
          style={[
            styles.bar,
            {
              height: 6 + (value / max) * 26,
              opacity: 0.45 + value / (max * 2)
            }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    marginTop: 8
  },
  bar: {
    width: 10,
    backgroundColor: '#34d399',
    borderRadius: 4
  }
});
