import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const safetyMessage =
  'Safety Score (0-100) combines number of incidents and severity for the selected area and time window. Higher score means safer area.';

const changeText = (value) => {
  if (value > 0) {
    return `Increased ^ ${Math.abs(value)}%`;
  }
  if (value < 0) {
    return `Decreased v ${Math.abs(value)}%`;
  }
  return 'No change 0%';
};

export default function CrimeMonitorStatsScreen({
  area,
  monthLabel,
  snapshot,
  sourceText,
  lastUpdated,
  onBack
}) {
  const maxCategory = useMemo(() => {
    const max = Math.max(...snapshot.categoryBars.map((item) => item.count), 1);
    return max;
  }, [snapshot.categoryBars]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{`${area} - Crime Statistics - ${monthLabel}`}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety Score Card</Text>
          <View style={[styles.scoreCard, { borderColor: snapshot.currentBand.color }]}> 
            <Text style={[styles.scoreNumber, { color: snapshot.currentBand.color }]}>{snapshot.currentScore}</Text>
            <Text style={styles.bandLabel}>{snapshot.currentBand.label}</Text>
            <Text style={styles.explain}>{safetyMessage}</Text>
            <Text style={styles.weekMeta}>Last week score: {snapshot.previousScore}</Text>
            <Text style={styles.changeText}>{changeText(snapshot.scoreChangePct)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crime Category Breakdown</Text>
          <Text style={styles.totalMeta}>Total incidents: {snapshot.totalIncidents}</Text>
          {snapshot.categoryBars.map((item) => (
            <View key={item.category} style={styles.barRow}>
              <Text style={styles.barLabel}>{item.label}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(item.count / maxCategory) * 100}%` }]} />
              </View>
              <Text style={styles.barValue}>{item.count}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Trend</Text>
          <View style={styles.weekTrendRow}>
            {snapshot.weeklyTrend.map((item) => (
              <View key={`week-${item.week}`} style={styles.weekTile}>
                <Text style={styles.weekTitle}>{`Week ${item.week}`}</Text>
                <View style={styles.sparkTrack}>
                  <View style={[styles.sparkBar, { height: `${Math.max(item.incidents * 6, 14)}%` }]} />
                </View>
                <Text style={styles.weekValue}>{item.incidents} incidents</Text>
                <Text style={styles.weekScore}>Score {item.score}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Month Comparison</Text>
          <Text style={styles.compareText}>{monthLabel}: {snapshot.monthComparison.selectedMonthIncidents} incidents</Text>
          <Text style={styles.compareText}>Previous month: {snapshot.monthComparison.previousMonthIncidents} incidents</Text>
          <Text style={styles.changeText}>{changeText(snapshot.monthComparison.diffPct)}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.source}>{sourceText}</Text>
          <Text style={styles.updated}>Last updated: {new Date(lastUpdated).toLocaleString()}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#04182d',
    zIndex: 40
  },
  headerRow: {
    paddingTop: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    borderWidth: 1,
    borderColor: '#50769b',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  backText: {
    color: '#d5e8f9',
    fontWeight: '800'
  },
  headerTitle: {
    marginLeft: 10,
    color: '#eff7ff',
    fontWeight: '800',
    flex: 1
  },
  content: {
    padding: 14,
    paddingBottom: 50
  },
  section: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2e5d8e',
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(7, 30, 55, 0.9)'
  },
  sectionTitle: {
    color: '#edf6ff',
    fontWeight: '800',
    fontSize: 15
  },
  scoreCard: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(6, 25, 46, 0.9)'
  },
  scoreNumber: {
    fontSize: 42,
    fontWeight: '900',
    lineHeight: 44
  },
  bandLabel: {
    marginTop: 2,
    color: '#d2e6f8',
    fontWeight: '700'
  },
  explain: {
    marginTop: 8,
    color: '#a7c2dd',
    lineHeight: 18
  },
  weekMeta: {
    marginTop: 8,
    color: '#c7dced',
    fontWeight: '700'
  },
  changeText: {
    marginTop: 4,
    color: '#a6d4ff',
    fontWeight: '800'
  },
  totalMeta: {
    marginTop: 8,
    color: '#abc6df'
  },
  barRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center'
  },
  barLabel: {
    color: '#d2e6f8',
    width: 130,
    fontSize: 12,
    fontWeight: '700'
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#17395c',
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    backgroundColor: '#4c9be3'
  },
  barValue: {
    color: '#e7f2fe',
    marginLeft: 8,
    minWidth: 24,
    textAlign: 'right',
    fontWeight: '800'
  },
  weekTrendRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8
  },
  weekTile: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#315a83',
    borderRadius: 10,
    padding: 8,
    backgroundColor: 'rgba(8, 37, 66, 0.75)'
  },
  weekTitle: {
    color: '#d8e9fb',
    fontWeight: '700',
    fontSize: 12
  },
  sparkTrack: {
    marginTop: 8,
    height: 62,
    borderRadius: 8,
    backgroundColor: '#143352',
    justifyContent: 'flex-end',
    padding: 5
  },
  sparkBar: {
    width: '100%',
    borderRadius: 6,
    backgroundColor: '#69b3f3'
  },
  weekValue: {
    marginTop: 6,
    color: '#bfd8ee',
    fontSize: 12
  },
  weekScore: {
    marginTop: 3,
    color: '#e3f0fb',
    fontSize: 12,
    fontWeight: '700'
  },
  compareText: {
    marginTop: 8,
    color: '#d7e9fa',
    fontWeight: '700'
  },
  footer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#31597f',
    borderRadius: 12,
    padding: 10,
    backgroundColor: 'rgba(6, 25, 45, 0.85)'
  },
  source: {
    color: '#9ebbd6',
    lineHeight: 17
  },
  updated: {
    marginTop: 6,
    color: '#d7e8f8',
    fontWeight: '700',
    fontSize: 12
  }
});
