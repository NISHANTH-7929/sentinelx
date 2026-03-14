import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Geolocation from '@react-native-community/geolocation';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  Dimensions,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Mapbox from '@rnmapbox/maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../theme/ThemeContext';
import AreaSearchModal from '../components/AreaSearchModal';
import CrimeFilterDrawer from '../components/CrimeFilterDrawer';
import CrimeIncidentDetailsModal from '../components/CrimeIncidentDetailsModal';
import CrimeMonitorStatsScreen from './CrimeMonitorStatsScreen';

import { MAPBOX_ACCESS_TOKEN } from '../services/config';
import {
  buildMicrozoneTiles,
  getCrimeMonitorMeta,
  getCrimeSnapshot,
  MONTH_LABELS,
  nearbySummary,
  refreshCrimeMonitorData,
  SCORE_BANDS,
  toIncidentFeatureCollection,
  WEEK_OPTIONS
} from '../services/crimeMonitorData';
import {
  DEFAULT_REGION,
  findAreaByCoordinate,
  getAreaConfig,
  getAreas,
  getDistricts,
  REGION_TREE
} from '../services/regions';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const SCORE_HELP_TEXT =
  'Safety Score (0–100) combines incident count and severity for the selected area and time window. Higher = safer.';

const DEFAULT_SCAN_RADIUS_METERS = 250;
const SCAN_RADIUS_OPTIONS = [100, 250, 400, 800];
const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] };

const SCREEN_WIDTH = Dimensions.get('window').width;

// Current month: March 2026 = index 2
const CURRENT_MONTH_INDEX = 2;

const initialWeek = () => {
  const day = new Date().getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
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

const toggleCategory = (current, key) => {
  if (key === 'all') return ['all'];
  const withoutAll = current.filter((item) => item !== 'all');
  const exists = withoutAll.includes(key);
  if (exists) {
    const next = withoutAll.filter((item) => item !== key);
    return next.length ? next : ['all'];
  }
  return [...withoutAll, key];
};

const createCirclePolygon = ([lng, lat], radiusMeters = DEFAULT_SCAN_RADIUS_METERS, points = 64) => {
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  const coordinates = [];
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * Math.PI * 2;
    coordinates.push([lng + lngDelta * Math.cos(angle), lat + latDelta * Math.sin(angle)]);
  }
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] } }]
  };
};

const zoneFillStyle = { fillColor: ['get', 'color'], fillOpacity: 0.2 };
const zoneLineStyle = { lineColor: '#1b3959', lineWidth: 0.7, lineOpacity: 0.45 };

const heatmapLayerStyle = {
  heatmapWeight: ['match', ['get', 'severity'], 'Critical', 1, 'High', 0.8, 'Medium', 0.5, 0.3],
  heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 8, 1.2, 14, 3.2],
  heatmapColor: [
    'interpolate', ['linear'], ['heatmap-density'],
    0, 'rgba(22,163,74,0)',
    0.3, '#16a34a',
    0.5, '#eab308',
    0.75, '#f97316',
    1, '#dc2626'
  ],
  heatmapRadius: ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 34],
  heatmapOpacity: 0.75
};

const markerLayerStyle = {
  circleColor: ['get', 'color'],
  circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 7],
  circleStrokeColor: '#f5f9ff',
  circleStrokeWidth: 1,
  circleOpacity: 0.9
};

