import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

// ── Animated Score Ring ───────────────────────────────────────────────────────
const ScoreRing = ({ score, band, styles, isDarkMode }) => {
  const countAnim = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = React.useState(0);

  useEffect(() => {
    countAnim.addListener(({ value }) => setDisplayScore(Math.round(value)));

    Animated.parallel([
      Animated.spring(ringScale, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(countAnim, {
        toValue: score,
        duration: 1200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      })
    ]).start();

    return () => countAnim.removeAllListeners();
  }, [score, countAnim, ringScale, ringOpacity]);

  const ringColor = band?.color || '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.scoreRingOuter,
        {
          borderColor: ringColor,
          transform: [{ scale: ringScale }],
          opacity: ringOpacity,
          shadowColor: ringColor,
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8
        }
      ]}>
      <View style={[styles.scoreRingFill, { borderColor: ringColor }]} />
      <View style={styles.scoreRingCenter}>
        <Text style={[styles.scoreRingValue, { color: ringColor }]}>{displayScore}</Text>
        <Text style={styles.scoreRingLabel}>{band?.label || 'Score'}</Text>
      </View>
    </Animated.View>
  );
};

// ── Animated Bar Row ──────────────────────────────────────────────────────────
const BarRow = ({ label, value, maxValue, color, delay, styles }) => {
  const barWidth = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const targetPct = maxValue > 0 ? Math.max(4, (value / maxValue) * 100) : 4;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: false
      }),
      Animated.timing(barWidth, {
        toValue: targetPct,
        duration: 700,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      })
    ]).start();
  }, [barWidth, opacity, targetPct, delay]);

  return (
    <Animated.View style={[styles.barRow, { opacity }]}>
      <Text style={styles.barLabel} numberOfLines={1}>{label}</Text>
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barWidth.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: color || '#4a90c7'
            }
          ]}
        />
      </View>
      <Text style={styles.barCount}>{value}</Text>
    </Animated.View>
  );
};

// ── Animated Week Bar ─────────────────────────────────────────────────────────
const WeekBar = ({ item, maxValue, delay, styles }) => {
  const barHeight = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const targetH = maxValue > 0 ? Math.max(4, (item.count / maxValue) * 80) : 4;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: false }),
      Animated.timing(barHeight, {
        toValue: targetH,
        duration: 600,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false
      })
    ]).start();
  }, [barHeight, opacity, targetH, delay]);

  return (
    <Animated.View style={[styles.weekBarWrap, { opacity }]}>
      <View style={styles.weekColumn}>
        <Animated.View
          style={[styles.weekBar, { height: barHeight, backgroundColor: item.color || '#4a90c7' }]}
        />
      </View>
      <Text style={styles.weekLabel}>{item.week}</Text>
      <Text style={styles.weekCount}>{item.count}</Text>
    </Animated.View>
  );
};

