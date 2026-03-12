import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CrimeMonitorScreen from '../screens/CrimeMonitorScreen';
import { ThemeContext } from '../theme/ThemeContext';
import { CrimeMonitorIcon, OperationsIcon, SettingsIcon } from '../components/icons/TabIcons';

const Tab = createBottomTabNavigator();

const OperationsTabIcon = ({ color, focused }) => (
  <OperationsIcon size={focused ? 24 : 22} color={color} />
);

const CrimeMonitorTabIcon = ({ color, focused }) => (
  <CrimeMonitorIcon size={focused ? 24 : 22} color={color} />
);

const SettingsTabIcon = ({ color, focused }) => (
  <SettingsIcon size={focused ? 24 : 22} color={color} />
);

export default function TabNavigator() {
  const { isDarkMode } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? 'rgba(12,22,37,0.95)' : 'rgba(255,255,255,0.96)',
          borderTopWidth: 0,
          height: 72,
          paddingTop: 6,
          paddingBottom: 10,
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
          elevation: 10
        },
        tabBarActiveTintColor: isDarkMode ? '#f8fafc' : '#0f172a',
        tabBarInactiveTintColor: '#7f9bb8',
        tabBarLabelStyle: {
          fontWeight: '700',
          fontSize: 12,
          marginTop: 1
        },
        tabBarIconStyle: {
          marginTop: 1
        }
      }}>
      <Tab.Screen
        name="Operations"
        component={MapScreen}
        options={{
          tabBarLabel: 'Operations',
          tabBarIcon: OperationsTabIcon
        }}
      />
      <Tab.Screen
        name="CrimeMonitor"
        component={CrimeMonitorScreen}
        options={{
          tabBarLabel: 'Crime Monitor',
          tabBarIcon: CrimeMonitorTabIcon
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: SettingsTabIcon
        }}
      />
    </Tab.Navigator>
  );
}
