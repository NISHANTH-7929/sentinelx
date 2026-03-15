/**
 * MyReportsScreen
 * Displays user's submitted AI-verified incidents with live status updates.
 */

import React, { useContext } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeContext } from '../theme/ThemeContext';
import { useAIIncidentStore } from '../services/aiIncidentStore';

const STATUS_META = {
  PENDING_VERIFICATION: { label: 'Pending Verification', color: '#94a3b8', icon: '⏳' },
  AI_ANALYSIS:         { label: 'AI Analysis',           color: '#3b82f6', icon: '🤖' },
  LOCATION_CHECK:      { label: 'Location Check',        color: '#f59e0b', icon: '📍' },
  SIGNAL_VERIFICATION: { label: 'Signal Verification',   color: '#8b5cf6', icon: '📡' },
  VERIFIED:            { label: 'AI Verified',            color: '#16a34a', icon: '✅' },
  REJECTED:            { label: 'Rejected',               color: '#dc2626', icon: '❌' }
};

const TYPE_ICONS = {
  Accident: '🚗',
  Fire:     '🔥',
  Robbery:  '🚨',
  Assault:  '⚠️',
  Disaster: '🌪️'
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function MyReportsScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useContext(ThemeContext);
  const incidents = useAIIncidentStore();

  const c = isDarkMode ? DARK : LIGHT;

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>My Reports</Text>
        <Text style={[styles.headerSub, { color: c.textMuted }]}>
          {incidents.length} submitted · AI Verification powered by Gemini
        </Text>
      </View>

      {incidents.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={[styles.emptyTitle, { color: c.text }]}>No Reports Yet</Text>
          <Text style={[styles.emptyHint, { color: c.textMuted }]}>
            Submit an incident from the Report tab to begin AI verification.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}>
          {incidents.map((incident) => {
            const meta = STATUS_META[incident.status] || STATUS_META.PENDING_VERIFICATION;
            const isVerified = incident.status === 'VERIFIED';
            const isRejected = incident.status === 'REJECTED';
            const isLive = !['VERIFIED', 'REJECTED'].includes(incident.status);

            return (
              <View
                key={incident.id}
                style={[
                  styles.card,
                  { backgroundColor: c.card, borderColor: isVerified ? '#16a34a' : isRejected ? '#dc262633' : c.border }
                ]}>
                {/* Card Header */}
                <View style={styles.cardTopRow}>
                  <Text style={styles.typeIcon}>{TYPE_ICONS[incident.type] || '🚨'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardType, { color: c.text }]}>{incident.type}</Text>
                    <Text style={[styles.cardTime, { color: c.textMuted }]}>{formatTime(incident.submittedAt)}</Text>
                  </View>
                  {/* Status Pill */}
                  <View style={[styles.statusPill, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
                    <Text style={[styles.statusPillText, { color: meta.color }]}>
                      {meta.icon} {meta.label}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {incident.description ? (
                  <Text style={[styles.cardDesc, { color: c.textMuted }]} numberOfLines={2}>
                    {incident.description}
                  </Text>
                ) : null}

                {/* Location */}
                {incident.locationLabel ? (
                  <Text style={[styles.cardLocation, { color: c.textMuted }]}>
                    📍 {incident.locationLabel}
                  </Text>
                ) : null}

                {/* AI Result Box */}
                {incident.aiResult ? (
                  <View style={[styles.aiBox, { backgroundColor: isDarkMode ? '#0a1929' : '#f0f6ff', borderColor: '#3b82f6' }]}>
                    <View style={styles.aiBoxHeader}>
                      <Text style={[styles.aiBoxLabel, { color: '#3b82f6' }]}>🤖 Gemini AI Analysis</Text>
                      <View style={[styles.confidencePill, {
                        backgroundColor: incident.aiResult.confidence > 70 ? '#16a34a22' : incident.aiResult.confidence >= 40 ? '#f59e0b22' : '#dc262622',
                        borderColor: incident.aiResult.confidence > 70 ? '#16a34a' : incident.aiResult.confidence >= 40 ? '#f59e0b' : '#dc2626'
                      }]}>
                        <Text style={[styles.confidenceText, {
                          color: incident.aiResult.confidence > 70 ? '#16a34a' : incident.aiResult.confidence >= 40 ? '#d97706' : '#dc2626'
                        }]}>
                          {incident.aiResult.confidence}% confidence
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.detectedType, { color: c.text }]}>
                      Detected: {incident.aiResult.detectedType}
                    </Text>
                    <Text style={[styles.aiExplanation, { color: c.textMuted }]} numberOfLines={3}>
                      {incident.aiResult.explanation}
                    </Text>
                  </View>
                ) : isLive ? (
                  <View style={[styles.analyzingBox, { borderColor: '#3b82f6', backgroundColor: '#3b82f611' }]}>
                    <Text style={[styles.analyzingText, { color: '#3b82f6' }]}>🤖 AI analysis in progress...</Text>
                  </View>
                ) : null}

                {/* Location Signals */}
                {incident.locationSignals?.summary ? (
                  <Text style={[styles.signalText, { color: c.textMuted }]}>
                    📡 {incident.locationSignals.summary}
                  </Text>
                ) : null}

                {/* Published badge */}
                {isVerified ? (
                  <View style={[styles.publishedBadge, { backgroundColor: '#16a34a22', borderColor: '#16a34a' }]}>
                    <Text style={[styles.publishedBadgeText, { color: '#16a34a' }]}>
                      ✅ Published to Live Safety Map
                    </Text>
                  </View>
                ) : null}

                {/* Rejected reason */}
                {isRejected ? (
                  <View style={[styles.rejectedBadge, { backgroundColor: '#dc262611', borderColor: '#dc262655' }]}>
                    <Text style={[styles.rejectedText, { color: '#dc2626' }]}>
                      ❌ Not published — insufficient verification signals
                    </Text>
                  </View>
                ) : null}

                {/* Gemini label */}
                <Text style={[styles.geminiLabel, { color: c.textMuted }]}>
                  AI Verification powered by Gemini
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const DARK = {
  bg: '#071a2e',
  card: '#0e243a',
  border: '#1c3f60',
  text: '#eaf4ff',
  textMuted: '#6085a6'
};

const LIGHT = {
  bg: '#f0f6fc',
  card: '#ffffff',
  border: '#dde8f2',
  text: '#0f172a',
  textMuted: '#64748b'
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyHint: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  list: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  card: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    gap: 10
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  typeIcon: { fontSize: 24, marginTop: 2 },
  cardType: { fontWeight: '800', fontSize: 15 },
  cardTime: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4
  },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  cardLocation: { fontSize: 12, fontWeight: '600' },
  aiBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6
  },
  aiBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  aiBoxLabel: { fontWeight: '800', fontSize: 12, letterSpacing: 0.4 },
  confidencePill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  confidenceText: { fontSize: 11, fontWeight: '800' },
  detectedType: { fontWeight: '700', fontSize: 13 },
  aiExplanation: { fontSize: 12, lineHeight: 17 },
  analyzingBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center'
  },
  analyzingText: { fontWeight: '700', fontSize: 13 },
  signalText: { fontSize: 12, fontWeight: '600' },
  publishedBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center'
  },
  publishedBadgeText: { fontWeight: '800', fontSize: 13 },
  rejectedBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  rejectedText: { fontWeight: '700', fontSize: 12 },
  geminiLabel: { fontSize: 10, textAlign: 'right', fontStyle: 'italic' }
});