// ── Section Card wrapper with fade+slide ──────────────────────────────────────
const AnimatedSection = ({ children, delay, styles, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      })
    ]).start();
  }, [opacity, translateY, delay]);

  return (
    <Animated.View style={[styles.section, style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CrimeMonitorStatsScreen({
  area, monthLabel, snapshot, sourceText, lastUpdated, onBack
}) {
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useContext(ThemeContext);
  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);

  const bg = isDarkMode ? '#071a2e' : '#f0f6fc';
  const cardBg = isDarkMode ? '#0e2439' : '#ffffff';
  const cardBorder = isDarkMode ? '#1c3f60' : '#dde8f2';
  const textPrimary = isDarkMode ? '#eaf4ff' : '#0f172a';
  const textSecondary = isDarkMode ? '#6085a6' : '#475569';
  const backBg = isDarkMode ? 'rgba(14,36,57,0.7)' : 'rgba(220,235,248,0.7)';

  // Header slide-in
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(headerSlide, { toValue: 0, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ]).start();
  }, [headerOpacity, headerSlide]);

  const maxCategoryValue = useMemo(() => {
    if (!snapshot?.categoryBreakdown?.length) return 1;
    return Math.max(1, ...snapshot.categoryBreakdown.map((i) => i.count));
  }, [snapshot?.categoryBreakdown]);

  const maxWeekValue = useMemo(() => {
    if (!snapshot?.weeklyTrend?.length) return 1;
    return Math.max(1, ...snapshot.weeklyTrend.map((i) => i.count));
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
      {/* Animated header */}
      <Animated.View
        style={[
          styles.header,
          { backgroundColor: isDarkMode ? '#071a2e' : '#f0f6fc' },
          { opacity: headerOpacity, transform: [{ translateY: headerSlide }] }
        ]}>
        <Pressable style={[styles.backButton, { backgroundColor: backBg }]} onPress={onBack}>
          <Text style={[styles.backText, { color: isDarkMode ? '#60a5fa' : '#2563eb' }]}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: textPrimary }]}>Crime Statistics</Text>
      </Animated.View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Info pills */}
        <View style={styles.infoRow}>
          {[area || 'All', monthLabel || '--', `${snapshot.totalIncidents} incidents`].map((txt, i) => (
            <View key={i} style={[styles.infoPill, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.infoText, { color: textSecondary }]}>{txt}</Text>
            </View>
          ))}
        </View>

        {/* Safety Score */}
        <AnimatedSection delay={100} styles={styles} style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Safety Score</Text>
          <View style={styles.scoreRow}>
            <ScoreRing styles={styles} score={snapshot.currentScore} band={snapshot.currentBand} isDarkMode={isDarkMode} />
            <View style={styles.scoreDetails}>
              {[
                { label: 'Current', value: snapshot.currentScore, color: snapshot.currentBand?.color || '#fff' },
                { label: 'Last Week', value: snapshot.previousScore, color: textPrimary },
                { label: 'Change', value: changeArrow(snapshot.scoreChangePct), color: changeColor(snapshot.scoreChangePct) }
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.scoreStatRow}>
                  <Text style={[styles.scoreStatLabel, { color: textSecondary }]}>{label}</Text>
                  <Text style={[styles.scoreStatValue, { color }]}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </AnimatedSection>

        {/* Category Breakdown */}
        <AnimatedSection delay={220} styles={styles} style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Crime Breakdown</Text>
          {snapshot.categoryBreakdown?.length ? (
            snapshot.categoryBreakdown.map((item, i) => (
              <BarRow
                key={item.category}
                label={item.category}
                value={item.count}
                maxValue={maxCategoryValue}
                color={item.color || SEVERITY_COLORS[item.topSeverity] || '#4a90c7'}
                delay={i * 60}
                styles={styles}
              />
            ))
          ) : (
            <Text style={styles.empty}>No data for selected filters.</Text>
          )}
        </AnimatedSection>

        {/* Weekly Trend */}
        <AnimatedSection delay={360} styles={styles} style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Weekly Trend</Text>
          {snapshot.weeklyTrend?.length ? (
            <View style={styles.weeklyGrid}>
              {snapshot.weeklyTrend.map((item, i) => (
                <WeekBar key={item.week} item={item} maxValue={maxWeekValue} delay={i * 80} styles={styles} />
              ))}
            </View>
          ) : (
            <Text style={styles.empty}>No weekly data.</Text>
          )}
        </AnimatedSection>

        {/* Month comparison */}
        {snapshot.monthComparison ? (
          <AnimatedSection delay={480} styles={styles} style={{ backgroundColor: cardBg, borderColor: cardBorder }}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Month-over-Month</Text>
            <View style={styles.compareRow}>
              {[
                { label: 'This month', value: snapshot.monthComparison.current, color: textPrimary },
                { label: 'Last month', value: snapshot.monthComparison.previous, color: textPrimary },
                { label: 'Change', value: changeArrow(snapshot.monthComparison.change), color: changeColor(snapshot.monthComparison.change) }
              ].map(({ label, value, color }) => (
                <View key={label} style={[styles.compareCol, { backgroundColor: isDarkMode ? 'rgba(10,30,52,0.7)' : 'rgba(255,255,255,0.9)', borderColor: cardBorder }]}>
                  <Text style={[styles.compareLabel, { color: textSecondary }]}>{label}</Text>
                  <Text style={[styles.compareValue, { color }]}>{value}</Text>
                </View>
              ))}
            </View>
          </AnimatedSection>
        ) : null}

        {/* Source */}
        <View style={[styles.sourceWrap, { borderColor: cardBorder }]}>
          <Text style={[styles.sourceLabel, { color: textSecondary }]}>Data Source</Text>
          <Text style={[styles.sourceValue, { color: textSecondary }]}>{sourceText || 'SentinelX processed data'}</Text>
          {lastUpdated ? <Text style={[styles.sourceValue, { color: textSecondary }]}>Updated: {new Date(lastUpdated).toLocaleDateString()}</Text> : null}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: isDarkMode ? '#192f49' : '#dde8f2'
  },
  backButton: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#3d6d9a' : '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10
  },
  backText: { fontWeight: '800', fontSize: 12 },
  title: { fontWeight: '800', fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 32 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  infoPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  infoText: { fontWeight: '700', fontSize: 11 },
  section: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3
  },
  sectionTitle: { fontWeight: '800', fontSize: 14, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  scoreRingOuter: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(5,18,32,0.8)' : 'rgba(255,255,255,0.95)'
  },
  scoreRingFill: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 5,
    opacity: 0.2
  },
  scoreRingCenter: { alignItems: 'center' },
  scoreRingValue: { fontWeight: '900', fontSize: 26 },
  scoreRingLabel: {
    color: isDarkMode ? '#8fb5d3' : '#64748b',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  scoreDetails: { flex: 1, gap: 6 },
  scoreStatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreStatLabel: { fontSize: 12, fontWeight: '700' },
  scoreStatValue: { fontSize: 14, fontWeight: '800' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  barLabel: {
    width: 80,
    color: isDarkMode ? '#b0cfe2' : '#475569',
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
  barFill: { height: '100%', borderRadius: 4 },
  barCount: {
    width: 30,
    textAlign: 'right',
    color: isDarkMode ? '#d0e2f4' : '#334155',
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
  weekBarWrap: { flex: 1, alignItems: 'center' },
  weekColumn: { flex: 1, justifyContent: 'flex-end' },
  weekBar: { borderRadius: 4, minWidth: 14 },
  weekLabel: {
    color: isDarkMode ? '#8fb5d3' : '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4
  },
  weekCount: {
    color: isDarkMode ? '#d0e2f4' : '#334155',
    fontSize: 10,
    fontWeight: '800'
  },
  compareRow: { flexDirection: 'row', gap: 8 },
  compareCol: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center'
  },
  compareLabel: { fontSize: 10, fontWeight: '700' },
  compareValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  sourceWrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    backgroundColor: isDarkMode ? 'rgba(5,18,32,0.7)' : 'rgba(255,255,255,0.9)'
  },
  sourceLabel: {
    fontWeight: '800',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  sourceValue: { fontSize: 10, marginTop: 3 },
  empty: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 10,
    color: isDarkMode ? '#6b8fb5' : '#94a3b8'
  }
});