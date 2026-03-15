/**
 * animationHelpers.js
 * Lightweight, reusable animation presets for SentinelX.
 * All use useNativeDriver: true for 60fps performance.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** Fade-in on mount. Returns the Animated.Value. */
export const useFadeIn = (duration = 350, delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [opacity, duration, delay]);
  return opacity;
};

/** Slide + fade from a Y offset on mount. */
export const useSlideIn = (fromY = 40, duration = 380, delay = 0) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(fromY)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY, duration, delay]);
  return { opacity, translateY };
};

/** Scale-up pop on mount for cards / badges. */
export const useScaleIn = (duration = 320, delay = 0) => {
  const scale = useRef(new Animated.Value(0.82)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 90,
        delay,
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true
      })
    ]).start();
  }, [scale, opacity, duration, delay]);
  return { scale, opacity };
};

/** Infinite pulse (expand + contract) on a scale value. */
export const useInfinitePulse = (minScale = 0.88, maxScale = 1.12, halfPeriod = 750) => {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: maxScale, duration: halfPeriod, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: minScale, duration: halfPeriod, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [scale, minScale, maxScale, halfPeriod]);
  return scale;
};

/**
 * Animate a bar width from 0 → targetPct (0–100).
 * Returns a ref to an Animated.Value that maps 0–100 to string widths
 * via interpolation – but since Animated.Value can't drive % width on RN,
 * this returns a 0–1 value to be multiplied by the container width.
 */
export const useBarGrow = (targetPct, delay = 0, duration = 600) => {
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progress, {
      toValue: targetPct,
      delay,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false // width cannot use native driver
    }).start();
  }, [progress, targetPct, delay, duration]);
  return progress;
};

/**
 * Animate a numeric counter from 0 → target.
 * Returns the Animated.Value; interpolate as needed.
 */
export const useCountUp = (target, duration = 900, delay = 0) => {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: target,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
  }, [value, target, duration, delay]);
  return value;
};
