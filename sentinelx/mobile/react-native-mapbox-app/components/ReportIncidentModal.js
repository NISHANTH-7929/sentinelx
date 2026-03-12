import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const categories = ['fire', 'accident', 'theft', 'assault', 'murder', 'rape', 'other'];

export default function ReportIncidentModal({ visible, location, onClose, onSubmit }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('fire');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUri, setMediaUri] = useState('');
  const [anonymous, setAnonymous] = useState(true);

  const canProceed = useMemo(() => {
    if (step === 1) {
      return Boolean(category);
    }
    if (step === 2) {
      return description.trim().length > 5;
    }
    return Boolean(location);
  }, [category, description, location, step]);

  const resetAndClose = () => {
    setStep(1);
    setCategory('fire');
    setDescription('');
    setMediaUrl('');
    setMediaUri('');
    setAnonymous(true);
    onClose();
  };

  const chooseFromCamera = async () => {
    const response = await launchCamera({
      mediaType: 'photo',
      quality: 0.75,
      saveToPhotos: true
    });

    const uri = response?.assets?.[0]?.uri;
    if (uri) {
      setMediaUri(uri);
    }
  };

  const chooseFromLibrary = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.75,
      selectionLimit: 1
    });

    const uri = response?.assets?.[0]?.uri;
    if (uri) {
      setMediaUri(uri);
    }
  };

  const handleSubmit = async () => {
    if (!location) {
      return;
    }

    const media = [mediaUri, mediaUrl].filter(Boolean);

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
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose} transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report Incident</Text>
          <Text style={styles.subtitle}>Step {step} of 3</Text>

          {step === 1 && (
            <View>
              <Text style={styles.section}>1. Select category</Text>
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
              <Text style={styles.section}>2. Capture photo or upload</Text>
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
                  <Text style={styles.mediaButtonText}>Capture photo</Text>
                </Pressable>
                <Pressable style={styles.mediaButton} onPress={chooseFromLibrary}>
                  <Text style={styles.mediaButtonText}>Upload photo</Text>
                </Pressable>
              </View>
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
              <Text style={styles.section}>3. Confirm GPS location</Text>
              <Text style={styles.coord}>{location ? `${location[1].toFixed(5)}, ${location[0].toFixed(5)}` : 'Location unavailable'}</Text>
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '800'
  },
  subtitle: {
    color: '#9ca3af',
    marginTop: 4
  },
  section: {
    color: '#e5e7eb',
    marginTop: 16,
    marginBottom: 10,
    fontWeight: '700'
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tagActive: {
    borderColor: '#f97316',
    backgroundColor: '#7c2d12'
  },
  tagText: {
    color: '#9ca3af',
    textTransform: 'capitalize'
  },
  tagTextActive: {
    color: '#fed7aa',
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    padding: 12,
    color: '#f9fafb',
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
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center'
  },
  mediaButtonText: {
    color: '#cbd5e1',
    fontWeight: '700'
  },
  preview: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#1f2937'
  },
  coord: {
    color: '#d1d5db',
    marginBottom: 16
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  label: {
    color: '#e5e7eb',
    fontWeight: '600'
  },
  actions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18
  },
  secondaryText: {
    color: '#cbd5e1',
    fontWeight: '700'
  },
  primary: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 18
  },
  primaryDisabled: {
    opacity: 0.45
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800'
  }
});
