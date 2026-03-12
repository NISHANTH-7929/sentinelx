import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

export default function AreaSearchModal({ visible, areas, selectedArea, onClose, onSelect }) {
  const [query, setQuery] = useState('');

  const filteredAreas = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return areas;
    }
    return areas.filter((area) => area.toLowerCase().includes(normalized));
  }, [areas, query]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Select Area / Zone</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search area"
            placeholderTextColor="#6b8cb2"
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="words"
          />

          <FlatList
            data={filteredAreas}
            keyExtractor={(item) => item}
            style={styles.list}
            renderItem={({ item }) => {
              const active = selectedArea === item;
              return (
                <Pressable
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => {
                    onSelect(item);
                    setQuery('');
                    onClose();
                  }}>
                  <Text style={[styles.itemText, active && styles.itemTextActive]}>{item}</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Text style={styles.emptyText}>No matching area found.</Text>}
          />

          <Pressable
            style={styles.closeButton}
            onPress={() => {
              setQuery('');
              onClose();
            }}>
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
    backgroundColor: 'rgba(3, 11, 23, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 18
  },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#285283',
    backgroundColor: '#071a31',
    padding: 14,
    maxHeight: '74%'
  },
  title: {
    color: '#eff7ff',
    fontWeight: '800',
    fontSize: 17
  },
  searchInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#35679a',
    borderRadius: 10,
    color: '#e4effb',
    paddingHorizontal: 11,
    paddingVertical: 10,
    backgroundColor: 'rgba(8, 35, 64, 0.88)'
  },
  list: {
    marginTop: 10
  },
  item: {
    borderWidth: 1,
    borderColor: '#1d4b78',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(8, 34, 58, 0.68)'
  },
  itemActive: {
    borderColor: '#5aa7f1',
    backgroundColor: 'rgba(38, 101, 164, 0.38)'
  },
  itemText: {
    color: '#c8dbef',
    fontWeight: '700'
  },
  itemTextActive: {
    color: '#eff7ff'
  },
  emptyText: {
    color: '#8fb0d2',
    textAlign: 'center',
    marginVertical: 14
  },
  closeButton: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3f6d98',
    paddingVertical: 10,
    alignItems: 'center'
  },
  closeText: {
    color: '#d4e5f7',
    fontWeight: '800'
  }
});
