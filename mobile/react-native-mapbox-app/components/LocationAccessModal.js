import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LocationAccessModal({ visible, onOpenSettings }) {
  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Location access required</Text>
          <Text style={styles.body}>Enable location permissions from system settings to continue.</Text>

          <Pressable style={styles.button} onPress={onOpenSettings}>
            <Text style={styles.buttonText}>Open Settings</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    backgroundColor: '#0b1b30',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f3a5c',
    padding: 18
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e2e8f0'
  },
  body: {
    color: '#9fb4cc',
    marginTop: 8,
    lineHeight: 20
  },
  button: {
    marginTop: 18,
    backgroundColor: '#1d4ed8',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700'
  }
});
