import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import XLoadingAnimation from './XLoadingAnimation';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { uploadIncidentEvidence } from '../services/incidentsApi';

const SEVERITY_GLOW = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#16a34a',
  Unknown: '#64748b'
};

const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (camera !== PermissionsAndroid.RESULTS.GRANTED) return false;
    const mediaPermission =
      Platform.Version >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const media = await PermissionsAndroid.request(mediaPermission);
    return media === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_) {
    return false;
  }
};

/** Animated progress bar that grows on mount */
const ProgressBar = ({ value, styles }) => {
  const width = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(width, {
      toValue: value * 100,
      duration: 400,
      useNativeDriver: false
    }).start();
  }, [value, width]);
  return (
    <View style={styles.progressTrack}>
      <Animated.View
        style={[
          styles.progressFill,
          { width: width.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }
        ]}
      />
    </View>
  );
};

/** Pulsing severity badge for critical incidents */
const SeverityBadge = ({ level, color, styles }) => {
  const isCritical = level === 'Critical';
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isCritical) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.94, duration: 600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [isCritical, pulse]);

  return (
    <Animated.View
      style={[
        styles.severityBadge,
        { backgroundColor: color || '#64748b', transform: [{ scale: pulse }] }
      ]}
    >
      <Text style={styles.badgeText}>{level || 'Unknown'}</Text>
    </Animated.View>
  );
};

