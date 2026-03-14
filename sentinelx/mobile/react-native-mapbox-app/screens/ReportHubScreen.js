/**
 * ReportHubScreen
 * Container screen for the 'Report' tab.
 * Uses an inline segment switcher to toggle between the Submit form and My Reports list.
 * No additional dependencies required.
 */

import React, { useContext, useState } from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeContext } from '../theme/ThemeContext';
import ReportIncidentScreen from './ReportIncidentScreen';
import MyReportsScreen from './MyReportsScreen';
import { useAIIncidentStore } from '../services/aiIncidentStore';

export default function ReportHubScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useContext(ThemeContext);
  const incidents = useAIIncidentStore();
  const [activeTab, setActiveTab] = useState('submit');

  const c = isDarkMode ? DARK : LIGHT;

  const pendingCount = incidents.filter(
    (i) => !['VERIFIED', 'REJECTED'].includes(i.status)
  ).length;

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Segment control */}
      <View style={[styles.segmentWrap, { backgroundColor: c.bg, borderBottomColor: c.border }]}>
        <View style={[styles.segmentTrack, { backgroundColor: c.segmentBg }]}>
          <Pressable
            style={[styles.segment, activeTab === 'submit' && { backgroundColor: c.segmentActive }]}
            onPress={() => setActiveTab('submit')}>
            <Text style={[styles.segmentText, { color: activeTab === 'submit' ? c.segmentActiveText : c.textMuted }]}>
              ＋ Submit
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segment, activeTab === 'reports' && { backgroundColor: c.segmentActive }]}
            onPress={() => setActiveTab('reports')}>
            <View style={styles.segmentLabelRow}>
              <Text style={[styles.segmentText, { color: activeTab === 'reports' ? c.segmentActiveText : c.textMuted }]}>
                My Reports
              </Text>
              {incidents.length > 0 ? (
                <View style={[styles.badge, { backgroundColor: pendingCount > 0 ? '#f59e0b' : '#16a34a' }]}>
                  <Text style={styles.badgeText}>{incidents.length}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        </View>
      </View>

      {/* Active panel */}
      <View style={styles.panel}>
        {activeTab === 'submit'
          ? <ReportIncidentScreen />
          : <MyReportsScreen />}
      </View>
    </View>
  );
}

const DARK = {
  bg: '#071a2e',
  border: '#1c3f60',
  textMuted: '#4a6d8c',
  segmentBg: '#0b2038',
  segmentActive: '#1c3f60',
  segmentActiveText: '#eaf4ff'
};

const LIGHT = {
  bg: '#f0f6fc',
  border: '#dde8f2',
  textMuted: '#94a3b8',
  segmentBg: '#e2eef8',
  segmentActive: '#ffffff',
  segmentActiveText: '#0f172a'
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1
  },
  segmentTrack: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2
  },
  segment: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  segmentText: {
    fontWeight: '700',
    fontSize: 13
  },
  badge: {
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800'
  },
  panel: { flex: 1 }
});
