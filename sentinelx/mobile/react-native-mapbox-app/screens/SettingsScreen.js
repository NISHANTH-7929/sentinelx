import React, { useContext } from 'react';
import { View, Text, Switch, StyleSheet, SafeAreaView, TouchableOpacity, Linking, Alert } from 'react-native';
import { ThemeContext } from '../theme/ThemeContext';

export default function SettingsScreen() {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);

    return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
            <View style={styles.header}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>Preferences</Text>
                <Text style={styles.subtitle}>SentinelX Global Ecosystem</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>APPEARANCE</Text>
                <View style={[styles.card, isDarkMode && styles.darkCard]}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>Dark Mode Map</Text>
                            <Text style={styles.settingSubtext}>Reduces eye strain in night environments</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                            thumbColor={'#FFFFFF'}
                            ios_backgroundColor="#E5E5EA"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SYSTEM DIAGNOSTICS</Text>
                <View style={[styles.card, isDarkMode && styles.darkCard]}>
                    <View style={[styles.settingRow, styles.borderBottom, isDarkMode && styles.darkBorder]}>
                        <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>Network Host</Text>
                        <Text style={styles.valueText}>10.104.72.216</Text>
                    </View>
                    <View style={[styles.settingRow, styles.borderBottom, isDarkMode && styles.darkBorder]}>
                        <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>WebSocket</Text>
                        <View style={styles.statusBadge}><Text style={styles.statusText}>Connected</Text></View>
                    </View>
                    <View style={styles.settingRow}>
                        <Text style={[styles.settingLabel, isDarkMode && styles.darkText]}>App Version</Text>
                        <Text style={styles.valueText}>1.0.0 (Production)</Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity style={styles.adminBtn} onPress={() => Alert.alert('Access Denied', 'Please access the Moderation Dashboard via laptop to approve incident reports.')}>
                <Text style={styles.adminText}>Admin Web Portal</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    darkContainer: { backgroundColor: '#000000' },
    header: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    title: { fontSize: 34, fontWeight: '800', color: '#000', letterSpacing: -0.5 },
    subtitle: { fontSize: 15, color: '#8E8E93', fontWeight: '600', marginTop: 4 },
    darkText: { color: '#FFFFFF' },

    section: { marginBottom: 30, paddingHorizontal: 16 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginLeft: 16, marginBottom: 8, letterSpacing: 1 },
    card: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' },
    darkCard: { backgroundColor: '#1C1C1E' },

    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    borderBottom: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#C6C6C8' },
    darkBorder: { borderBottomColor: '#38383A' },

    settingInfo: { flex: 1, paddingRight: 20 },
    settingLabel: { fontSize: 17, fontWeight: '500', color: '#000' },
    settingSubtext: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
    valueText: { fontSize: 17, color: '#8E8E93' },

    statusBadge: { backgroundColor: '#34C759', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    adminBtn: { marginHorizontal: 16, backgroundColor: '#007AFF', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    adminText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
