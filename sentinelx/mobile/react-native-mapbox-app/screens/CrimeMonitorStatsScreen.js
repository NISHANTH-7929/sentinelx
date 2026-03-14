import React, { useContext, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../theme/ThemeContext';

const SEVERITY_COLORS = {
  Critical: '#dc2626',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#16a34a'
};

const changeArrow = (value) => {
  if (value > 0) return `↑ +${Math.abs(value)}%`;
  if (value < 0) return `↓ ${value}%`;
  return '— No change';
};

const changeColor = (value) => {
  if (value > 0) return '#fca5a5';
  if (value < 0) return '#86efac';
  return '#94a3b8';
};

const ScoreRing = ({ score, band, styles }) => {
  const fillAngle = (score / 100) * 360;
  return (
    <View style={styles.scoreRingOuter}>
      <View style={[styles.scoreRingFill, { borderColor: band?.color || '#3b82f6' }]} />
      <View style={styles.scoreRingCenter}>
        <Text style={styles.scoreRingValue}>{score}</Text>
        <Text style={styles.scoreRingLabel}>{band?.label || 'Score'}</Text>
      </View>
    </View>
  );
};

const BarRow = ({ label, value, maxValue, color, pct, styles }) => {
  const width = maxValue > 0 ? Math.max(6, (value / maxValue) * 100) : 6;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${width}%`, backgroundColor: color || '#4a90c7' }]} />
      </View>
      <Text style={styles.barCount}>{value}</Text>
    </View>
  );
};

export default function CrimeMonitorStatsScreen({ area, monthLabel, snapshot, sourceText, lastUpdated, onBack }) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useContext(ThemeContext);

  const bg = isDarkMode ? '#071a2e' : '#f0f6fc';
  const cardBg = isDarkMode ? '#0e2439' : '#ffffff';
  const cardBorder = isDarkMode ? '#1c3f60' : '#dde8f2';
  const textPrimary = isDarkMode ? '#eaf4ff' : '#0f172a';
  const textSecondary = isDarkMode ? '#6085a6' : '#475569';
  const backBg = isDarkMode ? 'rgba(14,36,57,0.7)' : 'rgba(220,235,248,0.7)';
  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const maxCategoryValue = useMemo(() => {
    if (!snapshot?.categoryBreakdown?.length) return 1;
    return Math.max(1, ...snapshot.categoryBreakdown.map((item) => item.count));
  }, [snapshot?.categoryBreakdown]);

  const maxWeekValue = useMemo(() => {
    if (!snapshot?.weeklyTrend?.length) return 1;
    return Math.max(1, ...snapshot.weeklyTrend.map((item) => item.count));
  }, [snapshot?.weeklyTrend]);

  if (!snapshot) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bg }]}>
        <Text style={[styles.empty, { color: textSecondary }]}>No data available.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#071a2e' : '#f0f6fc' }]}>
        <Pressable style={[styles.backButton, { backgroundColor: backBg }]} onPress={onBack}>
          <Text style={[styles.backText, { color: isDarkMode ? '#60a5fa' : '#2563eb' }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: textPrimary }]}>Crime Statistics</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Area + Time */}
        <View style={styles.infoRow}>
          <View style={[styles.infoPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.infoText, { color: textSecondary }]}>{area || 'All'}</Text>
          </View>
          <View style={[styles.infoPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.infoText, { color: textSecondary }]}>{monthLabel || '--'}</Text>
          </View>
          <View style={[styles.infoPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.infoText, { color: textSecondary }]}>{snapshot.totalIncidents} incidents</Text>
          </View>
        </View>

        {/* Safety Score */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Safety Score</Text>
          <View style={styles.scoreRow}>
            <ScoreRing styles={styles} score={snapshot.currentScore} band={snapshot.currentBand} />
            <View style={styles.scoreDetails}>
              <View style={styles.scoreStatRow}>
                <Text style={[styles.scoreStatLabel, { color: textSecondary }]}>Current</Text>
                <Text style={[styles.scoreStatValue, { color: snapshot.currentBand?.color || '#fff' }]}>
                  {snapshot.currentScore}
                </Text>
              </View>
              <View style={styles.scoreStatRow}>
                <Text style={[styles.scoreStatLabel, { color: textSecondary }]}>Last Week</Text>
                <Text style={[styles.scoreStatValue, { color: textPrimary }]}>{snapshot.previousScore}</Text>
              </View>
              <View style={styles.scoreStatRow}>
                <Text style={[styles.scoreStatLabel, { color: textSecondary }]}>Change</Text>
                <Text style={[styles.scoreStatValue, { color: changeColor(snapshot.scoreChangePct) }]}>
                  {changeArrow(snapshot.scoreChangePct)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category breakdown */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Crime Breakdown</Text>
          {snapshot.categoryBreakdown?.length ? (
            snapshot.categoryBreakdown.map((item) => (
              <BarRow
                key={item.category}
                label={item.category}
                value={item.count}
                maxValue={maxCategoryValue}
                color={item.color || SEVERITY_COLORS[item.topSeverity] || '#4a90c7'}
                styles={styles}
              />
            ))
          ) : (
            <Text style={styles.empty}>No data for selected filters.</Text>
          )}
        </View>

        {/* Weekly Trend */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Weekly Trend</Text>
          {snapshot.weeklyTrend?.length ? (
            <View style={styles.weeklyGrid}>
              {snapshot.weeklyTrend.map((item) => {
                const height = maxWeekValue > 0 ? Math.max(6, (item.count / maxWeekValue) * 80) : 6;
                return (
                  <View key={item.week} style={styles.weekBarWrap}>
                    <View style={styles.weekColumn}>
                      <View style={[styles.weekBar, { height, backgroundColor: item.color || '#4a90c7' }]} />
                    </View>
                    <Text style={styles.weekLabel}>{item.week}</Text>
                    <Text style={styles.weekCount}>{item.count}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={styles.empty}>No weekly data.</Text>
          )}
        </View>

        {/* Month comparison */}
        {snapshot.monthComparison ? (
          <View style={[styles.section, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Month-over-Month</Text>
            <View style={styles.compareRow}>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>This month</Text>
                <Text style={styles.compareValue}>{snapshot.monthComparison.current}</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Last month</Text>
                <Text style={styles.compareValue}>{snapshot.monthComparison.previous}</Text>
              </View>
              <View style={styles.compareCol}>
                <Text style={styles.compareLabel}>Change</Text>
                <Text
                  style={[
                    styles.compareValue,
                    { color: changeColor(snapshot.monthComparison.change) }
                  ]}>
                  {changeArrow(snapshot.monthComparison.change)}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Source info */}
        <View style={styles.sourceWrap}>
          <Text style={styles.sourceLabel}>Data Source</Text>
          <Text style={styles.sourceValue}>{sourceText || 'SentinelX processed data'}</Text>
          {lastUpdated ? <Text style={styles.sourceValue}>Updated: {new Date(lastUpdated).toLocaleDateString()}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#030f1f' : '#e2e8f0'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#192f49'
  },
  backButton: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#3d6d9a' : '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10
  },
  backText: {
    color: isDarkMode ? '#d0e2f4' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 12
  },
  title: {
    color: isDarkMode ? '#f0f8ff' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 18
  },
  scroll: {
    flex: 1
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 30
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12
  },
  infoPill: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d5a84' : '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: isDarkMode ? 'rgba(15, 40, 68, 0.8)' : 'rgba(255, 255, 255, 0.95)'
  },
  infoText: {
    color: isDarkMode ? '#d0e2f4' : '#e2e8f0',
    fontWeight: '700',
    fontSize: 11
  },
  section: {
    marginBottom: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e3a5c' : '#e2e8f0',
    backgroundColor: isDarkMode ? 'rgba(8, 26, 46, 0.85)' : 'rgba(255, 255, 255, 0.95)',
    padding: 12
  },
  sectionTitle: {
    color: isDarkMode ? '#e8f3fe' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 10
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14
  },
  scoreRingOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: isDarkMode ? '#1e3a5c' : '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(5, 18, 32, 0.8)' : 'rgba(255, 255, 255, 0.95)'
  },
  scoreRingFill: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    opacity: 0.3
  },
  scoreRingCenter: {
    alignItems: 'center'
  },
  scoreRingValue: {
    color: isDarkMode ? '#f0f8ff' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 22
  },
  scoreRingLabel: {
    color: isDarkMode ? '#8fb5d3' : '#e2e8f0',
    fontSize: 9,
    fontWeight: '700'
  },
  scoreDetails: {
    flex: 1,
    gap: 4
  },
  scoreStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  scoreStatLabel: {
    color: isDarkMode ? '#8fb5d3' : '#e2e8f0',
    fontSize: 12,
    fontWeight: '700'
  },
  scoreStatValue: {
    color: isDarkMode ? '#eaf4ff' : '#0f172a',
    fontSize: 14,
    fontWeight: '800'
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3
  },
  barLabel: {
    width: 80,
    color: isDarkMode ? '#b0cfe2' : '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize'
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: isDarkMode ? '#17283d' : '#e2e8f0',
    overflow: 'hidden',
    marginHorizontal: 6
  },
  barFill: {
    height: '100%',
    borderRadius: 4
  },
  barCount: {
    width: 30,
    textAlign: 'right',
    color: isDarkMode ? '#d0e2f4' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 11
  },
  weeklyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 10
  },
  weekBarWrap: {
    flex: 1,
    alignItems: 'center'
  },
  weekColumn: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  weekBar: {
    borderRadius: 4,
    minWidth: 14
  },
  weekLabel: {
    color: isDarkMode ? '#8fb5d3' : '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4
  },
  weekCount: {
    color: isDarkMode ? '#d0e2f4' : '#e2e8f0',
    fontSize: 10,
    fontWeight: '800'
  },
  compareRow: {
    flexDirection: 'row',
    gap: 8
  },
  compareCol: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e3a5c' : '#e2e8f0',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(10, 30, 52, 0.7)' : 'rgba(255, 255, 255, 0.9)'
  },
  compareLabel: {
    color: isDarkMode ? '#8fb5d3' : '#e2e8f0',
    fontSize: 10,
    fontWeight: '700'
  },
  compareValue: {
    color: isDarkMode ? '#eaf4ff' : '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 3
  },
  sourceWrap: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#1e3a5c' : '#e2e8f0',
    padding: 10,
    backgroundColor: isDarkMode ? 'rgba(5, 18, 32, 0.7)' : 'rgba(255, 255, 255, 0.9)'
  },
  sourceLabel: {
    color: isDarkMode ? '#8fb5d3' : '#e2e8f0',
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  sourceValue: {
    color: isDarkMode ? '#7a9cb8' : '#e2e8f0',
    fontSize: 10,
    marginTop: 3
  },
  empty: {
    color: isDarkMode ? '#6b8fb5' : '#e2e8f0',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10
  }
});