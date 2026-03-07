import React, { useContext } from 'react';
import { StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MapScreen from '../screens/MapScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { ThemeContext } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
    const { isDarkMode } = useContext(ThemeContext);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 24,
                    left: 20,
                    right: 20,
                    backgroundColor: isDarkMode ? '#1e1e1e' : '#ffffff',
                    borderRadius: 24,
                    height: 65,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    borderTopWidth: 0,
                    paddingBottom: 0,
                },
                tabBarShowLabel: true,
                tabBarActiveTintColor: isDarkMode ? '#ffffff' : '#1A1A1A',
                tabBarInactiveTintColor: '#A0A0A0',
                tabBarLabelStyle: {
                    fontSize: 14,
                    fontWeight: '800',
                    marginBottom: 20,
                    letterSpacing: 1,
                },
                tabBarIconStyle: {
                    display: 'none',
                }
            }}
        >
            <Tab.Screen
                name="Alerts"
                component={MapScreen}
                options={{
                    tabBarLabel: 'ALERTS',
                }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    tabBarLabel: 'SETTINGS',
                }}
            />
        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({});
