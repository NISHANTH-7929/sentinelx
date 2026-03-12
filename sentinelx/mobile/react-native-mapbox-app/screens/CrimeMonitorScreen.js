import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import AreaSearchModal from '../components/AreaSearchModal';
import CrimeFilterDrawer from '../components/CrimeFilterDrawer';
import CrimeIncidentDetailsModal from '../components/CrimeIncidentDetailsModal';
import CrimeMonitorStatsScreen from './CrimeMonitorStatsScreen';
import { useUserLocation } from '../hooks/useUserLocation';
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
  getAreaConfig,
  getAreas,
  getDistricts,
  REGION_TREE
} from '../services/regions';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const SCORE_HELP_TEXT =
  'Safety Score (0-100) combines number of incidents and severity for the selected area and time window. Higher score means safer area.';

const DEFAULT_SCAN_RADIUS_METERS = 250;
const SCAN_RADIUS_OPTIONS = [100, 250, 400, 800];
const EMPTY_FEATURE_COLLECTION = { type: 'FeatureCollection', features: [] };

const initialWeek = () => {
  const day = new Date().getDate();
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

const layerToggleStyle = (active) => [styles.layerToggle, active && styles.layerToggleActive];

const zoneFillStyle = {
  fillColor: ['get', 'color'],
  fillOpacity: 0.22
};

const zoneLineStyle = {
  lineColor: '#1b3959',
  lineWidth: 0.8,
  lineOpacity: 0.5
};

const heatmapLayerStyle = {
  heatmapWeight: ['match', ['get', 'severity'], 'Critical', 1, 'High', 0.8, 'Medium', 0.5, 0.3],
  heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 8, 1.2, 14, 3.2],
  heatmapColor: [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(22,163,74,0)',
    0.3,
    '#16a34a',
    0.5,
    '#eab308',
    0.75,
    '#f97316',
    1,
    '#dc2626'
  ],
  heatmapRadius: ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 36],
  heatmapOpacity: 0.78
};

const markerLayerStyle = {
  circleColor: ['get', 'color'],
  circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 4, 14, 8],
  circleStrokeColor: '#f5f9ff',
  circleStrokeWidth: 1,
  circleOpacity: 0.9
};

const toggleCategory = (current, key) => {
  if (key === 'all') {
    return ['all'];
  }

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
    coordinates.push([
      lng + lngDelta * Math.cos(angle),
      lat + latDelta * Math.sin(angle)
    ]);
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates]
        }
      }
    ]
  };
};

