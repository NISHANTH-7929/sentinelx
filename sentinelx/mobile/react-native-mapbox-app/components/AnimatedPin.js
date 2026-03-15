import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export default function AnimatedPin({ color = '#ef4444', size = 48 }) {
  const jumpAnim = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(jumpAnim, {
            toValue: -12,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(jumpAnim, {
            toValue: 0,
            duration: 600,
            easing: Easing.bounce,
            useNativeDriver: true
          }),
          Animated.delay(1200)
        ]),
        Animated.sequence([
          Animated.timing(shadowScale, {
            toValue: 0.6,
            duration: 500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(shadowScale, {
            toValue: 1,
            duration: 600,
            easing: Easing.bounce,
            useNativeDriver: true
          }),
          Animated.delay(1200)
        ])
      ])
    ).start();
  }, [jumpAnim, shadowScale]);

  return (
    <View style={[styles.container, { width: size, height: size * 1.5 }]}>
      {/* Shadow */}
      <Animated.View
        style={[
          styles.shadow,
          {
            backgroundColor: 'rgba(0,0,0,0.3)',
            transform: [{ scale: shadowScale }, { scaleX: 2 }]
          }
        ]}
      />

      {/* Pin Body */}
      <Animated.View
        style={[
          styles.pinWrap,
          {
            transform: [{ translateY: jumpAnim }],
            shadowColor: color
          }
        ]}
      >
        <View style={[styles.pinHead, { backgroundColor: color }]}>
          <View style={styles.pinHole} />
        </View>
        <View style={[styles.pinTail, { borderTopColor: color }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    // backgroundColor: 'rgba(255,0,0,0.2)', // For debugging bounding box
  },
  shadow: {
    width: 14,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 0,
  },
  pinWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  pinHole: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  pinTail: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -8,
    zIndex: 1,
  }
});