export default function CrimeMonitorScreen() {
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { isDarkMode } = useContext(ThemeContext);
  const styles = useMemo(() => getStyles(isDarkMode), [isDarkMode]);
  const [userCoordinate, setUserCoordinate] = useState(null);
  useEffect(() => {
    let cancelled = false;
    Geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) setUserCoordinate([pos.coords.longitude, pos.coords.latitude]);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
    return () => { cancelled = true; };
  }, []);

  const [selectedState, setSelectedState] = useState(DEFAULT_REGION.state);
  const [selectedDistrict, setSelectedDistrict] = useState(DEFAULT_REGION.district);
  const [selectedArea, setSelectedArea] = useState(DEFAULT_REGION.area);

  const [monthIndex, setMonthIndex] = useState(CURRENT_MONTH_INDEX);
  const [weekIndex, setWeekIndex] = useState(initialWeek());

  const [categories, setCategories] = useState(['all']);
  const [draftCategories, setDraftCategories] = useState(['all']);
  const [severityGradedOnly, setSeverityGradedOnly] = useState(false);
  const [draftSeverityOnly, setDraftSeverityOnly] = useState(false);

  const [showAreaSearch, setShowAreaSearch] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [showMicrozones, setShowMicrozones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showScoreHelp, setShowScoreHelp] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const [selectedIncident, setSelectedIncident] = useState(null);
  const [tapSummary, setTapSummary] = useState(null);
  const [scanRadiusMeters, setScanRadiusMeters] = useState(DEFAULT_SCAN_RADIUS_METERS);
  const [focusCoordinate, setFocusCoordinate] = useState(null);
  const [followCurrentLocation, setFollowCurrentLocation] = useState(true);

  const [meta, setMeta] = useState(getCrimeMonitorMeta());
  const [snapshot, setSnapshot] = useState(() =>
    getCrimeSnapshot({
      state: DEFAULT_REGION.state,
      district: DEFAULT_REGION.district,
      area: DEFAULT_REGION.area,
      monthIndex: CURRENT_MONTH_INDEX,
      weekIndex: initialWeek(),
      selectedCategories: ['all'],
      severityGradedOnly: false
    })
  );

  const filterAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const summaryAnim = useRef(new Animated.Value(0)).current;

  const states = useMemo(() => Object.keys(REGION_TREE), []);
  const districts = useMemo(() => getDistricts(selectedState), [selectedState]);
  const areas = useMemo(() => getAreas(selectedState, selectedDistrict), [selectedDistrict, selectedState]);

  const areaConfig = useMemo(
    () => getAreaConfig(selectedState, selectedDistrict, selectedArea),
    [selectedArea, selectedDistrict, selectedState]
  );

  const incidentCollection = useMemo(() => toIncidentFeatureCollection(snapshot.incidents), [snapshot.incidents]);
  const microzoneCollection = useMemo(
    () => buildMicrozoneTiles({ bbox: areaConfig.bbox, incidents: snapshot.incidents }),
    [areaConfig.bbox, snapshot.incidents]
  );

  const focusRadiusOverlay = useMemo(() => {
    if (!focusCoordinate) return EMPTY_FEATURE_COLLECTION;
    return createCirclePolygon(focusCoordinate, scanRadiusMeters);
  }, [focusCoordinate, scanRadiusMeters]);

  const loadSnapshot = useCallback(() => {
    const next = getCrimeSnapshot({
      state: selectedState,
      district: selectedDistrict,
      area: selectedArea,
      monthIndex,
      weekIndex,
      selectedCategories: categories,
      severityGradedOnly
    });
    setSnapshot(next);
  }, [categories, monthIndex, selectedArea, selectedDistrict, selectedState, severityGradedOnly, weekIndex]);

  const moveFocusToArea = useCallback((nextState, nextDistrict, nextArea) => {
    const nextAreaConfig = getAreaConfig(nextState, nextDistrict, nextArea);
    setFollowCurrentLocation(false);
    setFocusCoordinate(nextAreaConfig.center);
  }, []);

  useEffect(() => { loadSnapshot(); }, [loadSnapshot]);

  useEffect(() => {
    if (followCurrentLocation && userCoordinate) {
      setFocusCoordinate(userCoordinate);
    }
  }, [followCurrentLocation, userCoordinate]);

  useEffect(() => {
    if (!focusCoordinate && !userCoordinate) {
      setFocusCoordinate(areaConfig.center);
    }
  }, [areaConfig.center, focusCoordinate, userCoordinate]);

  useEffect(() => {
    const target = focusCoordinate || areaConfig.center;
    cameraRef.current?.setCamera({
      centerCoordinate: target,
      zoomLevel: 12.6,
      animationDuration: 800
    });
  }, [areaConfig.center, focusCoordinate]);

  useEffect(() => {
    if (!focusCoordinate) {
      setTapSummary(null);
      return;
    }
    const summary = nearbySummary({
      incidents: snapshot.incidents,
      coordinate: focusCoordinate,
      radiusMeters: scanRadiusMeters
    });
    setTapSummary(summary ? { coordinate: focusCoordinate, ...summary } : null);
  }, [focusCoordinate, scanRadiusMeters, snapshot.incidents]);

  useEffect(() => {
    Animated.timing(summaryAnim, {
      toValue: tapSummary ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start();
  }, [summaryAnim, tapSummary]);

  useEffect(() => {
    Animated.timing(statsAnim, {
      toValue: showStats ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [showStats, statsAnim]);

  useEffect(() => {
    if (districts.length && !districts.includes(selectedDistrict)) {
      setSelectedDistrict(districts[0]);
    }
  }, [districts, selectedDistrict]);

  useEffect(() => {
    if (areas.length && !areas.includes(selectedArea)) {
      setSelectedArea(areas[0]);
    }
  }, [areas, selectedArea]);

  const openFilter = () => {
    setDraftCategories(categories);
    setDraftSeverityOnly(severityGradedOnly);
    setFilterVisible(true);
    Animated.timing(filterAnim, {
      toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true
    }).start();
  };

  const closeFilter = () => {
    Animated.timing(filterAnim, {
      toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true
    }).start(({ finished }) => { if (finished) setFilterVisible(false); });
  };

  const onMapPress = (event) => {
    const incidentId = event?.features?.find((item) => item?.properties?.incidentId)?.properties?.incidentId;
    if (incidentId) {
      const found = snapshot.incidents.find((item) => item.id === incidentId);
      if (found) setSelectedIncident(found);
      return;
    }
    const coords = event?.geometry?.coordinates;
    if (!coords) return;
    setFollowCurrentLocation(false);
    setFocusCoordinate(coords);

    // Auto-update State / District / Area selectors to match the tapped location
    const foundRegion = findAreaByCoordinate(coords[0], coords[1]);
    if (foundRegion) {
      setSelectedState(foundRegion.state);
      setSelectedDistrict(foundRegion.district);
      setSelectedArea(foundRegion.area);
      // Move focus to the matched area center so crime data refreshes for it
      moveFocusToArea(foundRegion.state, foundRegion.district, foundRegion.area);
    }
  };

  const onPinDragEnd = (event) => {
    const coords = event?.geometry?.coordinates;
    if (!coords) return;
    setFollowCurrentLocation(false);
    setFocusCoordinate(coords);
  };

  const recenterToCurrentLocation = () => {
    if (userCoordinate) {
      setFollowCurrentLocation(true);
      setFocusCoordinate(userCoordinate);
      return;
    }
    setFollowCurrentLocation(false);
    setFocusCoordinate(areaConfig.center);
  };

  const refreshData = () => {
    const nextMeta = refreshCrimeMonitorData();
    setMeta((previous) => ({ ...previous, ...nextMeta }));
    loadSnapshot();
  };

  const applyFilter = () => {
    setCategories(draftCategories);
    setSeverityGradedOnly(draftSeverityOnly);
    closeFilter();
  };

  const resetFilter = () => {
    setCategories(['all']);
    setDraftCategories(['all']);
    setSeverityGradedOnly(false);
    setDraftSeverityOnly(false);
    closeFilter();
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={isDarkMode ? Mapbox.StyleURL.TrafficNight : Mapbox.StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onPress={onMapPress}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: areaConfig.center, zoomLevel: 12.4 }}
        />

        {showMicrozones ? (
          <Mapbox.ShapeSource id="crime-zones-source" shape={microzoneCollection}>
            <Mapbox.FillLayer id="crime-zones-fill" style={zoneFillStyle} />
            <Mapbox.LineLayer id="crime-zones-outline" style={zoneLineStyle} />
          </Mapbox.ShapeSource>
        ) : null}

        <Mapbox.ShapeSource id="crime-incidents-source" shape={incidentCollection} onPress={onMapPress}>
          {showHeatmap ? (
            <Mapbox.HeatmapLayer id="crime-heatmap" style={heatmapLayerStyle} />
          ) : null}
          {showMarkers ? (
            <Mapbox.CircleLayer id="crime-markers" style={markerLayerStyle} />
          ) : null}
        </Mapbox.ShapeSource>

        <Mapbox.ShapeSource id="focus-radius-source" shape={focusRadiusOverlay}>
          <Mapbox.FillLayer id="focus-radius-fill" style={{ fillColor: '#60a5fa', fillOpacity: 0.1 }} />
          <Mapbox.LineLayer id="focus-radius-line" style={{ lineColor: '#60a5fa', lineWidth: 2, lineOpacity: 0.8, lineDasharray: [3, 2] }} />
        </Mapbox.ShapeSource>

        {focusCoordinate ? (
          <Mapbox.PointAnnotation id="focus-pin" coordinate={focusCoordinate} draggable onDragEnd={onPinDragEnd}>
            <View style={styles.focusPinOuter}>
              <View style={styles.focusPinInner} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>

      {/* Toggle controls button */}
      <Pressable style={[
        styles.controlsToggle,
        { top: insets.top + 8, backgroundColor: isDarkMode ? 'rgba(15,55,90,0.94)' : 'rgba(255,255,255,0.96)', borderColor: isDarkMode ? '#4a90c7' : '#94a3b8' }
      ]} onPress={() => setShowControls((prev) => !prev)}>
        <Text style={[styles.controlsToggleText, { color: isDarkMode ? '#eff8ff' : '#0f172a' }]}>{showControls ? 'Hide Controls' : 'Controls'}</Text>
      </Pressable>

      {/* Controls panel */}
      {showControls ? (
        <ScrollView style={[
          styles.topPanel,
          { top: insets.top + 48, backgroundColor: isDarkMode ? 'rgba(7,22,40,0.92)' : 'rgba(255,255,255,0.96)', borderColor: isDarkMode ? 'rgba(80,130,180,0.4)' : 'rgba(150,180,210,0.6)' }
        ]} nestedScrollEnabled>
          <View style={styles.selectorRow}>
            <View style={[styles.selectorField, { backgroundColor: isDarkMode ? 'rgba(9,35,60,0.85)' : 'rgba(248,250,252,0.9)', borderColor: isDarkMode ? '#2a4d70' : '#cbd5e1' }]}>
              <Text style={styles.fieldLabel}>State</Text>
              <Picker
                selectedValue={selectedState}
                onValueChange={(value) => {
                  const nextDistrict = getDistricts(value)[0] || DEFAULT_REGION.district;
                  const nextArea = getAreas(value, nextDistrict)[0] || DEFAULT_REGION.area;
                  setSelectedState(value);
                  setSelectedDistrict(nextDistrict);
                  setSelectedArea(nextArea);
                  moveFocusToArea(value, nextDistrict, nextArea);
                }}
                style={styles.picker}
                dropdownIconColor="#d9e9f9">
                {states.map((item) => (
                  <Picker.Item key={item} label={item} value={item} color="#e4f0fb" />
                ))}
              </Picker>
            </View>

            <View style={[styles.selectorField, { backgroundColor: isDarkMode ? 'rgba(9,35,60,0.85)' : 'rgba(248,250,252,0.9)', borderColor: isDarkMode ? '#2a4d70' : '#cbd5e1' }]}>
              <Text style={styles.fieldLabel}>District</Text>
              <Picker
                selectedValue={selectedDistrict}
                onValueChange={(value) => {
                  const nextArea = getAreas(selectedState, value)[0] || DEFAULT_REGION.area;
                  setSelectedDistrict(value);
                  setSelectedArea(nextArea);
                  moveFocusToArea(selectedState, value, nextArea);
                }}
                style={styles.picker}
                dropdownIconColor="#d9e9f9">
                {districts.map((item) => (
                  <Picker.Item key={item} label={item} value={item} color="#e4f0fb" />
                ))}
              </Picker>
            </View>

            <Pressable style={[styles.areaPickerButton, { backgroundColor: isDarkMode ? 'rgba(9,35,60,0.85)' : 'rgba(248,250,252,0.9)', borderColor: isDarkMode ? '#2a4d70' : '#cbd5e1' }]} onPress={() => setShowAreaSearch(true)}>
              <Text style={styles.fieldLabel}>Area</Text>
              <Text style={styles.areaPickerText} numberOfLines={1}>{selectedArea}</Text>
            </Pressable>
          </View>

          {/* Year + Month */}
          <View style={styles.timeControls}>
            <View style={styles.yearPill}>
              <Text style={styles.yearLabel}>{meta.year}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
              {MONTH_LABELS.map((month, index) => (
                <Pressable
                  key={month}
                  style={[styles.chip, monthIndex === index && styles.chipActive]}
                  onPress={() => setMonthIndex(index)}>
                  <Text style={[styles.chipText, monthIndex === index && styles.chipTextActive]}>{month}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.weekRow}>
              {WEEK_OPTIONS.map((week) => (
                <Pressable
                  key={`week-${week}`}
                  style={[styles.weekChip, weekIndex === week && styles.weekChipActive]}
                  onPress={() => setWeekIndex(week)}>
                  <Text style={[styles.chipText, weekIndex === week && styles.chipTextActive]}>{`W${week}`}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Actions row */}
          <View style={styles.actionsRow}>
            <Pressable style={styles.actionBtn} onPress={refreshData}>
              <Text style={styles.actionBtnText}>Refresh</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={() => setShowStats(true)}>
              <Text style={styles.actionBtnText}>Statistics</Text>
            </Pressable>
            <Pressable style={styles.actionBtn} onPress={recenterToCurrentLocation}>
              <Text style={styles.actionBtnText}>My Location</Text>
            </Pressable>
          </View>

          {/* Radius + layers */}
          <View style={styles.radiusRow}>
            {SCAN_RADIUS_OPTIONS.map((radius) => (
              <Pressable
                key={`radius-${radius}`}
                style={[styles.chip, scanRadiusMeters === radius && styles.chipActive]}
                onPress={() => setScanRadiusMeters(radius)}>
                <Text style={[styles.chipText, scanRadiusMeters === radius && styles.chipTextActive]}>{`${radius}m`}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.layerRow}>
            <Pressable style={[styles.layerToggle, showMicrozones && styles.layerToggleActive]} onPress={() => setShowMicrozones((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Microzones</Text>
            </Pressable>
            <Pressable style={[styles.layerToggle, showHeatmap && styles.layerToggleActive]} onPress={() => setShowHeatmap((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Heatmap</Text>
            </Pressable>
            <Pressable style={[styles.layerToggle, showMarkers && styles.layerToggleActive]} onPress={() => setShowMarkers((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Markers</Text>
            </Pressable>
            <Pressable style={[styles.layerToggle, showLegend && styles.layerToggleActive]} onPress={() => setShowLegend((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Legend</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}

      {/* Safety Score Card – always visible at bottom */}
      <View style={[styles.scoreCard, { bottom: insets.bottom + 140, backgroundColor: isDarkMode ? 'rgba(7,26,46,0.92)' : 'rgba(255,255,255,0.97)', borderColor: isDarkMode ? '#2d5a84' : '#c8d8ea' }]}>
        <View style={[styles.scoreBand, { backgroundColor: snapshot.currentBand.color }]} />
        <View style={styles.scoreTextWrap}>
          <Text style={[styles.scoreTitle, { color: isDarkMode ? '#edf7ff' : '#0f172a' }]}>{`Safety Score: ${snapshot.currentScore}`}</Text>
          <View style={styles.scoreMetaRow}>
            <Text style={[styles.scoreMeta, { color: isDarkMode ? '#99bbd6' : '#475569' }]}>{`${snapshot.currentBand.label}`}</Text>
            <Text style={[styles.scoreMeta, { color: isDarkMode ? '#99bbd6' : '#475569' }]}>{` · Last week: ${snapshot.previousScore}`}</Text>
            <Text style={[styles.scoreChange, { color: changeColor(snapshot.scoreChangePct) }]}>
              {` ${changeArrow(snapshot.scoreChangePct)}`}
            </Text>
          </View>
        </View>
        <Pressable style={styles.infoButton} onPress={() => setShowScoreHelp((prev) => !prev)}>
          <Text style={styles.infoText}>ⓘ</Text>
        </Pressable>
      </View>

      {/* Score help tooltip */}
      {showScoreHelp ? (
        <View style={[styles.helpTooltip, { bottom: insets.bottom + 220 }]}>
          <Text style={styles.helpText}>{SCORE_HELP_TEXT}</Text>
        </View>
      ) : null}

      {/* Legend */}
      {showLegend ? (
        <View style={[styles.legendCard, { bottom: insets.bottom + 220 }]}>
          {SCORE_BANDS.map((band) => (
            <View key={band.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: band.color }]} />
              <Text style={styles.legendText}>{band.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Source info */}
      <View style={[styles.sourcePanel, { bottom: insets.bottom + 84, backgroundColor: isDarkMode ? 'rgba(6,22,38,0.88)' : 'rgba(255,255,255,0.95)', borderColor: isDarkMode ? '#254563' : '#c8d8ea' }]}>
        <Text style={[styles.sourceText, {color: isDarkMode ? '#7a9cb8' : '#64748b'}]} numberOfLines={2}>{meta.sourcesText}</Text>
      </View>

      {/* FAB column */}
      <View style={[styles.fabColumn, { bottom: insets.bottom + 84 }]}>
        <Pressable style={[styles.fab, { backgroundColor: isDarkMode ? '#1a4e7a' : '#1e40af', borderColor: isDarkMode ? '#5a9fd4' : '#3b82f6' }]} onPress={openFilter}>
          <Text style={styles.fabText}>Filters</Text>
        </Pressable>
      </View>

      {/* Tap summary */}
      {tapSummary ? (
        <Animated.View
          style={[
            styles.tapSummary,
            { bottom: insets.bottom + 210, backgroundColor: isDarkMode ? 'rgba(8,30,52,0.94)' : 'rgba(255,255,255,0.97)', borderColor: isDarkMode ? '#3d6d9a' : '#c8d8ea' },
            {
              opacity: summaryAnim,
              transform: [{
                translateY: summaryAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] })
              }]
            }
          ]}>
          <Text style={styles.tapTitle}>Location Scan</Text>
          <Text style={styles.tapMeta}>{`${tapSummary.count} incidents in ${scanRadiusMeters}m`}</Text>
          <Text style={styles.tapMeta}>{`Top crime: ${tapSummary.dominantCrimeType}`}</Text>
          <Text style={styles.tapMeta}>{`Score: ${tapSummary.score}`}</Text>
          {tapSummary.incidents?.length ? (
            <Pressable
              style={styles.tapButton}
              onPress={() => setSelectedIncident(tapSummary.incidents[0])}>
              <Text style={styles.tapButtonText}>View Details</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}

      {/* Filter drawer */}
      {filterVisible ? (
        <>
          <Pressable style={styles.drawerBackdrop} onPress={closeFilter} />
          <Animated.View
            style={[
              styles.drawerWrap,
              {
                transform: [{
                  translateY: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [340, 0] })
                }]
              }
            ]}>
            <CrimeFilterDrawer
              selectedCategories={draftCategories}
              severityGradedOnly={draftSeverityOnly}
              onCategoryToggle={(key) => setDraftCategories((current) => toggleCategory(current, key))}
              onSeverityToggle={setDraftSeverityOnly}
              onApply={applyFilter}
              onReset={resetFilter}
            />
          </Animated.View>
        </>
      ) : null}

      {/* Stats overlay */}
      <Animated.View
        pointerEvents={showStats ? 'auto' : 'none'}
        style={[
          styles.statsWrap,
          {
            transform: [{
              translateX: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_WIDTH, 0] })
            }]
          }
        ]}>
        <CrimeMonitorStatsScreen
          area={selectedArea}
          monthLabel={MONTH_LABELS[monthIndex]}
          snapshot={snapshot}
          sourceText={meta.sourcesText}
          lastUpdated={meta.lastUpdatedAt}
          onBack={() => setShowStats(false)}
        />
      </Animated.View>

      <AreaSearchModal
        visible={showAreaSearch}
        areas={areas}
        selectedArea={selectedArea}
        onSelect={(value) => {
          setSelectedArea(value);
          moveFocusToArea(selectedState, selectedDistrict, value);
        }}
        onClose={() => setShowAreaSearch(false)}
      />

      <CrimeIncidentDetailsModal
        visible={Boolean(selectedIncident)}
        incident={selectedIncident}
        onBack={() => setSelectedIncident(null)}
      />
    </View>
  );
}

const getStyles = (isDarkMode) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDarkMode ? '#031324' : '#f8fafc'
  },
  controlsToggle: {
    position: 'absolute',
    right: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#4a90c7' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(15, 55, 90, 0.94)' : 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    zIndex: 12
  },
  controlsToggleText: {
    color: isDarkMode ? '#eff8ff' : '#0f172a',
    fontWeight: '800',
    fontSize: 12
  },
  topPanel: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: isDarkMode ? 'rgba(80, 130, 180, 0.4)' : 'rgba(203, 213, 225, 0.8)',
    backgroundColor: isDarkMode ? 'rgba(7, 22, 40, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    maxHeight: '55%',
    zIndex: 10
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch'
  },
  selectorField: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a4d70' : '#cbd5e1',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: isDarkMode ? 'rgba(9, 35, 60, 0.85)' : 'rgba(248, 250, 252, 0.9)'
  },
  fieldLabel: {
    color: isDarkMode ? '#8fb8d8' : '#64748b',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 5,
    marginLeft: 8,
    letterSpacing: 0.5
  },
  picker: {
    color: isDarkMode ? '#e7f2fd' : '#0f172a',
    marginTop: -8,
    marginBottom: -10,
    height: 44
  },
  areaPickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2a4d70' : '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    justifyContent: 'space-between',
    backgroundColor: isDarkMode ? 'rgba(9, 35, 60, 0.85)' : 'rgba(248, 250, 252, 0.9)'
  },
  areaPickerText: {
    marginTop: 3,
    color: isDarkMode ? '#eaf4ff' : '#0f172a',
    fontWeight: '700',
    fontSize: 12
  },
  timeControls: {
    marginTop: 8
  },
  yearPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: isDarkMode ? '#4a7da8' : '#e2e8f0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: isDarkMode ? 'rgba(20, 58, 92, 0.7)' : 'rgba(241, 245, 249, 0.9)'
  },
  yearLabel: {
    color: isDarkMode ? '#e8f3fd' : '#0f172a',
    fontWeight: '800',
    fontSize: 12
  },
  monthScroll: {
    marginTop: 7,
    paddingRight: 10,
    gap: 5
  },
  chip: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4f73' : '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: isDarkMode ? 'rgba(9, 33, 56, 0.8)' : 'rgba(248, 250, 252, 0.9)'
  },
  chipActive: {
    borderColor: isDarkMode ? '#5a9fd4' : '#94a3b8',
    backgroundColor: isDarkMode ? '#1a4e7a' : '#e0e7ff'
  },
  chipText: {
    color: isDarkMode ? '#a8c8e2' : '#e2e8f0',
    fontWeight: '700',
    fontSize: 11
  },
  chipTextActive: {
    color: isDarkMode ? '#f0f8ff' : '#0f172a'
  },
  weekRow: {
    marginTop: 7,
    flexDirection: 'row',
    gap: 5
  },
  weekChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4f73' : '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(9, 33, 56, 0.8)' : 'rgba(248, 250, 252, 0.9)'
  },
  weekChipActive: {
    borderColor: isDarkMode ? '#5a9fd4' : '#94a3b8',
    backgroundColor: isDarkMode ? '#1a4e7a' : '#e0e7ff'
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: isDarkMode ? '#4a7da8' : '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(22, 62, 98, 0.7)' : 'rgba(241, 245, 249, 0.9)'
  },
  actionBtnText: {
    color: isDarkMode ? '#e8f3fe' : '#0f172a',
    fontWeight: '800',
    fontSize: 11
  },
  radiusRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    alignItems: 'center'
  },
  layerRow: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingBottom: 4
  },
  layerToggle: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d4f73' : '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: isDarkMode ? 'rgba(8, 28, 48, 0.7)' : 'rgba(241, 245, 249, 0.9)'
  },
  layerToggleActive: {
    borderColor: isDarkMode ? '#5a9fd4' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(35, 90, 140, 0.6)' : 'rgba(226, 232, 240, 0.8)'
  },
  layerToggleText: {
    color: isDarkMode ? '#d0e2f4' : '#0f172a',
    fontWeight: '700',
    fontSize: 10
  },
  scoreCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#2d5a84' : '#cbd5e1',
    backgroundColor: isDarkMode ? 'rgba(7, 26, 46, 0.92)' : 'rgba(255, 255, 255, 0.95)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  scoreBand: {
    width: 5,
    height: 36,
    borderRadius: 999,
    marginRight: 9
  },
  scoreTextWrap: {
    flex: 1
  },
  scoreTitle: {
    color: isDarkMode ? '#edf7ff' : '#0f172a',
    fontWeight: '800',
    fontSize: 14
  },
  scoreMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2
  },
  scoreMeta: {
    color: isDarkMode ? '#99bbd6' : '#64748b',
    fontSize: 11
  },
  scoreChange: {
    fontSize: 11,
    fontWeight: '800'
  },
  infoButton: {
    borderWidth: 1,
    borderColor: isDarkMode ? '#3d6d9a' : '#94a3b8',
    borderRadius: 999,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center'
  },
  infoText: {
    color: isDarkMode ? '#d7eafc' : '#e2e8f0',
    fontSize: 14,
    fontWeight: '700'
  },
  helpTooltip: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#3d6d9a' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(9, 35, 62, 0.94)' : 'rgba(255, 255, 255, 0.95)',
    padding: 9
  },
  helpText: {
    color: isDarkMode ? '#c0d6ea' : '#0f172a',
    fontSize: 11,
    lineHeight: 16
  },
  legendCard: {
    position: 'absolute',
    left: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: isDarkMode ? '#3d6d9a' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(5, 22, 40, 0.9)' : 'rgba(255, 255, 255, 0.95)',
    padding: 8
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  legendText: {
    color: isDarkMode ? '#d0e2f4' : '#0f172a',
    fontSize: 11,
    fontWeight: '700'
  },
  sourcePanel: {
    position: 'absolute',
    left: 12,
    right: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#254563' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(6, 22, 38, 0.88)' : 'rgba(248, 250, 252, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  sourceText: {
    color: isDarkMode ? '#7a9cb8' : '#64748b',
    fontSize: 9,
    lineHeight: 13
  },
  fabColumn: {
    position: 'absolute',
    right: 12,
    alignItems: 'flex-end'
  },
  fab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: isDarkMode ? '#5a9fd4' : '#94a3b8',
    backgroundColor: isDarkMode ? '#1a4e7a' : '#e0e7ff',
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6
  },
  fabText: {
    color: isDarkMode ? '#eff8ff' : '#0f172a',
    fontWeight: '800',
    fontSize: 12
  },
  focusPinOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: isDarkMode ? '#1e3a8a' : '#e2e8f0',
    backgroundColor: isDarkMode ? '#dbeafe' : '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  focusPinInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: isDarkMode ? '#2563eb' : '#e2e8f0'
  },
  tapSummary: {
    position: 'absolute',
    right: 12,
    width: 190,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDarkMode ? '#3d6d9a' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(8, 30, 52, 0.94)' : 'rgba(255, 255, 255, 0.95)',
    padding: 10
  },
  tapTitle: {
    color: isDarkMode ? '#f0f8ff' : '#0f172a',
    fontWeight: '800',
    fontSize: 13
  },
  tapMeta: {
    marginTop: 3,
    color: isDarkMode ? '#b0cfe2' : '#e2e8f0',
    fontSize: 11
  },
  tapButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: isDarkMode ? '#5a9fd4' : '#94a3b8',
    backgroundColor: isDarkMode ? 'rgba(28, 82, 130, 0.85)' : 'rgba(248, 250, 252, 0.9)',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center'
  },
  tapButtonText: {
    color: isDarkMode ? '#eff8ff' : '#0f172a',
    fontWeight: '800',
    fontSize: 11
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDarkMode ? 'rgba(3, 11, 22, 0.6)' : 'rgba(226, 232, 240, 0.8)'
  },
  drawerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0
  },
  statsWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30
  }
});