export default function CrimeMonitorScreen() {
  const cameraRef = useRef(null);
  const insets = useSafeAreaInsets();
  const { coordinate: userCoordinate } = useUserLocation();

  const [selectedState, setSelectedState] = useState(DEFAULT_REGION.state);
  const [selectedDistrict, setSelectedDistrict] = useState(DEFAULT_REGION.district);
  const [selectedArea, setSelectedArea] = useState(DEFAULT_REGION.area);

  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [weekIndex, setWeekIndex] = useState(initialWeek());

  const [categories, setCategories] = useState(['all']);
  const [draftCategories, setDraftCategories] = useState(['all']);
  const [severityGradedOnly, setSeverityGradedOnly] = useState(false);
  const [draftSeverityOnly, setDraftSeverityOnly] = useState(false);

  const [showAreaSearch, setShowAreaSearch] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [showMicrozones, setShowMicrozones] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showScoreHelp, setShowScoreHelp] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showHud, setShowHud] = useState(false);

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
      monthIndex: new Date().getMonth(),
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
    if (!focusCoordinate) {
      return EMPTY_FEATURE_COLLECTION;
    }
    return createCirclePolygon(focusCoordinate, scanRadiusMeters);
  }, [focusCoordinate, scanRadiusMeters]);

  const mapTitle = `Crime Monitor - ${selectedState} / ${selectedDistrict} / ${selectedArea} - ${MONTH_LABELS[monthIndex]}`;

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

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

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

    setTapSummary(
      summary
        ? {
            coordinate: focusCoordinate,
            ...summary
          }
        : null
    );
  }, [focusCoordinate, scanRadiusMeters, snapshot.incidents]);

  useEffect(() => {
    Animated.timing(summaryAnim, {
      toValue: tapSummary && showHud ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start();
  }, [showHud, summaryAnim, tapSummary]);

  useEffect(() => {
    Animated.timing(statsAnim, {
      toValue: showStats ? 1 : 0,
      duration: 260,
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
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  };

  const closeFilter = () => {
    Animated.timing(filterAnim, {
      toValue: 0,
      duration: 220,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        setFilterVisible(false);
      }
    });
  };

  const onMapPress = (event) => {
    const incidentId = event?.features?.find((item) => item?.properties?.incidentId)?.properties?.incidentId;
    if (incidentId) {
      const found = snapshot.incidents.find((item) => item.id === incidentId);
      if (found) {
        setSelectedIncident(found);
      }
      return;
    }

    const coords = event?.geometry?.coordinates;
    if (!coords) {
      return;
    }

    setFollowCurrentLocation(false);
    setFocusCoordinate(coords);
    setShowHud(true);
  };

  const onPinDragEnd = (event) => {
    const coords = event?.geometry?.coordinates;
    if (!coords) {
      return;
    }

    setFollowCurrentLocation(false);
    setFocusCoordinate(coords);
    setShowHud(true);
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
        styleURL={Mapbox.StyleURL.Street}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
        onPress={onMapPress}>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: areaConfig.center,
            zoomLevel: 12.4
          }}
        />

        {showMicrozones ? (
          <Mapbox.ShapeSource id="crime-zones-source" shape={microzoneCollection}>
            <Mapbox.FillLayer
              id="crime-zones-fill"
              style={zoneFillStyle}
            />
            <Mapbox.LineLayer
              id="crime-zones-outline"
              style={zoneLineStyle}
            />
          </Mapbox.ShapeSource>
        ) : null}

        <Mapbox.ShapeSource id="crime-incidents-source" shape={incidentCollection} onPress={onMapPress}>
          {showHeatmap ? (
            <Mapbox.HeatmapLayer
              id="crime-heatmap"
              style={heatmapLayerStyle}
            />
          ) : null}

          {showMarkers ? (
            <Mapbox.CircleLayer
              id="crime-markers"
              style={markerLayerStyle}
            />
          ) : null}
        </Mapbox.ShapeSource>

        <Mapbox.ShapeSource id="focus-radius-source" shape={focusRadiusOverlay}>
          <Mapbox.FillLayer
            id="focus-radius-fill"
            style={{
              fillColor: '#60a5fa',
              fillOpacity: 0.12
            }}
          />
          <Mapbox.LineLayer
            id="focus-radius-line"
            style={{
              lineColor: '#60a5fa',
              lineWidth: 2,
              lineOpacity: 0.85
            }}
          />
        </Mapbox.ShapeSource>

        {focusCoordinate ? (
          <Mapbox.PointAnnotation id="focus-pin" coordinate={focusCoordinate} draggable onDragEnd={onPinDragEnd}>
            <View style={styles.focusPinOuter}>
              <View style={styles.focusPinInner} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}
      </Mapbox.MapView>

      <Pressable style={[styles.controlsToggle, { top: insets.top + 8 }]} onPress={() => setShowControls((prev) => !prev)}>
        <Text style={styles.controlsToggleText}>{showControls ? 'Hide Controls' : 'Show Controls'}</Text>
      </Pressable>

      {showControls ? (
        <View style={[styles.topPanel, { top: insets.top + 52 }]}>
          <View style={styles.selectorRow}>
            <View style={styles.selectorField}>
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

            <View style={styles.selectorField}>
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

            <Pressable style={styles.areaPickerButton} onPress={() => setShowAreaSearch(true)}>
              <Text style={styles.fieldLabel}>Area / Zone</Text>
              <Text style={styles.areaPickerText} numberOfLines={1}>{selectedArea}</Text>
            </Pressable>
          </View>

          <View style={styles.timeControls}>
            <View style={styles.yearPill}>
              <Text style={styles.yearLabel}>{meta.year}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthScroll}>
              {MONTH_LABELS.map((month, index) => (
                <Pressable
                  key={month}
                  style={[styles.monthChip, monthIndex === index && styles.monthChipActive]}
                  onPress={() => setMonthIndex(index)}>
                  <Text style={[styles.monthChipText, monthIndex === index && styles.monthChipTextActive]}>{month}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.weekRow}>
              {WEEK_OPTIONS.map((week) => (
                <Pressable
                  key={`week-${week}`}
                  style={[styles.weekChip, weekIndex === week && styles.weekChipActive]}
                  onPress={() => setWeekIndex(week)}>
                  <Text style={[styles.weekChipText, weekIndex === week && styles.weekChipTextActive]}>{`Week ${week}`}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.mapTitleRow}>
            <Text style={styles.mapTitle} numberOfLines={2}>{mapTitle}</Text>
            <View style={styles.actionsRow}>
              <Pressable style={styles.headerButton} onPress={refreshData}>
                <Text style={styles.headerButtonText}>Refresh</Text>
              </Pressable>
              <Pressable style={styles.headerButton} onPress={() => setShowStats(true)}>
                <Text style={styles.headerButtonText}>Statistics</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.radiusRow}>
            {SCAN_RADIUS_OPTIONS.map((radius) => (
              <Pressable
                key={`radius-${radius}`}
                style={[styles.monthChip, scanRadiusMeters === radius && styles.monthChipActive]}
                onPress={() => setScanRadiusMeters(radius)}>
                <Text style={[styles.monthChipText, scanRadiusMeters === radius && styles.monthChipTextActive]}>{`${radius}m`}</Text>
              </Pressable>
            ))}
            <Pressable style={styles.headerButton} onPress={recenterToCurrentLocation}>
              <Text style={styles.headerButtonText}>My Location</Text>
            </Pressable>
          </View>

          <View style={styles.layerRow}>
            <Pressable style={layerToggleStyle(showMicrozones)} onPress={() => setShowMicrozones((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Microzone tiles</Text>
            </Pressable>
            <Pressable style={layerToggleStyle(showHeatmap)} onPress={() => setShowHeatmap((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Heatmap</Text>
            </Pressable>
            <Pressable style={layerToggleStyle(showMarkers)} onPress={() => setShowMarkers((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Markers</Text>
            </Pressable>
            <Pressable style={layerToggleStyle(showLegend)} onPress={() => setShowLegend((prev) => !prev)}>
              <Text style={styles.layerToggleText}>Legend</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={[styles.scoreCardMini, !showHud && styles.hiddenOverlay]}>
        <View style={[styles.scoreBand, { backgroundColor: snapshot.currentBand.color }]} />
        <View style={styles.scoreTextWrap}>
          <Text style={styles.scoreTitle}>{`Safety Score ${snapshot.currentScore}`}</Text>
          <Text style={styles.scoreMeta}>{`${snapshot.currentBand.label} | Last week ${snapshot.previousScore}`}</Text>
        </View>
        <Pressable style={styles.infoButton} onPress={() => setShowScoreHelp((prev) => !prev)}>
          <Text style={styles.infoText}>How calculated?</Text>
        </Pressable>
      </View>

      {showHud && showScoreHelp ? (
        <View style={styles.helpTooltip}>
          <Text style={styles.helpText}>{SCORE_HELP_TEXT}</Text>
        </View>
      ) : null}

      {showHud && showLegend ? (
        <View style={styles.legendCard}>
          {SCORE_BANDS.map((band) => (
            <View key={band.label} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: band.color }]} />
              <Text style={styles.legendText}>{band.label}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={[styles.sourcePanel, !showHud && styles.hiddenOverlay]}>
        <Text style={styles.sourceText}>{meta.sourcesText}</Text>
        <Text style={styles.updatedText}>{`Last updated: ${new Date(meta.lastUpdatedAt).toLocaleString()}`}</Text>
      </View>

      <View style={[styles.fabColumn, { bottom: insets.bottom + 84 }]}>
        <Pressable style={[styles.fabSecondary, showHud && styles.fabSecondaryActive]} onPress={() => setShowHud((prev) => !prev)}>
          <Text style={styles.fabSecondaryText}>{showHud ? 'Hide UI' : 'Show UI'}</Text>
        </Pressable>
        <Pressable style={styles.fab} onPress={openFilter}>
          <Text style={styles.fabText}>Filters</Text>
        </Pressable>
      </View>

      {showHud && tapSummary ? (
        <Animated.View
          style={[
            styles.tapSummary,
            {
              opacity: summaryAnim,
              transform: [
                {
                  translateY: summaryAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [26, 0]
                  })
                }
              ]
            }
          ]}>
          <Text style={styles.tapTitle}>Location Summary</Text>
          <Text style={styles.tapMeta}>{`${tapSummary.count} incidents in ${scanRadiusMeters}m`}</Text>
          <Text style={styles.tapMeta}>{`Dominant crime: ${tapSummary.dominantCrimeType}`}</Text>
          <Text style={styles.tapMeta}>{`Safety score: ${tapSummary.score}`}</Text>
          <Pressable
            style={styles.tapButton}
            onPress={() => {
              if (tapSummary.incidents?.length) {
                setSelectedIncident(tapSummary.incidents[0]);
              }
            }}>
            <Text style={styles.tapButtonText}>View Details</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {filterVisible ? (
        <>
          <Pressable style={styles.drawerBackdrop} onPress={closeFilter} />
          <Animated.View
            style={[
              styles.drawerWrap,
              {
                transform: [
                  {
                    translateY: filterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [340, 0]
                    })
                  }
                ]
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

      <Animated.View
        pointerEvents={showStats ? 'auto' : 'none'}
        style={[
          styles.statsWrap,
          {
            transform: [
              {
                translateX: statsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [SCREEN_WIDTH, 0]
                })
              }
            ]
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#031324'
  },
  controlsToggle: {
    position: 'absolute',
    right: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#70bbf8',
    backgroundColor: 'rgba(22, 73, 115, 0.94)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 12
  },
  controlsToggleText: {
    color: '#eff8ff',
    fontWeight: '800',
    fontSize: 12
  },
  topPanel: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(95, 148, 198, 0.5)',
    backgroundColor: 'rgba(7, 24, 42, 0.86)',
    padding: 10,
    maxHeight: '60%'
  },
  selectorRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'stretch'
  },
  selectorField: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2e5d8c',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'rgba(9, 39, 67, 0.8)'
  },
  fieldLabel: {
    color: '#9fc2e2',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 6,
    marginLeft: 8,
    letterSpacing: 0.5
  },
  picker: {
    color: '#e7f2fd',
    marginTop: -8,
    marginBottom: -10,
    height: 44
  },
  areaPickerButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2e5d8c',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(9, 39, 67, 0.8)'
  },
  areaPickerText: {
    marginTop: 4,
    color: '#eaf4ff',
    fontWeight: '700'
  },
  timeControls: {
    marginTop: 9
  },
  yearPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#4f84b5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(20, 63, 102, 0.7)'
  },
  yearLabel: {
    color: '#e8f3fd',
    fontWeight: '800'
  },
  monthScroll: {
    marginTop: 8,
    paddingRight: 10,
    gap: 6
  },
  monthChip: {
    borderWidth: 1,
    borderColor: '#315d87',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: 'rgba(9, 36, 61, 0.8)'
  },
  monthChipActive: {
    borderColor: '#7bc3ff',
    backgroundColor: '#266399'
  },
  monthChipText: {
    color: '#b4d1eb',
    fontWeight: '700',
    fontSize: 12
  },
  monthChipTextActive: {
    color: '#f2f9ff'
  },
  weekRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6
  },
  weekChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#315d87',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
    backgroundColor: 'rgba(9, 36, 61, 0.8)'
  },
  weekChipActive: {
    borderColor: '#7bc3ff',
    backgroundColor: '#266399'
  },
  weekChipText: {
    color: '#b4d1eb',
    fontWeight: '700',
    fontSize: 12
  },
  weekChipTextActive: {
    color: '#eff8ff'
  },
  mapTitleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  mapTitle: {
    flex: 1,
    color: '#f2f8ff',
    fontWeight: '800',
    fontSize: 12,
    lineHeight: 16
  },
  actionsRow: {
    marginLeft: 8,
    flexDirection: 'row',
    gap: 6
  },
  headerButton: {
    borderWidth: 1,
    borderColor: '#5e90be',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(28, 72, 112, 0.7)'
  },
  headerButtonText: {
    color: '#e8f3fe',
    fontWeight: '800',
    fontSize: 12
  },
  radiusRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  },
  layerRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  layerToggle: {
    borderWidth: 1,
    borderColor: '#365e86',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(8, 31, 52, 0.7)'
  },
  layerToggleActive: {
    borderColor: '#70bbf8',
    backgroundColor: 'rgba(41, 104, 159, 0.62)'
  },
  layerToggleText: {
    color: '#d8e9fa',
    fontWeight: '700',
    fontSize: 11
  },
  scoreCardMini: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 338,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#376690',
    backgroundColor: 'rgba(7, 29, 51, 0.86)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  scoreBand: {
    width: 7,
    height: 40,
    borderRadius: 999,
    marginRight: 9
  },
  scoreTextWrap: {
    flex: 1
  },
  scoreTitle: {
    color: '#edf7ff',
    fontWeight: '800'
  },
  scoreMeta: {
    marginTop: 2,
    color: '#accae6',
    fontSize: 12
  },
  infoButton: {
    borderWidth: 1,
    borderColor: '#4f81af',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  infoText: {
    color: '#d7eafc',
    fontSize: 11,
    fontWeight: '700'
  },
  helpTooltip: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 390,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#4d769d',
    backgroundColor: 'rgba(9, 38, 66, 0.9)',
    padding: 9
  },
  helpText: {
    color: '#c9ddf1',
    fontSize: 12,
    lineHeight: 17
  },
  legendCard: {
    position: 'absolute',
    top: 440,
    left: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3f6b94',
    backgroundColor: 'rgba(5, 25, 45, 0.85)',
    padding: 9
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 7
  },
  legendText: {
    color: '#ddeaf8',
    fontSize: 12,
    fontWeight: '700'
  },
  sourcePanel: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 84,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#305b83',
    backgroundColor: 'rgba(6, 24, 42, 0.86)',
    paddingHorizontal: 9,
    paddingVertical: 8
  },
  sourceText: {
    color: '#9fbad5',
    fontSize: 11,
    lineHeight: 15
  },
  updatedText: {
    marginTop: 3,
    color: '#d7e6f5',
    fontSize: 11,
    fontWeight: '700'
  },
  fabColumn: {
    position: 'absolute',
    right: 14,
    alignItems: 'flex-end',
    gap: 8
  },
  fabSecondary: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#5e90be',
    backgroundColor: 'rgba(20, 67, 107, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  fabSecondaryActive: {
    borderColor: '#88c7fa',
    backgroundColor: '#2a6aa5'
  },
  fabSecondaryText: {
    color: '#eff8ff',
    fontWeight: '800'
  },
  fab: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#75bff9',
    backgroundColor: '#255f98',
    paddingHorizontal: 16,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  fabText: {
    color: '#eff8ff',
    fontWeight: '800'
  },
  focusPinOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e3a8a',
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center'
  },
  focusPinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb'
  },
  tapSummary: {
    position: 'absolute',
    right: 12,
    bottom: 218,
    width: 204,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#5a83aa',
    backgroundColor: 'rgba(8, 33, 58, 0.92)',
    padding: 10
  },
  tapTitle: {
    color: '#f0f8ff',
    fontWeight: '800'
  },
  tapMeta: {
    marginTop: 4,
    color: '#c3d9ef',
    fontSize: 12
  },
  tapButton: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: '#74bcf6',
    backgroundColor: 'rgba(34, 96, 152, 0.85)',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center'
  },
  tapButtonText: {
    color: '#eff8ff',
    fontWeight: '800'
  },
  drawerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 11, 22, 0.62)'
  },
  drawerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0
  },
  hiddenOverlay: {
    display: 'none'
  },
  statsWrap: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 30
  }
});