export default function IncidentDetailsModal({ visible, incident, locationEnabled, onClose }) {
  const { isDarkMode } = useContext(ThemeContext);
  const s = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const [asset, setAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle');
  const [uploadError, setUploadError] = useState('');

  // ── Slide-up animation ────────────────────────────────────────────────────
  const slideY = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setAsset(null);
      setUploadProgress(0);
      setUploadState('idle');
      setUploadError('');
      // Animate in
      slideY.setValue(60);
      cardOpacity.setValue(0);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 350, delay: 50, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(slideY, { toValue: 0, friction: 9, tension: 70, delay: 50, useNativeDriver: true })
      ]).start();
    }
  }, [visible, incident?.id, slideY, cardOpacity, backdropOpacity]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 40, duration: 180, useNativeDriver: true })
    ]).start(onClose);
  };

  const coordinates = useMemo(() => {
    if (!incident) return null;
    return [incident.longitude, incident.latitude];
  }, [incident]);

  if (!incident || !coordinates) return null;

  const captureImage = async () => {
    try {
      const granted = await ensureCameraPermission();
      if (!granted) { setUploadError('Camera permission denied.'); return; }
      const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true });
      if (result?.didCancel) return;
      if (result?.errorCode) { setUploadError(result.errorMessage || 'Camera error.'); return; }
      const picked = result?.assets?.[0];
      if (picked) { setAsset(picked); setUploadState('idle'); setUploadError(''); setUploadProgress(0); }
    } catch (_) { setUploadError('Failed to open camera.'); }
  };

  const pickFromGallery = async () => {
    try {
      const granted = await ensureCameraPermission();
      if (!granted) { setUploadError('Gallery permission denied.'); return; }
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
      if (result?.didCancel) return;
      if (result?.errorCode) { setUploadError(result.errorMessage || 'Gallery error.'); return; }
      const picked = result?.assets?.[0];
      if (picked) { setAsset(picked); setUploadState('idle'); setUploadError(''); setUploadProgress(0); }
    } catch (_) { setUploadError('Failed to open gallery.'); }
  };

  const submitEvidence = async () => {
    if (!asset) return;
    setUploadState('uploading'); setUploadProgress(0); setUploadError('');
    try {
      await uploadIncidentEvidence({ incident, mediaAsset: asset, onProgress: (n) => setUploadProgress(n) });
      setUploadState('success');
    } catch (error) {
      setUploadState('failed');
      setUploadError(error.message === 'Network timeout' ? 'Server unreachable. Check connection.' : error.message || 'Upload failed.');
    }
  };

  const displayType = incident.normalizedType || incident.type || 'Incident';
  const severityColor = incident.severityColor || SEVERITY_GLOW[incident.severityLevel] || '#64748b';
  const glowColor = `${severityColor}30`;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]}>
        <Animated.View
          style={[
            s.card,
            { opacity: cardOpacity, transform: [{ translateY: slideY }] },
            { shadowColor: severityColor, shadowOpacity: 0.35 }
          ]}
        >
          {/* Severity glow accent line at top */}
          <View style={[s.accentLine, { backgroundColor: severityColor }]} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header */}
            <View style={s.headerRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={s.title} numberOfLines={1}>{displayType.toUpperCase()}</Text>
                <Text style={s.coordinates}>
                  {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
                </Text>
              </View>
              <SeverityBadge level={incident.severityLevel} color={severityColor} styles={s} />
            </View>

            {/* Description */}
            {!!incident.description && (
              <Text style={s.description}>{incident.description}</Text>
            )}

            {/* Confidence */}
            {incident.confidence > 0 && (
              <View style={s.confidenceRow}>
                <Text style={s.confidenceLabel}>AI Confidence</Text>
                <ProgressBar value={incident.confidence} styles={s} />
                <Text style={[s.confidencePct, { color: severityColor }]}>
                  {(incident.confidence * 100).toFixed(0)}%
                </Text>
              </View>
            )}

            {/* AI Verified badge */}
            {incident.status === 'verified' && (
              <View style={[s.verifiedBadge, { backgroundColor: `${severityColor}18`, borderColor: `${severityColor}50` }]}>
                <Text style={[s.verifiedText, { color: severityColor }]}>✓ AI Verified</Text>
              </View>
            )}

            {!locationEnabled && (
              <Pressable onPress={() => Linking.openSettings()} style={s.enableLocationPrompt}>
                <Text style={s.enableLocationText}>Enable Location →</Text>
              </Pressable>
            )}

            {/* Mini map */}
            <View style={[s.previewMap, { borderColor: `${severityColor}40` }]}>
              <Mapbox.MapView
                style={StyleSheet.absoluteFillObject}
                styleURL={Mapbox.StyleURL.Dark}
                logoEnabled={false}
                attributionEnabled={false}>
                <Mapbox.Camera defaultSettings={{ centerCoordinate: coordinates, zoomLevel: 14 }} />
                <Mapbox.PointAnnotation id="incident-preview" coordinate={coordinates} />
              </Mapbox.MapView>
            </View>

            {/* Evidence section */}
            <Text style={s.sectionLabel}>Evidence</Text>
            <View style={s.actionRow}>
              <Pressable style={[s.smallButton, { borderColor: `${severityColor}55` }]} onPress={captureImage}>
                <Text style={s.smallButtonText}>📷 Capture</Text>
              </Pressable>
              <Pressable style={[s.smallButton, { borderColor: `${severityColor}55` }]} onPress={pickFromGallery}>
                <Text style={s.smallButtonText}>🖼 Gallery</Text>
              </Pressable>
            </View>

            {asset && (
              <View>
                <Image source={{ uri: asset.uri }} style={s.imagePreview} />
                <Pressable style={[s.uploadButton, { backgroundColor: severityColor }]} onPress={submitEvidence}>
                  <Text style={s.uploadText}>{uploadState === 'success' ? '✓ Uploaded' : 'Upload Evidence'}</Text>
                </Pressable>
              </View>
            )}

            {uploadState === 'uploading' && (
              <View style={s.progressWrap}>
                <XLoadingAnimation size={24} color={severityColor} />
                <ProgressBar value={uploadProgress} styles={s} />
                <Text style={[s.progressText, { color: severityColor }]}>{Math.round(uploadProgress * 100)}%</Text>
              </View>
            )}

            {uploadState === 'failed' && (
              <View style={s.errorWrap}>
                <Text style={s.errorText}>{uploadError}</Text>
                <Pressable onPress={submitEvidence} style={s.retryButton}>
                  <Text style={s.retryText}>Retry</Text>
                </Pressable>
              </View>
            )}

            {uploadState === 'success' && (
              <Text style={s.successText}>✓ Evidence uploaded successfully</Text>
            )}
          </ScrollView>

          <Pressable style={[s.closeButton, { borderColor: `${severityColor}55` }]} onPress={handleClose}>
            <Text style={[s.closeText, { color: severityColor }]}>Close</Text>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const getStyles = (dark) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: dark ? 'rgba(2,6,20,0.82)' : 'rgba(15,23,42,0.65)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 24
  },
  card: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dark ? '#1e3a5c' : '#dde8f5',
    backgroundColor: dark ? '#060f1e' : '#ffffff',
    paddingHorizontal: 18,
    paddingBottom: 14,
    paddingTop: 0,
    maxHeight: '88%',
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 22,
    elevation: 18,
    overflow: 'hidden'
  },
  accentLine: {
    height: 3,
    borderRadius: 999,
    marginBottom: 14,
    marginHorizontal: -18
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  title: {
    color: dark ? '#f8fafc' : '#0f172a',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.3
  },
  coordinates: {
    color: dark ? '#60a5a5' : '#64748b',
    marginTop: 2,
    fontSize: 11,
    fontFamily: 'monospace'
  },
  description: {
    color: dark ? '#94a3b8' : '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10
  },
  severityBadge: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    marginTop: 2
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 11
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  confidenceLabel: {
    color: dark ? '#64748b' : '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    width: 90
  },
  confidencePct: {
    fontWeight: '800',
    fontSize: 12,
    width: 36,
    textAlign: 'right'
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: dark ? '#1e293b' : '#e2e8f0',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#60a5fa'
  },
  verifiedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10
  },
  verifiedText: {
    fontWeight: '800',
    fontSize: 11
  },
  previewMap: {
    marginTop: 10,
    height: 120,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1
  },
  sectionLabel: {
    marginTop: 14,
    color: dark ? '#cbd5e1' : '#334155',
    fontWeight: '700',
    fontSize: 13
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  smallButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    backgroundColor: dark ? '#0f172a' : '#f8fafc'
  },
  smallButtonText: {
    color: dark ? '#d1e6fd' : '#334155',
    fontWeight: '700',
    fontSize: 12
  },
  imagePreview: {
    marginTop: 10,
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: dark ? '#111827' : '#e2e8f0'
  },
  uploadButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  uploadText: {
    color: '#fff',
    fontWeight: '800'
  },
  progressWrap: {
    marginTop: 10,
    gap: 6
  },
  progressText: {
    fontWeight: '700',
    fontSize: 11
  },
  errorWrap: { marginTop: 10 },
  errorText: {
    color: '#fca5a5',
    fontSize: 12
  },
  retryButton: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center'
  },
  retryText: {
    color: '#fecaca',
    fontWeight: '700'
  },
  successText: {
    marginTop: 10,
    color: '#86efac',
    fontWeight: '700'
  },
  enableLocationPrompt: {
    marginBottom: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  enableLocationText: {
    color: '#93c5fd',
    fontWeight: '700',
    fontSize: 12
  },
  closeButton: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: dark ? '#0a1628' : '#f1f5f9'
  },
  closeText: {
    fontWeight: '800',
    fontSize: 14
  }
});