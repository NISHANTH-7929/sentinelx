import React, { useContext, useMemo, useState } from 'react';
import { ThemeContext } from '../theme/ThemeContext';
import {
  Alert,
  Image,
  Modal,
  PermissionsAndroid,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const categories = ['fire', 'accident', 'theft', 'assault', 'murder', 'rape', 'other'];

const ensureCameraPermission = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    const camera = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (camera !== PermissionsAndroid.RESULTS.GRANTED) return false;
    const mediaPermission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const media = await PermissionsAndroid.request(mediaPermission);
    return media === PermissionsAndroid.RESULTS.GRANTED;
  } catch (_error) {
    return false;
  }
};

export default function ReportIncidentModal({ visible, location, onClose, onSubmit }) {
  const { isDarkMode } = useContext(ThemeContext);
  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('fire');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUri, setMediaUri] = useState('');
  const [anonymous, setAnonymous] = useState(true);
  const [imageError, setImageError] = useState('');

  const canProceed = useMemo(() => {
    if (step === 1) return Boolean(category);
    if (step === 2) return description.trim().length > 5;
    return Boolean(location);
  }, [category, description, location, step]);

  const resetAndClose = () => {
    setStep(1);
    setCategory('fire');
    setDescription('');
    setMediaUrl('');
    setMediaUri('');
    setAnonymous(true);
    setImageError('');
    onClose();
  };

  const chooseFromCamera = async () => {
    setImageError('');
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setImageError('Camera permission denied. Please enable in Settings.');
        return;
      }

      const response = await launchCamera({
        mediaType: 'photo',
        quality: 0.75,
        saveToPhotos: true
      });

      if (response?.didCancel) return;

      if (response?.errorCode) {
        setImageError(response.errorMessage || 'Camera error. Please try again.');
        return;
      }

      const uri = response?.assets?.[0]?.uri;
      if (uri) {
        setMediaUri(uri);
      }
    } catch (error) {
      setImageError('Failed to open camera. Check permissions and try again.');
    }
  };

  const chooseFromLibrary = async () => {
    setImageError('');
    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        setImageError('Gallery permission denied. Please enable in Settings.');
        return;
      }

      const response = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.75,
        selectionLimit: 1
      });

      if (response?.didCancel) return;

      if (response?.errorCode) {
        setImageError(response.errorMessage || 'Gallery error. Please try again.');
        return;
      }

      const uri = response?.assets?.[0]?.uri;
      if (uri) {
        setMediaUri(uri);
      }
    } catch (error) {
      setImageError('Failed to open gallery. Check permissions and try again.');
    }
  };

  const handleSubmit = async () => {
    if (!location) return;

    const media = [mediaUri, mediaUrl].filter(Boolean);

    try {
      await onSubmit({
        source: 'user',
        type: category,
        description,
        latitude: location[1],
        longitude: location[0],
        media_urls: media,
        reporter_id: anonymous ? 'anonymous' : 'user-mobile'
      });

      resetAndClose();
    } catch (error) {
      Alert.alert('Submit Failed', 'Could not submit report. Please check your connection and try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Report Incident</Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>Step {step}/3</Text>
            </View>
          </View>

          {step === 1 && (
            <View>
              <Text style={styles.section}>Select category</Text>
              <View style={styles.tagsWrap}>
                {categories.map((item) => (
                  <Pressable
                    key={item}
                    style={[styles.tag, category === item && styles.tagActive]}
                    onPress={() => setCategory(item)}>
                    <Text style={[styles.tagText, category === item && styles.tagTextActive]}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={styles.section}>Describe & attach photo</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholder="Describe what you observed"
                placeholderTextColor="#6b7280"
              />
              <View style={styles.mediaActions}>
                <Pressable style={styles.mediaButton} onPress={chooseFromCamera}>
                  <Text style={styles.mediaButtonText}>📷 Camera</Text>
                </Pressable>
                <Pressable style={styles.mediaButton} onPress={chooseFromLibrary}>
                  <Text style={styles.mediaButtonText}>🖼 Gallery</Text>
                </Pressable>
              </View>

              {imageError ? (
                <Text style={styles.imageErrorText}>{imageError}</Text>
              ) : null}

              {mediaUri ? <Image source={{ uri: mediaUri }} style={styles.preview} /> : null}

              <TextInput
                style={styles.input}
                value={mediaUrl}
                onChangeText={setMediaUrl}
                placeholder="Optional external media URL"
                placeholderTextColor="#6b7280"
                autoCapitalize="none"
              />
            </View>
          )}

          {step === 3 && (
            <View>
              <Text style={styles.section}>Confirm location</Text>
              <Text style={styles.coord}>
                {location ? `${location[1].toFixed(5)}, ${location[0].toFixed(5)}` : 'Location unavailable'}
              </Text>
              <View style={styles.row}>
                <Text style={styles.label}>Submit anonymously</Text>
                <Switch value={anonymous} onValueChange={setAnonymous} />
              </View>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={step === 1 ? resetAndClose : () => setStep((prev) => prev - 1)}>
              <Text style={styles.secondaryText}>{step === 1 ? 'Cancel' : 'Back'}</Text>
            </Pressable>
            {step < 3 ? (
              <Pressable
                style={[styles.primary, !canProceed && styles.primaryDisabled]}
                disabled={!canProceed}
                onPress={() => setStep((prev) => prev + 1)}>
                <Text style={styles.primaryText}>Next</Text>
              </Pressable>
            ) : (
              <Pressable
                style={[styles.primary, !canProceed && styles.primaryDisabled]}
                disabled={!canProceed}
                onPress={handleSubmit}>
                <Text style={styles.primaryText}>Submit</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: isDarkMode ? '#0a1628' : '#e2e8f0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e3a5c' : '#e2e8f0',
    borderBottomWidth: 0,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 28
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: isDarkMode ? '#f8fafc' : '#e2e8f0',
    fontSize: 20,
    fontWeight: '800'
  },
  stepBadge: {
    backgroundColor: isDarkMode ? '#1e3a8a' : '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  stepText: {
    color: isDarkMode ? '#dbeafe' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 11
  },
  section: {
    color: isDarkMode ? '#d1dbe8' : '#e2e8f0',
    marginTop: 16,
    marginBottom: 10,
    fontWeight: '700',
    fontSize: 14
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4666' : '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tagActive: {
    borderColor: '#f97316',
    backgroundColor: isDarkMode ? 'rgba(124,45,18,0.6)' : 'rgba(241, 245, 249, 0.9)'
  },
  tagText: {
    color: isDarkMode ? '#8faec9' : '#e2e8f0',
    textTransform: 'capitalize',
    fontWeight: '600'
  },
  tagTextActive: {
    color: isDarkMode ? '#fed7aa' : '#e2e8f0',
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4666' : '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    color: isDarkMode ? '#f9fafb' : '#e2e8f0',
    marginBottom: 10,
    minHeight: 46
  },
  mediaActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  mediaButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4f73' : '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center'
  },
  mediaButtonText: {
    color: isDarkMode ? '#cbd5e1' : '#e2e8f0',
    fontWeight: '700'
  },
  imageErrorText: {
    color: isDarkMode ? '#fca5a5' : '#e2e8f0',
    fontSize: 12,
    marginBottom: 6
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: isDarkMode ? '#1f2937' : '#e2e8f0'
  },
  coord: {
    color: isDarkMode ? '#d1d5db' : '#e2e8f0',
    marginBottom: 16,
    fontWeight: '600'
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    color: isDarkMode ? '#e5e7eb' : '#e2e8f0',
    fontWeight: '600'
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4666' : '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  secondaryText: {
    color: isDarkMode ? '#cbd5e1' : '#e2e8f0',
    fontWeight: '700'
  },
  primary: {
    flex: 1,
    backgroundColor: isDarkMode ? '#1e40af' : '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  primaryDisabled: {
    opacity: 0.4
  },
  primaryText: {
    color: isDarkMode ? '#fff' : '#e2e8f0',
    fontWeight: '800'
  }
});