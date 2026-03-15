import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { CRIME_CATEGORIES } from '../services/crimeMonitorData';

export default function CrimeFilterDrawer({
  selectedCategories,
  severityGradedOnly,
  onCategoryToggle,
  onSeverityToggle,
  onApply,
  onReset
}) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Crime Filters</Text>

      <View style={styles.tagWrap}>
        {CRIME_CATEGORIES.map((item) => {
          const active = selectedCategories.includes(item.key);
          return (
            <Pressable
              key={item.key}
              style={[styles.tag, active && styles.tagActive]}
              onPress={() => onCategoryToggle(item.key)}>
              <Text style={[styles.tagText, active && styles.tagTextActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rowBetween}>
        <Text style={styles.label}>Show severity graded only</Text>
        <Switch value={severityGradedOnly} onValueChange={onSeverityToggle} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.resetButton} onPress={onReset}>
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
        <Pressable style={styles.applyButton} onPress={onApply}>
          <Text style={styles.applyText}>Apply</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: '#2f5d8e',
    backgroundColor: '#071d36',
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.26,
    shadowRadius: 16,
    elevation: 14
  },
  title: {
    color: '#eef6ff',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 10
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    borderWidth: 1,
    borderColor: '#345f8d',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: 'rgba(11, 45, 77, 0.65)'
  },
  tagActive: {
    borderColor: '#67b0f4',
    backgroundColor: 'rgba(66, 131, 192, 0.4)'
  },
  tagText: {
    color: '#a8c8e7',
    fontWeight: '700',
    fontSize: 12
  },
  tagTextActive: {
    color: '#eff7ff'
  },
  rowBetween: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  label: {
    color: '#d6e7f8',
    fontWeight: '700'
  },
  actionsRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 8
  },
  resetButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4f7397',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  resetText: {
    color: '#d1e5f8',
    fontWeight: '700'
  },
  applyButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#71bdfc',
    backgroundColor: '#205f99',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  applyText: {
    color: '#eff8ff',
    fontWeight: '800'
  }
});
