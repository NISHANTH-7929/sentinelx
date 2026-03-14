import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export default function XLoadingAnimation({ size = 40, color = '#60a5fa', style }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    ).start();
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.15]
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1]
  });

  const lineThickness = Math.max(2, size * 0.18);

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.animatedBox,
          { width: size, height: size, transform: [{ scale }], opacity }
        ]}>
        <View
          style={[
            styles.line,
            {
              width: lineThickness,
              height: size,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }]
            }
          ]}
        />
        <View
          style={[
            styles.line,
            {
              width: lineThickness,
              height: size,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }]
            }
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  animatedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  line: {
    position: 'absolute',
    borderRadius: 999
  }
});
