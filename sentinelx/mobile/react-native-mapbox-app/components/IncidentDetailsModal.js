import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { uploadIncidentEvidence } from '../services/incidentsApi';

const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (camera !== PermissionsAndroid.RESULTS.GRANTED) {
    return false;
  }

  const mediaPermission = Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const media = await PermissionsAndroid.request(mediaPermission);
  return media === PermissionsAndroid.RESULTS.GRANTED;
};

const ProgressBar = ({ value }) => (
  <View style={styles.progressTrack}>
    <View style={[styles.progressFill, { width: `${Math.round((value || 0) * 100)}%` }]} />
  </View>
);

export default function IncidentDetailsModal({ visible, incident, locationEnabled, onClose }) {
  const [asset, setAsset] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadState, setUploadState] = useState('idle');
  const [uploadError, setUploadError] = useState('');

  const coordinates = useMemo(() => {
    if (!incident) return null;
    return [incident.longitude, incident.latitude];
  }, [incident]);

  if (!incident || !coordinates) {
    return null;
  }

  const captureImage = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      setUploadError('Camera permission denied. Open Settings to continue.');
      return;
    }

    const result = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true });
    const picked = result?.assets?.[0];
    if (picked) {
      setAsset(picked);
      setUploadState('idle');
      setUploadError('');
      setUploadProgress(0);
    }
  };

  const uploadImage = async () => {
    const granted = await ensureCameraPermission();
    if (!granted) {
      setUploadError('Gallery permission denied. Open Settings to continue.');
      return;
    }

    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, selectionLimit: 1 });
    const picked = result?.assets?.[0];
    if (picked) {
      setAsset(picked);
      setUploadState('idle');
      setUploadError('');
      setUploadProgress(0);
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
      setUploadError(error.message || 'Upload failed. Retry.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{incident.normalizedType.toUpperCase()}</Text>
          <Text style={styles.coordinates}>
            {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
          </Text>

          {!locationEnabled ? (
            <Pressable onPress={() => Linking.openSettings()} style={styles.enableLocationPrompt}>
              <Text style={styles.enableLocationText}>Enable Location</Text>
            </Pressable>
          ) : null}

          <View style={styles.previewMap}>
            <Mapbox.MapView style={StyleSheet.absoluteFillObject} styleURL={Mapbox.StyleURL.Dark} logoEnabled={false} attributionEnabled={false}>
              <Mapbox.Camera defaultSettings={{ centerCoordinate: coordinates, zoomLevel: 14 }} />
              <Mapbox.PointAnnotation id="incident-preview" coordinate={coordinates} />
            </Mapbox.MapView>
          </View>

          <Text style={styles.sectionLabel}>Image Section</Text>
          <View style={styles.actionRow}>
            <Pressable style={styles.smallButton} onPress={captureImage}>
              <Text style={styles.smallButtonText}>Capture Image</Text>
            </Pressable>
            <Pressable style={styles.smallButton} onPress={uploadImage}>
              <Text style={styles.smallButtonText}>Upload Image</Text>
            </Pressable>
          </View>

          {asset ? (
            <View>
              <Image source={{ uri: asset.uri }} style={styles.imagePreview} />
              <View style={styles.actionRow}>
                <Pressable style={styles.smallButton} onPress={captureImage}>
                  <Text style={styles.smallButtonText}>Retake</Text>
                </Pressable>
                <Pressable style={styles.smallButton} onPress={uploadImage}>
                  <Text style={styles.smallButtonText}>Reupload</Text>
                </Pressable>
              </View>
              <Pressable style={styles.uploadButton} onPress={submitEvidence}>
                <Text style={styles.uploadText}>Upload Evidence</Text>
              </Pressable>
            </View>
          ) : null}

          {uploadState === 'uploading' ? (
            <View style={styles.progressWrap}>
              <ActivityIndicator size="small" color="#60a5fa" />
              <ProgressBar value={uploadProgress} />
              <Text style={styles.progressText}>{Math.round(uploadProgress * 100)}%</Text>
            </View>
          ) : null}

          {uploadState === 'failed' ? (
            <View>
              <Text style={styles.errorText}>{uploadError || 'Upload failed'}</Text>
              <Pressable onPress={submitEvidence} style={styles.retryButton}>
                <Text style={styles.retryText}>Retry Upload</Text>
              </Pressable>
            </View>
          ) : null}

          {uploadState === 'success' ? <Text style={styles.successText}>Upload completed</Text> : null}

          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,8,18,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22
  },
  card: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a4d77',
    backgroundColor: '#0a1a30',
    padding: 16
  },
  title: {
    color: '#f8fafc',
    fontWeight: '800',
    fontSize: 20
  },
  coordinates: {
    color: '#96b2cf',
    marginTop: 5
  },
  previewMap: {
    marginTop: 12,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a4d77'
  },
  sectionLabel: {
    marginTop: 12,
    color: '#d9e8f8',
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  smallButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#3b5f88',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center'
  },
  smallButtonText: {
    color: '#d1e6fd',
    fontWeight: '700',
    fontSize: 12
  },
  imagePreview: {
    marginTop: 10,
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#111827'
  },
  uploadButton: {
    marginTop: 10,
    backgroundColor: '#1d4ed8',
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
    gap: 7
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#1f2f45',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#60a5fa'
  },
  progressText: {
    color: '#9ec5ec',
    fontWeight: '700',
    fontSize: 12
  },
  errorText: {
    color: '#fca5a5',
    marginTop: 10
  },
  retryButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
    borderRadius: 8,
    paddingVertical: 8,
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
    marginTop: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  enableLocationText: {
    color: '#93c5fd',
    fontWeight: '700'
  },
  closeButton: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#3c5e84',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  closeText: {
    color: '#d5e6f8',
    fontWeight: '700'
  }
});

