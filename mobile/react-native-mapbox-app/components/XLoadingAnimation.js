/**
 * XLoadingAnimation — Premium animated spinner for SentinelX.
 * Uses three concentric arcs at different speeds for a professional look.
 * 100% Animated API — no external libraries needed.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

function Arc({ size, thickness, color, duration, reverse }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
  }, [rotation, duration]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg']
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: 'transparent',
        borderTopColor: color,
        borderRightColor: `${color}44`,
        transform: [{ rotate: spin }]
      }}
    />
  );
}

export default function XLoadingAnimation({ size = 40, color = '#3b82f6', style }) {
  const ring1 = size;
  const ring2 = size * 0.74;
  const ring3 = size * 0.50;
  const thick = Math.max(2, size * 0.10);

  return (
    <View style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}>
      {/* Outer ring — clockwise, slower */}
      <Arc size={ring1} thickness={thick} color={color} duration={1400} reverse={false} />
      {/* Middle ring — counter-clockwise, medium */}
      <Arc size={ring2} thickness={thick} color={`${color}CC`} duration={900} reverse={true} />
      {/* Inner ring — clockwise, fast */}
      <Arc size={ring3} thickness={thick} color={`${color}88`} duration={600} reverse={false} />

      {/* Tiny center dot */}
      <View style={{
        width: size * 0.12,
        height: size * 0.12,
        borderRadius: size * 0.06,
        backgroundColor: color
      }} />
    </View>
  );
}
