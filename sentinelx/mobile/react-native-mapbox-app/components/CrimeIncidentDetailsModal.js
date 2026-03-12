import React, { useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View
} from 'react-native';

const prettyDate = (value) => {
  const parsed = new Date(value);
  return parsed.toLocaleString();
};

export default function CrimeIncidentDetailsModal({ visible, incident, onBack }) {
  const [imageOpen, setImageOpen] = useState(false);

  const severityStyle = useMemo(() => {
    if (!incident) return null;
    return { backgroundColor: incident.severityColor };
  }, [incident]);

  if (!incident) {
    return null;
  }

  const onShare = async () => {
    try {
      await Share.share({
        message: `Incident: ${incident.type}\nLocation: ${incident.locationText}\nTime: ${prettyDate(incident.datetime)}\nSeverity: ${incident.severityLevel}`
      });
    } catch (_error) {
      // Keep UX resilient if native share fails.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onBack}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Incident Details</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Incident Type</Text>
            <Text style={styles.value}>{incident.type}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Exact Location</Text>
            <Text style={styles.value}>{incident.locationText}</Text>
            <Text style={styles.meta}>
              {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Date & Time</Text>
            <Text style={styles.value}>{prettyDate(incident.datetime)}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Severity</Text>
            <View style={[styles.severityBadge, severityStyle]}>
              <Text style={styles.badgeText}>{incident.severityLevel}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Image</Text>
            {incident.imageUrl ? (
              <Pressable onPress={() => setImageOpen(true)}>
                <Image source={{ uri: incident.imageUrl }} style={styles.thumbnail} />
              </Pressable>
            ) : (
              <Text style={styles.meta}>No image available</Text>
            )}
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={styles.backButton} onPress={onBack}>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Pressable style={styles.shareButton} onPress={onShare}>
              <Text style={styles.shareText}>Share</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <Modal visible={imageOpen} transparent animationType="fade" onRequestClose={() => setImageOpen(false)}>
        <Pressable style={styles.imageBackdrop} onPress={() => setImageOpen(false)}>
          <Image source={{ uri: incident.imageUrl }} style={styles.fullImage} resizeMode="contain" />
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(2, 10, 20, 0.74)'
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#326696',
    backgroundColor: '#071b32',
    padding: 15
  },
  title: {
    color: '#f4f9ff',
    fontWeight: '800',
    fontSize: 20,
    marginBottom: 10
  },
  field: {
    marginTop: 9
  },
  label: {
    color: '#8fb0d3',
    fontWeight: '700',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  value: {
    color: '#e8f2fb',
    marginTop: 4,
    fontWeight: '700'
  },
  meta: {
    color: '#a3bfda',
    marginTop: 2,
    fontSize: 12
  },
  severityBadge: {
    marginTop: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999
  },
  badgeText: {
    color: '#fff',
    fontWeight: '800'
  },
  thumbnail: {
    marginTop: 6,
    width: 94,
    height: 72,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a7cac'
  },
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8
  },
  backButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#5f82a8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  backText: {
    color: '#d4e6f9',
    fontWeight: '800'
  },
  shareButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#77befa',
    backgroundColor: '#215f99',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  shareText: {
    color: '#eff8ff',
    fontWeight: '800'
  },
  imageBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  fullImage: {
    width: '100%',
    height: '70%'
  }
});
