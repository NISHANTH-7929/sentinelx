/**
 * ReportIncidentScreen
 * AI Verified Incident Reporting — submission form.
 */

import React, { useContext, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';

import { ThemeContext } from '../theme/ThemeContext';
import XLoadingAnimation from '../components/XLoadingAnimation';
import { INCIDENT_TYPES, submitIncident, updateIncident } from '../services/aiIncidentStore';
import {
  analyzeMediaWithGemini,
  checkLocationSignals,
  computeVerificationStatus
} from '../services/geminiVerification';

const VERIFICATION_STEPS = [
  { key: 'PENDING_VERIFICATION', label: 'Pending Verification', icon: '⏳' },
  { key: 'AI_ANALYSIS', label: 'AI Media Analysis', icon: '🤖' },
  { key: 'LOCATION_CHECK', label: 'Location Cross-Check', icon: '📍' },
  { key: 'SIGNAL_VERIFICATION', label: 'Signal Verification', icon: '📡' }
];

const STATUS_COLOR = {
  PENDING_VERIFICATION: '#94a3b8',
  AI_ANALYSIS: '#3b82f6',
  LOCATION_CHECK: '#f59e0b',
  SIGNAL_VERIFICATION: '#8b5cf6',
  VERIFIED: '#16a34a',
  REJECTED: '#dc2626'
};

export default function ReportIncidentScreen() {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useContext(ThemeContext);

  const [selectedType, setSelectedType] = useState(null);
  const [description, setDescription] = useState('');
  const [mediaAsset, setMediaAsset] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  
  const [showMapPicker, setShowMapPicker] = useState(false);
  const mapCameraRef = useRef(null);
  const [pickerCoordinate, setPickerCoordinate] = useState([80.2341, 13.0418]); // Default T Nagar
  const [submitting, setSubmitting] = useState(false);
  const [verificationStep, setVerificationStep] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const c = isDarkMode ? DARK : LIGHT;

  const captureGPS = () => {
    setIsLocating(true);
    Geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ lat: latitude, lng: longitude });
        setLocationLabel(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setIsLocating(false);
      },
      (_err) => {
        setIsLocating(false);
        Alert.alert('Location Error', 'Could not capture GPS location. Please try again.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const pickFromGallery = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
      if (!result.didCancel && result.assets?.length) setMediaAsset(result.assets[0]);
    } catch (_e) {
      Alert.alert('Error', 'Could not open photo library.');
    }
  };

  const captureFromCamera = async () => {
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: false });
      if (!result.didCancel && result.assets?.length) setMediaAsset(result.assets[0]);
    } catch (_e) {
      Alert.alert('Error', 'Could not open camera.');
    }
  };

  const runVerificationPipeline = async (incidentId, lat, lng) => {
    // Step 1: AI Media Analysis
    setVerificationStep('AI_ANALYSIS');
    updateIncident(incidentId, { status: 'AI_ANALYSIS' });

    const aiResult = await analyzeMediaWithGemini(mediaAsset?.uri || null, selectedType);

    // Step 2: Location signals
    setVerificationStep('LOCATION_CHECK');
    updateIncident(incidentId, { status: 'LOCATION_CHECK', aiResult });

    const locationSignals = await checkLocationSignals(lat, lng);

    // Step 3: Signal verification
    setVerificationStep('SIGNAL_VERIFICATION');
    updateIncident(incidentId, { status: 'SIGNAL_VERIFICATION', locationSignals });

    // Compute final status
    await new Promise((r) => setTimeout(r, 800));
    const finalStatus = computeVerificationStatus(aiResult.confidence, locationSignals);
    const verifiedAt = finalStatus === 'VERIFIED' ? new Date().toISOString() : null;

    updateIncident(incidentId, { status: finalStatus, verifiedAt });

    return { aiResult, locationSignals, finalStatus };
  };

  const onMapRegionChange = (feature) => {
    if (feature?.properties?.center) {
      setPickerCoordinate(feature.properties.center);
    }
  };

  const confirmMapLocation = () => {
    // Normalize to same {lat, lng} shape as captureGPS to prevent crashes
    setLocation({
      lat: pickerCoordinate[1],
      lng: pickerCoordinate[0]
    });
    setLocationLabel(`${pickerCoordinate[1].toFixed(5)}, ${pickerCoordinate[0].toFixed(5)}`);
    setShowMapPicker(false);
  };

  const handleSubmit = async () => {
    if (!selectedType) return Alert.alert('Missing info', 'Please select an incident type.');
    if (!location) return Alert.alert('Missing info', 'Please capture your GPS location first.');
    if (!description.trim()) return Alert.alert('Missing info', 'Please add a brief description.');

    setSubmitting(true);
    setLastResult(null);
    setVerificationStep('PENDING_VERIFICATION');

    const incidentId = submitIncident({
      type: selectedType,
      description: description.trim(),
      location,
      locationLabel,
      mediaUri: mediaAsset?.uri || null,
      mediaType: mediaAsset?.type || null
    });

    try {
      const result = await runVerificationPipeline(incidentId, location.lat, location.lng);
      setLastResult({ ...result, incidentId });
    } catch (_err) {
      updateIncident(incidentId, { status: 'REJECTED' });
      setLastResult({ finalStatus: 'REJECTED', incidentId });
    } finally {
      setSubmitting(false);
      setVerificationStep(null);
    }
  };

  const resetForm = () => {
    setSelectedType(null);
    setDescription('');
    setMediaAsset(null);
    setLocation(null);
    setLocationLabel('');
    setLastResult(null);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Text style={[styles.headerTitle, { color: c.text }]}>Report Incident</Text>
        <Text style={[styles.headerSub, { color: c.textMuted }]}>AI Verification powered by Gemini</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* === Incident Type === */}
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>INCIDENT TYPE</Text>
        <View style={styles.typeGrid}>
          {INCIDENT_TYPES.map((type) => {
            const active = selectedType === type;
            return (
              <Pressable
                key={type}
                onPress={() => setSelectedType(type)}
                style={[
                  styles.typePill,
                  { backgroundColor: active ? '#dc2626' : c.card, borderColor: active ? '#dc2626' : c.border }
                ]}>
                <Text style={[styles.typePillText, { color: active ? '#fff' : c.text }]}>{type}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* === Location === */}
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>LOCATION</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {locationLabel ? (
            <View style={styles.locationResult}>
              <Text style={styles.locationDot}>📍</Text>
              <Text style={[styles.locationText, { color: c.text }]} numberOfLines={1}>{locationLabel}</Text>
            </View>
          ) : (
            <Text style={[styles.locationHint, { color: c.textMuted }]}>No location captured yet</Text>
          )}
          <View style={styles.locationActions}>
            <Pressable
              style={[styles.actionBtn, { flex: 1, backgroundColor: '#1e40af', opacity: isLocating ? 0.6 : 1, marginRight: 8 }]}
              onPress={captureGPS}
              disabled={isLocating}>
              {isLocating
                ? <XLoadingAnimation size={18} color="#fff" />
                : <Text style={styles.actionBtnText}>📡 GPS</Text>}
            </Pressable>
            
            <Pressable
              style={[styles.actionBtn, { flex: 1, backgroundColor: '#0ea5e9', opacity: isLocating ? 0.6 : 1 }]}
              onPress={() => setShowMapPicker(true)}
              disabled={isLocating}>
              <Text style={styles.actionBtnText}>🗺 Map Picker</Text>
            </Pressable>
          </View>
        </View>

        {/* === Description === */}
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>DESCRIPTION</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: c.card, borderColor: c.border, color: c.text }]}
          multiline
          numberOfLines={4}
          placeholder="Briefly describe what is happening..."
          placeholderTextColor={c.textMuted}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        {/* === Media Upload === */}
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>MEDIA EVIDENCE</Text>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {mediaAsset ? (
            <View style={styles.mediaPreviewed}>
              <Image source={{ uri: mediaAsset.uri }} style={styles.mediaThumb} resizeMode="cover" />
              <Pressable onPress={() => setMediaAsset(null)} style={styles.mediaRemove}>
                <Text style={styles.mediaRemoveText}>✕ Remove</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={[styles.locationHint, { color: c.textMuted }]}>No media attached</Text>
          )}
          <View style={styles.mediaButtons}>
            <Pressable style={[styles.mediaBtn, { borderColor: c.border, backgroundColor: c.card }]} onPress={captureFromCamera}>
              <Text style={[styles.mediaBtnText, { color: c.text }]}>📷 Camera</Text>
            </Pressable>
            <Pressable style={[styles.mediaBtn, { borderColor: c.border, backgroundColor: c.card }]} onPress={pickFromGallery}>
              <Text style={[styles.mediaBtnText, { color: c.text }]}>🖼 Gallery</Text>
            </Pressable>
          </View>
        </View>

        {/* === Verification Status (during submission) === */}
        {verificationStep ? (
          <View style={[styles.verifyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.verifyTitle, { color: c.text }]}>Verification in Progress</Text>
            {VERIFICATION_STEPS.map((step) => {
              const currentIdx = VERIFICATION_STEPS.findIndex((s) => s.key === verificationStep);
              const stepIdx = VERIFICATION_STEPS.findIndex((s) => s.key === step.key);
              const done = stepIdx < currentIdx;
              const active = step.key === verificationStep;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={[
                    styles.stepDot,
                    { backgroundColor: done ? '#16a34a' : active ? STATUS_COLOR[step.key] : c.border }
                  ]}>
                    {active && <XLoadingAnimation size={16} color="#fff" />}
                    {done && <Text style={styles.stepDotText}>✓</Text>}
                  </View>
                  <Text style={[styles.stepLabel, { color: active || done ? c.text : c.textMuted }]}>
                    {step.icon} {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* === Result Card === */}
        {lastResult && !verificationStep ? (
          <View style={[
            styles.resultCard,
            { backgroundColor: c.card, borderColor: lastResult.finalStatus === 'VERIFIED' ? '#16a34a' : lastResult.finalStatus === 'REJECTED' ? '#dc2626' : '#f59e0b' }
          ]}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>
                {lastResult.finalStatus === 'VERIFIED' ? '✅' : lastResult.finalStatus === 'REJECTED' ? '❌' : '⏳'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultStatus, { color: STATUS_COLOR[lastResult.finalStatus] }]}>
                  {lastResult.finalStatus === 'VERIFIED' ? 'Incident Verified' :
                   lastResult.finalStatus === 'REJECTED' ? 'Incident Rejected' : 'Pending Review'}
                </Text>
                {lastResult.aiResult ? (
                  <Text style={[styles.resultMeta, { color: c.textMuted }]}>
                    AI Confidence: {lastResult.aiResult.confidence}% · {lastResult.aiResult.detectedType}
                  </Text>
                ) : null}
              </View>
            </View>

            {lastResult.aiResult?.explanation ? (
              <View style={[styles.aiBox, { backgroundColor: isDarkMode ? '#0a1929' : '#f0f6ff', borderColor: '#3b82f6' }]}>
                <Text style={[styles.aiBoxLabel, { color: '#3b82f6' }]}>🤖 Gemini AI Analysis</Text>
                <Text style={[styles.aiBoxText, { color: c.text }]}>{lastResult.aiResult.explanation}</Text>
              </View>
            ) : null}

            {lastResult.locationSignals?.summary ? (
              <Text style={[styles.signalText, { color: c.textMuted }]}>
                📡 {lastResult.locationSignals.summary}
              </Text>
            ) : null}

            {lastResult.finalStatus === 'VERIFIED' ? (
              <Text style={[styles.publishedNote, { color: '#16a34a' }]}>
                ✅ Published to Live Safety Feed
              </Text>
            ) : null}

            <Pressable style={[styles.actionBtn, { backgroundColor: '#1e3a5c', marginTop: 14 }]} onPress={resetForm}>
              <Text style={styles.actionBtnText}>Submit Another Report</Text>
            </Pressable>
          </View>
        ) : null}

        {/* === Submit === */}
        {!verificationStep && !lastResult ? (
          <Pressable
            style={[styles.submitBtn, { opacity: submitting ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={submitting}>
            <Text style={styles.submitBtnText}>Submit Incident Report</Text>
          </Pressable>
        ) : null}

        {/* Footer */}
        <Text style={[styles.footerNote, { color: c.textMuted }]}>
          🤖 AI Verification powered by Gemini · SentinelX Public Safety Platform
        </Text>
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: c.background }}>
          <View style={{ padding: 16, paddingTop: insets.top + 16, backgroundColor: c.card, flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => setShowMapPicker(false)} style={{ padding: 8 }}>
              <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Cancel</Text>
            </Pressable>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: c.text, fontWeight: 'bold', fontSize: 16 }}>Select Location</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>Drag map to position marker</Text>
            </View>
            <Pressable onPress={confirmMapLocation} style={{ padding: 8 }}>
              <Text style={{ color: '#16a34a', fontWeight: 'bold' }}>Confirm</Text>
            </Pressable>
          </View>
          
          <View style={{ flex: 1, position: 'relative' }}>
            <Mapbox.MapView
              style={{ flex: 1 }}
              styleURL={c.isDarkMode ? Mapbox.StyleURL.TrafficNight : Mapbox.StyleURL.Street}
              onCameraChanged={onMapRegionChange}
              compassEnabled
              logoEnabled={false}
              attributionEnabled={false}
            >
              <Mapbox.Camera
                ref={mapCameraRef}
                defaultSettings={{
                  centerCoordinate: location ? [location.lng, location.lat] : pickerCoordinate,
                  zoomLevel: 14,
                }}
              />
            </Mapbox.MapView>
            
            {/* Center Crosshair Marker */}
            <View style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -20, marginLeft: -12, alignItems: 'center' }} pointerEvents="none">
              <Text style={{ fontSize: 24 }}>📍</Text>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600'
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 20
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  typePill: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9
  },
  typePillText: {
    fontWeight: '700',
    fontSize: 13
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10
  },
  locationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  locationDot: { fontSize: 16 },
  locationText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1
  },
  locationHint: {
    fontSize: 13,
    fontStyle: 'italic'
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 90,
    lineHeight: 20
  },
  mediaPreviewed: {
    alignItems: 'center',
    gap: 8
  },
  mediaThumb: {
    width: '100%',
    height: 180,
    borderRadius: 10
  },
  mediaRemove: {
    alignSelf: 'flex-end'
  },
  mediaRemoveText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13
  },
  mediaButtons: {
    flexDirection: 'row',
    gap: 8
  },
  mediaBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center'
  },
  mediaBtnText: {
    fontWeight: '700',
    fontSize: 13
  },
  verifyCard: {
    marginTop: 20,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 12
  },
  verifyTitle: {
    fontWeight: '800',
    fontSize: 15,
    marginBottom: 4
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepDotText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '600'
  },
  resultCard: {
    marginTop: 20,
    borderWidth: 2,
    borderRadius: 14,
    padding: 16,
    gap: 10
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12
  },
  resultIcon: { fontSize: 28 },
  resultStatus: {
    fontWeight: '800',
    fontSize: 16
  },
  resultMeta: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600'
  },
  aiBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6
  },
  aiBoxLabel: {
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5
  },
  aiBoxText: {
    fontSize: 13,
    lineHeight: 19
  },
  signalText: {
    fontSize: 12,
    fontWeight: '600'
  },
  publishedNote: {
    fontWeight: '800',
    fontSize: 13
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    marginTop: 24,
    lineHeight: 17
  }
});
