import React, { useContext, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import XLoadingAnimation from './XLoadingAnimation';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { uploadIncidentEvidence } from '../services/incidentsApi';

const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (camera !== PermissionsAndroid.RESULTS.GRANTED) {
      return false;
    }

    const mediaPermission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const media = await PermissionsAndroid.request(mediaPermission);
    return media === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_error) {
    return false;
  }
};

const ProgressBar = ({ value }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.round((value || 0) * 100)}%` }]} />
  </View>
);

export default function IncidentDetailsModal({ visible, incident, locationEnabled, onClose }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);
  const [asset, setAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle');
  const [uploadError, setUploadError] = useState('');

  // Reset state when modal opens with a new incident
  useEffect(() => {
    if (visible) {
      setAsset(null);
      setUploadProgress(0);
      setUploadState('idle');
      setUploadError('');
    }
  }, [visible, incident?.id]);

  const coordinates = useMemo(() => {
    if (!incident) return null;
    return [incident.longitude, incident.latitude];
  }, [incident]);

  if (!incident || !coordinates) {
    return null;
  }

  const captureImage = async () => {
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setUploadError('Camera permission denied. Please enable in Settings.');
        return;
      }

      const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true });

      if (result?.didCancel) {
        return;
      }

      if (result?.errorCode) {
        setUploadError(result.errorMessage || 'Camera error. Please try again.');
        return;
      }

      const picked = result?.assets?.[0];
      if (picked) {
        setAsset(picked);
        setUploadState('idle');
        setUploadError('');
        setUploadProgress(0);
      }
    } catch (error) {
      setUploadError('Failed to open camera. Please check permissions.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setUploadError('Gallery permission denied. Please enable in Settings.');
        return;
      }

      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });

      if (result?.didCancel) {
        return;
      }

      if (result?.errorCode) {
        setUploadError(result.errorMessage || 'Gallery error. Please try again.');
        return;
      }

      const picked = result?.assets?.[0];
      if (picked) {
        setAsset(picked);
        setUploadState('idle');
        setUploadError('');
        setUploadProgress(0);
      }
    } catch (error) {
      setUploadError('Failed to open gallery. Please check permissions.');
    }
  };

  const submitEvidence = async () => {
    if (!asset) {
      return;
    }

    setUploadState('uploading');
    setUploadProgress(0);
    setUploadError('');

    try {
      await uploadIncidentEvidence({
        incident,
        mediaAsset: asset,
        onProgress: (next) => setUploadProgress(next)
      });
      setUploadState('success');
    } catch (error) {
      setUploadState('failed');
      if (error.message === 'Network timeout' || error.message === 'Network error during upload') {
        setUploadError('Server unreachable. Check your connection and try again.');
      } else {
        setUploadError(error.message || 'Upload failed. Please retry.');
      }
    }
  };

  const displayType = incident.normalizedType || incident.type || 'Incident';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>{displayType.toUpperCase()}</Text>
            <View style={[styles.severityBadge, { backgroundColor: incident.severityColor || '#64748b' }]}>
              <Text style={styles.badgeText}>{incident.severityLevel || 'Unknown'}</Text>
            </View>
          </View>

          <Text style={styles.coordinates}>
            {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
          </Text>

          {!locationEnabled ? (
            <Pressable onPress={() => Linking.openSettings()} style={styles.enableLocationPrompt}>
              <Text style={styles.enableLocationText}>Enable Location</Text>
            </Pressable>
          ) : null}

          <View style={styles.previewMap}>
            <Mapbox.MapView
              style={StyleSheet.absoluteFillObject}
              styleURL={Mapbox.StyleURL.Dark}
              logoEnabled={false}
              attributionEnabled={false}>
              <Mapbox.Camera defaultSettings={{ centerCoordinate: coordinates, zoomLevel: 14 }} />
              <Mapbox.PointAnnotation id="incident-preview" coordinate={coordinates} />
            </Mapbox.MapView>
          </View>

          <Text style={styles.sectionLabel}>Evidence</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.smallButton} onPress={captureImage}>
              <Text style={styles.smallButtonText}>📷 Capture</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={pickFromGallery}>
              <Text style={styles.smallButtonText}>🖼 Gallery</Text>
            </Pressable>
          </View>

          {asset ? (
            <View>
              <Image source={{ uri: asset.uri }} style={styles.imagePreview} />
              <Pressable style={styles.uploadButton} onPress={submitEvidence}>
                <Text style={styles.uploadText}>
                  {uploadState === 'success' ? '✓ Uploaded' : 'Upload Evidence'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {uploadState === 'uploading' ? (
            <View style={styles.progressWrap}>
              <XLoadingAnimation size={24} color="#60a5fa" />
              <ProgressBar value={uploadProgress} />
              <Text style={styles.progressText}>{Math.round(uploadProgress * 100)}%</Text>
            </View>
          ) : null}

          {uploadState === 'failed' ? (
            <View style={styles.errorWrap}>
              <Text style={styles.errorText}>{uploadError}</Text>
              <Pressable onPress={submitEvidence} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          {uploadState === 'success' ? (
            <Text style={styles.successText}>✓ Evidence uploaded successfully</Text>
          ) : null}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(2,8,18,0.75)' : 'rgba(241, 245, 249, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a4d77' : '#e2e8f0',
    backgroundColor: isDarkMode ? '#0a1a30' : '#e2e8f0',
    padding: 16,
    maxHeight: '85%'
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: isDarkMode ? '#f8fafc' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 18,
    flex: 1,
    marginRight: 8
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  badgeText: {
    color: isDarkMode ? '#fff' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 11
  },
  coordinates: {
    color: isDarkMode ? '#8faec9' : '#e2e8f0',
    marginTop: 4,
    fontSize: 12
  },
  previewMap: {
    marginTop: 12,
    height: 110,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a4d77' : '#e2e8f0'
  },
  sectionLabel: {
    marginTop: 14,
    color: isDarkMode ? '#d9e8f8' : '#e2e8f0',
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
    borderColor: isDarkMode ? '#3b5f88' : '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center'
  },
  smallButtonText: {
    color: isDarkMode ? '#d1e6fd' : '#e2e8f0',
    fontWeight: '700',
    fontSize: 12
  },
  imagePreview: {
    marginTop: 10,
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: isDarkMode ? '#111827' : '#e2e8f0'
  },
  uploadButton: {
    marginTop: 8,
    backgroundColor: isDarkMode ? '#1e40af' : '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  uploadText: {
    color: isDarkMode ? '#fff' : '#e2e8f0',
    fontWeight: '800'
  },
  progressWrap: {
    marginTop: 10,
    gap: 6
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: isDarkMode ? '#1f2f45' : '#e2e8f0',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: isDarkMode ? '#60a5fa' : '#e2e8f0'
  },
  progressText: {
    color: isDarkMode ? '#9ec5ec' : '#e2e8f0',
    fontWeight: '700',
    fontSize: 11
  },
  errorWrap: {
    marginTop: 10
  },
  errorText: {
    color: isDarkMode ? '#fca5a5' : '#e2e8f0',
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
    color: isDarkMode ? '#fecaca' : '#e2e8f0',
    fontWeight: '700'
  },
  successText: {
    marginTop: 10,
    color: isDarkMode ? '#86efac' : '#e2e8f0',
    fontWeight: '700'
  },
  enableLocationPrompt: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: isDarkMode ? '#1d4ed8' : '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  enableLocationText: {
    color: isDarkMode ? '#93c5fd' : '#e2e8f0',
    fontWeight: '700',
    fontSize: 12
  },
  closeButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#3c5e84' : '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  closeText: {
    color: isDarkMode ? '#d5e6f8' : '#e2e8f0',
    fontWeight: '700'
  }
});