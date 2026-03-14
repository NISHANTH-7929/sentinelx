import React, { useContext, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { ThemeContext } from '../theme/ThemeContext';

export default function RegionSelectorPanel({
  states,
  districts,
  areas,
  state,
  district,
  area,
  onStateChange,
  onDistrictChange,
  onAreaChange,
  containerStyle
}) {
  const [expanded, setExpanded] = useState(false);
  const { isDarkMode } = useContext(ThemeContext);

  const colors = isDarkMode
    ? {
        bg: 'rgba(8,23,39,0.92)',
        border: 'rgba(120,170,220,0.32)',
        textMain: '#f3f9ff',
        textSub: '#8ab3db',
        fieldBg: 'rgba(8,34,58,0.65)',
        fieldBorder: '#1f3a5c',
        pickerText: '#cfe7ff'
      }
    : {
        bg: 'rgba(255,255,255,0.92)',
        border: 'rgba(180,200,220,0.6)',
        textMain: '#0f172a',
        textSub: '#475569',
        fieldBg: 'rgba(241,245,249,0.65)',
        fieldBorder: '#cbd5e1',
        pickerText: '#1e293b'
      };

  return (
    <View style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }, containerStyle]}>
      <Pressable onPress={() => setExpanded(!expanded)} style={styles.header}>
        <Text style={[styles.title, { color: colors.textMain }]}>Region Intelligence Filter</Text>
        <Text style={[styles.toggleIcon, { color: colors.textMain }]}>{expanded ? '▲' : '▼'}</Text>
      </Pressable>

      {expanded ? (
        <View style={styles.content}>
          <View style={[styles.field, { backgroundColor: colors.fieldBg, borderColor: colors.fieldBorder }]}>
            <Text style={[styles.label, { color: colors.textSub }]}>State</Text>
            <Picker
              selectedValue={state}
              onValueChange={onStateChange}
              style={[styles.picker, { color: colors.pickerText }]}
              dropdownIconColor={colors.pickerText}>
              {states.map((item) => (
                <Picker.Item key={item} label={item} value={item} color={colors.pickerText} />
              ))}
            </Picker>
          </View>

          <View style={[styles.field, { backgroundColor: colors.fieldBg, borderColor: colors.fieldBorder }]}>
            <Text style={[styles.label, { color: colors.textSub }]}>District</Text>
            <Picker
              selectedValue={district}
              onValueChange={onDistrictChange}
              style={[styles.picker, { color: colors.pickerText }]}
              dropdownIconColor={colors.pickerText}>
              {districts.map((item) => (
                <Picker.Item key={item} label={item} value={item} color={colors.pickerText} />
              ))}
            </Picker>
          </View>

          <View style={[styles.field, { backgroundColor: colors.fieldBg, borderColor: colors.fieldBorder }]}>
            <Text style={[styles.label, { color: colors.textSub }]}>Area</Text>
            <Picker
              selectedValue={area}
              onValueChange={onAreaChange}
              style={[styles.picker, { color: colors.pickerText }]}
              dropdownIconColor={colors.pickerText}>
              {areas.map((item) => (
                <Picker.Item key={item} label={item} value={item} color={colors.pickerText} />
              ))}
            </Picker>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
    fontWeight: '700'
  },
  toggleIcon: {
    fontSize: 12
  },
  field: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden'
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 10,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  picker: {
    marginTop: -8,
    marginBottom: -8
  }
});
