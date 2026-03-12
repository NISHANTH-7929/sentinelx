import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

export default function RegionSelectorPanel({
  states,
  districts,
  areas,
  state,
  district,
  area,
  onStateChange,
  onDistrictChange,
  onAreaChange
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.panel}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text style={styles.title}>Region Intelligence Filter</Text>
        <Text style={styles.toggleIcon}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.content}>
          <View style={styles.field}>
            <Text style={styles.label}>State</Text>
            <Picker selectedValue={state} onValueChange={onStateChange} style={styles.picker} dropdownIconColor="#cfe7ff">
              {states.map((item) => (
                <Picker.Item key={item} label={item} value={item} color="#cfe7ff" />
              ))}
            </Picker>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>District</Text>
            <Picker selectedValue={district} onValueChange={onDistrictChange} style={styles.picker} dropdownIconColor="#cfe7ff">
              {districts.map((item) => (
                <Picker.Item key={item} label={item} value={item} color="#cfe7ff" />
              ))}
            </Picker>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Area</Text>
            <Picker selectedValue={area} onValueChange={onAreaChange} style={styles.picker} dropdownIconColor="#cfe7ff">
              {areas.map((item) => (
                <Picker.Item key={item} label={item} value={item} color="#cfe7ff" />
              ))}
            </Picker>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 38,
    marginHorizontal: 12,
    backgroundColor: 'rgba(8,23,39,0.86)',
    borderColor: 'rgba(120,170,220,0.32)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  content: {
    marginTop: 8
  },
  title: {
    color: '#f3f9ff',
    fontWeight: '700'
  },
  toggleIcon: {
    color: '#f3f9ff',
    fontSize: 12
  },
  field: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f3a5c',
    overflow: 'hidden',
    backgroundColor: 'rgba(8,34,58,0.65)'
  },
  label: {
    color: '#8ab3db',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  picker: {
    color: '#cfe7ff',
    marginTop: -8,
    marginBottom: -8
  }
});
