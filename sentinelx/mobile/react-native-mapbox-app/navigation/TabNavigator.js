import React, { useCallback, useContext, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CrimeMonitorScreen from '../screens/CrimeMonitorScreen';
import ReportHubScreen from '../screens/ReportHubScreen';
import { ThemeContext } from '../theme/ThemeContext';
import {
  CrimeMonitorIcon,
  OperationsIcon,
  ReportIcon,
  SettingsIcon
} from '../components/icons/TabIcons';
import { Text } from 'react-native';

const Tab = createBottomTabNavigator();

// ─── Animated Tab Button ─────────────────────────────────────────────────────
function AnimatedTabButton({ children, onPress, ...props }) {
  // Check multiple potential sources for focus state in v7
  const focused = props.accessibilityState?.selected ?? props['aria-selected'] ?? props.focused ?? false;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.80,
        duration: 90,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 130,
        useNativeDriver: true
      })
    ]).start();
    onPress?.();
  }, [scaleAnim, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={styles.tabBtn}
      android_ripple={null}>
      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        {children}
        {focused && <View style={styles.activeDot} />}
      </Animated.View>
    </Pressable>
  );
}

const makeIcon = (Icon) =>
  function TabIcon({ color, focused }) {
    return <Icon size={focused ? 24 : 22} color={color} />;
  };

const OperationsTabIcon = makeIcon(OperationsIcon);
const CrimeMonitorTabIcon = makeIcon(CrimeMonitorIcon);
const ReportTabIcon = makeIcon(ReportIcon);
const SettingsTabIcon = makeIcon(SettingsIcon);

export default function TabNavigator() {
  const { isDarkMode } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      /**
       * CRITICAL FIX FOR MAPBOX TAB FREEZE:
       * lazy={false}  → All screens are mounted on first render (not on first visit).
       *
       * Per-screen: unmountOnBlur={false} → Screens are NEVER unmounted when you
       * switch tabs.  This prevents MapView from being destroyed and re-created,
       * which is the root cause of the Mapbox freeze / black-screen bug.
       */
      screenOptions={({}) => ({
        headerShown: false,
        lazy: false,
        freezeOnBlur: false,
        tabBarButton: AnimatedTabButton,
        tabBarStyle: {
          backgroundColor: isDarkMode ? 'rgba(6,10,20,0.97)' : 'rgba(255,255,255,0.97)',
          borderTopWidth: 0,
          height: 70,
          paddingTop: 6,
          paddingBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDarkMode ? 0.4 : 0.12,
          shadowRadius: 16,
          elevation: 16
        },
        tabBarActiveTintColor: isDarkMode ? '#60a5fa' : '#2563eb',
        tabBarInactiveTintColor: isDarkMode ? '#334155' : '#94a3b8',
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 11,
          marginTop: 2
        }
      })}>

      {/*
        * unmountOnBlur={false} on every screen ensures Mapbox MapView
        * (and all other screens) stay mounted through tab-switching.
        */}
      <Tab.Screen
        name="Operations"
        component={MapScreen}
        options={{
          tabBarLabel: 'Live Map',
          tabBarIcon: OperationsTabIcon,
          unmountOnBlur: false
        }}
      />
      <Tab.Screen
        name="CrimeMonitor"
        component={CrimeMonitorScreen}
        options={{
          tabBarLabel: 'Crime Intel',
          tabBarIcon: CrimeMonitorTabIcon,
          unmountOnBlur: false
        }}
      />
      <Tab.Screen
        name="Report"
        component={ReportHubScreen}
        options={{
          tabBarLabel: 'File Report',
          tabBarIcon: ReportTabIcon,
          unmountOnBlur: false
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: SettingsTabIcon,
          unmountOnBlur: false
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBtn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#60a5fa',
    marginTop: 4,
    shadowColor: '#60a5fa',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4
  }
});
