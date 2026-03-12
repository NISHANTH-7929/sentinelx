import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View
} from 'react-native';
import Mapbox from '@rnmapbox/maps';

import IncidentDetailsModal from '../components/IncidentDetailsModal';
import IncidentTapPopup from '../components/IncidentTapPopup';
import LocationAccessModal from '../components/LocationAccessModal';
import RegionSelectorPanel from '../components/RegionSelectorPanel';
import { ThemeContext } from '../theme/ThemeContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { enrichIncident, getSeverityWeight } from '../services/incidentClassifier';
import {
  fetchIncidents,
  fetchIncidentsWithinRadius,
  startSimulator,
  stopSimulator
} from '../services/incidentsApi';
import { IncidentSocketClient } from '../services/incidentsSocket';
import { MAPBOX_ACCESS_TOKEN } from '../services/config';
import {
  DEFAULT_REGION,
  getAreaConfig,
  getAreas,
  getDistricts,
  REGION_TREE
} from '../services/regions';
import { distanceMeters } from '../services/geo';

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const GRID_SIZE_METERS = 500;
const TAP_RADIUS_METERS = 250;
const MAX_ZONE_FEATURES = 1200;

const PALETTE = {
  dark: {
    zoneOutline: '#2f455f',
    zoneSafe: '#22c55e',
    zoneModerate: '#eab308',
    zoneRisk: '#f97316',
    zoneDanger: '#ef4444',
    panelBg: 'rgba(8,24,41,0.82)',
    panelBorder: 'rgba(102,156,209,0.3)',
    panelText: '#eaf4ff',
    panelMuted: '#91b5d8',
    statusErrorBg: 'rgba(127,29,29,0.9)',
    statusErrorBorder: '#ef4444',
    statusErrorText: '#fee2e2',
    statusErrorSub: '#fca5a5',
    simBadgeBg: '#1d4ed8'
  },
  light: {
    zoneOutline: '#7f97b2',
    zoneSafe: '#16a34a',
    zoneModerate: '#ca8a04',
    zoneRisk: '#ea580c',
    zoneDanger: '#dc2626',
    panelBg: 'rgba(242,247,252,0.82)',
    panelBorder: 'rgba(64,111,161,0.34)',
    panelText: '#12365d',
    panelMuted: '#365f8a',
    statusErrorBg: 'rgba(185,28,28,0.9)',
    statusErrorBorder: '#f87171',
    statusErrorText: '#fff1f2',
    statusErrorSub: '#ffe4e6',
    simBadgeBg: '#1e3a8a'
  }
};

const inBbox = (incident, bbox) => {
  if (!bbox) return true;
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return (
    incident.longitude >= minLng &&
    incident.longitude <= maxLng &&
    incident.latitude >= minLat &&
    incident.latitude <= maxLat
  );
};

const createCirclePolygon = ([lng, lat], radiusMeters = 500, points = 64) => {
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

const buildZoneGrid = (bbox, incidents, colors) => {
  if (!bbox || incidents.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const [minLng, minLat, maxLng, maxLat] = bbox;
  const latStep = GRID_SIZE_METERS / 111320;
  const lngStep = GRID_SIZE_METERS / (111320 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));

  const zones = [];
  let tileCount = 0;

  for (let lat = minLat; lat < maxLat; lat += latStep) {
    for (let lng = minLng; lng < maxLng; lng += lngStep) {
      if (tileCount >= MAX_ZONE_FEATURES) {
        break;
      }

      const zoneIncidents = incidents.filter(
        (incident) =>
          incident.latitude >= lat &&
          incident.latitude < lat + latStep &&
          incident.longitude >= lng &&
          incident.longitude < lng + lngStep
      );

      const dangerPoints = zoneIncidents.reduce(
        (sum, incident) => sum + getSeverityWeight(incident.severityLevel) * 8,
        0
      );
      const score = Math.max(0, 100 - dangerPoints);

      let color = colors.zoneSafe;
      let label = 'Very Safe';

      if (score < 80 && score >= 60) {
        color = colors.zoneModerate;
        label = 'Moderate';
      } else if (score < 60 && score >= 40) {
        color = colors.zoneRisk;
        label = 'Risk';
      } else if (score < 40) {
        color = colors.zoneDanger;
        label = 'Dangerous';
      }

      zones.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [lng, lat],
            [lng + lngStep, lat],
            [lng + lngStep, lat + latStep],
            [lng, lat + latStep],
            [lng, lat]
          ]]
        },
        properties: {
          score,
          label,
          color
        }
      });

      tileCount += 1;
    }

    if (tileCount >= MAX_ZONE_FEATURES) {
      break;
    }
  }

  return {
    type: 'FeatureCollection',
    features: zones
  };
};

const getSocketDotColor = (status) => {
  if (status === 'connected') return '#22c55e';
  if (status === 'offline') return '#94a3b8';
  if (status === 'reconnecting' || status === 'connecting') return '#f59e0b';
  return '#ef4444';
};

const FALLBACK_TYPES = ['theft', 'robbery', 'assault', 'harassment', 'cyber fraud'];

const buildOfflineIncidents = (centerCoordinate, total = 18) => {
  if (!Array.isArray(centerCoordinate) || centerCoordinate.length !== 2) {
    return [];
  }

  const [centerLng, centerLat] = centerCoordinate;

  return Array.from({ length: total }, (_, index) => {
    const angle = (index / total) * Math.PI * 2;
    const ring = 0.0025 + (index % 4) * 0.0007;
    const longitude = centerLng + Math.cos(angle) * ring;
    const latitude = centerLat + Math.sin(angle) * ring;
    const type = FALLBACK_TYPES[index % FALLBACK_TYPES.length];

    return {
      id: `offline-${index + 1}`,
      type,
      description: 'Offline fallback incident',
      source: 'offline',
      datetime: new Date().toISOString(),
      longitude,
      latitude
    };
  });
};

export default function MapScreen() {
  const { isDarkMode } = useContext(ThemeContext);
  const colors = isDarkMode ? PALETTE.dark : PALETTE.light;

  const cameraRef = useRef(null);
  const socketRef = useRef(null);
  const mountedRef = useRef(true);

  const [selectedState, setSelectedState] = useState(DEFAULT_REGION.state);
  const [selectedDistrict, setSelectedDistrict] = useState(DEFAULT_REGION.district);
  const [selectedArea, setSelectedArea] = useState(DEFAULT_REGION.area);

  const [incidents, setIncidents] = useState([]);
  const [simulationMode, setSimulationMode] = useState(true);
  const [socketStatus, setSocketStatus] = useState('connecting');

  const [tapCoordinate, setTapCoordinate] = useState(null);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [radiusOverlay, setRadiusOverlay] = useState({ type: 'FeatureCollection', features: [] });
  const [highlightedIncidentIds, setHighlightedIncidentIds] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [pulseRadius, setPulseRadius] = useState(16);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const popupAnim = useRef(new Animated.Value(0)).current;
  const simBadgeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  const {
    coordinate,
    showPermissionModal,
    setShowPermissionModal,
    manualMode,
    locationError,
    locationEnabled,
    resolveLocation,
    openSettings,
    useManualLocation,
    setManualCoordinate
  } = useUserLocation();

  const areaConfig = useMemo(
    () => getAreaConfig(selectedState, selectedDistrict, selectedArea),
    [selectedState, selectedDistrict, selectedArea]
  );

  const states = useMemo(() => Object.keys(REGION_TREE), []);
  const districts = useMemo(() => getDistricts(selectedState), [selectedState]);
  const areas = useMemo(() => getAreas(selectedState, selectedDistrict), [selectedDistrict, selectedState]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(panelAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(simBadgeAnim, { toValue: 1.05, duration: 900, useNativeDriver: true }),
          Animated.timing(simBadgeAnim, { toValue: 1, duration: 900, useNativeDriver: true })
        ])
      )
    ]).start();

    const listenerId = pulseAnim.addListener(({ value }) => {
      if (mountedRef.current) {
        setPulseRadius(14 + value * 14);
      }
    });

    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false
      })
    ).start();

    return () => {
      panelAnim.stopAnimation();
      simBadgeAnim.stopAnimation();
      pulseAnim.removeListener(listenerId);
      pulseAnim.stopAnimation();
    };
  }, [panelAnim, popupAnim, pulseAnim, simBadgeAnim]);


  useEffect(() => {
    Animated.spring(popupAnim, {
      toValue: nearbyIncidents.length > 0 || tapCoordinate ? 1 : 0,
      friction: 8,
      tension: 70,
      useNativeDriver: true
    }).start();
  }, [nearbyIncidents.length, popupAnim, tapCoordinate]);

  const loadIncidentsForArea = useCallback(async () => {
    const sourceOpts = simulationMode
      ? { source: 'simulator' }
      : { excludeSource: 'simulator' };

    try {
      const records = await fetchIncidents({
        bbox: areaConfig.bbox,
        ...sourceOpts
      });

      if (!mountedRef.current) {
        return;
      }

      setIncidents(records.map(enrichIncident));
    } catch (_error) {
      if (!mountedRef.current) {
        return;
      }

      const fallback = buildOfflineIncidents(areaConfig.center).map(enrichIncident);
      setSocketStatus('offline');
      setIncidents(fallback);
    }
  }, [areaConfig.bbox, areaConfig.center, simulationMode]);

  const connectSocket = useCallback(() => {
    socketRef.current?.disconnect();

    const client = new IncidentSocketClient({
      mode: simulationMode ? 'simulator' : 'live',
      onStatusChange: (status) => {
        if (mountedRef.current) {
          setSocketStatus(status);
        }
      },
      onIncident: (incoming) => {
        if (!mountedRef.current) {
          return;
        }

        const enriched = enrichIncident(incoming);
        if (!inBbox(enriched, areaConfig.bbox)) {
          return;
        }

        setIncidents((previous) => {
          const deduped = [enriched, ...previous.filter((item) => item.id !== enriched.id)];
          return deduped;
        });
      }
    });

    socketRef.current = client;
    client.connect();
  }, [areaConfig.bbox, simulationMode]);

  useEffect(() => {
    connectSocket();
    return () => socketRef.current?.disconnect();
  }, [connectSocket]);

  useEffect(() => {
    loadIncidentsForArea();

    cameraRef.current?.setCamera({
      centerCoordinate: areaConfig.center,
      zoomLevel: 12,
      animationDuration: 950
    });
  }, [areaConfig, loadIncidentsForArea]);

  const incidentSource = useMemo(() => {
    const highlightedSet = new Set(highlightedIncidentIds);

    return {
      type: 'FeatureCollection',
      features: incidents.map((incident) => ({
        type: 'Feature',
        id: incident.id,
        geometry: {
          type: 'Point',
          coordinates: [incident.longitude, incident.latitude]
        },
        properties: {
          incidentId: incident.id,
          category: incident.category,
          color: incident.severityColor,
          highlighted: highlightedSet.has(incident.id),
          weight: getSeverityWeight(incident.severityLevel)
        }
      }))
    };
  }, [highlightedIncidentIds, incidents]);

  const zonesSource = useMemo(
    () => buildZoneGrid(areaConfig.bbox, incidents, colors),
    [areaConfig.bbox, colors, incidents]
  );

  const onMapTap = useCallback(
    async (event) => {
      if (event?.features?.length) {
        return;
      }

      const coords = event?.geometry?.coordinates;
      if (!coords) {
        return;
      }

      setTapCoordinate(coords);
      setRadiusOverlay(createCirclePolygon(coords, TAP_RADIUS_METERS));

      try {
        const nearby = await fetchIncidentsWithinRadius({
          coordinate: coords,
          radiusMeters: TAP_RADIUS_METERS,
          sourceFilter: simulationMode ? 'simulator' : 'live'
        });

        if (!mountedRef.current) {
          return;
        }

        const enrichedNearby = nearby
          .map(enrichIncident)
          .filter((incident) => distanceMeters([incident.longitude, incident.latitude], coords) <= TAP_RADIUS_METERS);

        setNearbyIncidents(enrichedNearby);
        setHighlightedIncidentIds(enrichedNearby.map((item) => item.id));
      } catch (_error) {
        if (mountedRef.current) {
          setNearbyIncidents([]);
          setHighlightedIncidentIds([]);
        }
      }
    },
    [simulationMode]
  );

  const onMapLongPress = useCallback(
    (event) => {
      const coords = event?.geometry?.coordinates;
      if (!coords) {
        return;
      }

      setManualCoordinate(coords);
      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        zoomLevel: 13,
        animationDuration: 750
      });
    },
    [setManualCoordinate]
  );

  const onIncidentPress = useCallback(
    (event) => {
      const feature = event?.features?.[0];
      if (!feature) {
        return;
      }

      const incidentId = feature.properties?.incidentId || feature.id;
      const incident = incidents.find((item) => item.id === incidentId);
      if (incident) {
        setSelectedIncident(incident);
      }
    },
    [incidents]
  );

  const toggleSimulation = async (enabled) => {
    setSimulationMode(enabled);

    try {
      if (enabled) {
        await startSimulator();
      } else {
        await stopSimulator();
      }

      socketRef.current?.setMode(enabled ? 'simulator' : 'live');
      await loadIncidentsForArea();
    } catch (_error) {
      if (mountedRef.current) {
        setSocketStatus('disconnected');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={StyleSheet.absoluteFillObject}
        styleURL={isDarkMode ? Mapbox.StyleURL.TrafficNight : Mapbox.StyleURL.Street}
        onPress={onMapTap}
        onLongPress={onMapLongPress}
        compassEnabled
        logoEnabled={false}
        attributionEnabled={false}
        pitchEnabled
        rotateEnabled>
        <Mapbox.Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: areaConfig.center, zoomLevel: 12, pitch: 44 }}
        />

        {coordinate ? (
          <Mapbox.PointAnnotation id="user-location" coordinate={coordinate}>
            <View style={styles.userDot} />
          </Mapbox.PointAnnotation>
        ) : null}

        <Mapbox.ShapeSource id="zones-source" shape={zonesSource}>
          <Mapbox.FillLayer
            id="zones-fill"
            style={{
              fillColor: ['get', 'color'],
              fillOpacity: isDarkMode ? 0.24 : 0.18
            }}
          />
          <Mapbox.LineLayer
            id="zones-outline"
            style={{
              lineColor: colors.zoneOutline,
              lineWidth: 0.8,
              lineOpacity: 0.45
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.ShapeSource id="incidents-source" shape={incidentSource} onPress={onIncidentPress}>
          <Mapbox.HeatmapLayer
            id="incident-heatmap"
            style={{
              heatmapWeight: ['get', 'weight'],
              heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 8, 1, 14, 3],
              heatmapColor: [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(34,211,238,0)',
                0.35,
                '#22d3ee',
                0.65,
                '#fb923c',
                1,
                '#ef4444'
              ],
              heatmapRadius: ['interpolate', ['linear'], ['zoom'], 8, 8, 14, 34],
              heatmapOpacity: isDarkMode ? 0.9 : 0.75
            }}
          />

          <Mapbox.CircleLayer
            id="violent-pulse"
            filter={['==', ['get', 'category'], 'violent']}
            style={{
              circleColor: '#ef4444',
              circleOpacity: 0.2,
              circleRadius: pulseRadius
            }}
          />

          <Mapbox.CircleLayer
            id="violent-core"
            filter={['==', ['get', 'category'], 'violent']}
            style={{
              circleColor: ['get', 'color'],
              circleRadius: 6,
              circleStrokeColor: '#fee2e2',
              circleStrokeWidth: 1
            }}
          />

          <Mapbox.CircleLayer
            id="sexual-layer"
            filter={["==", ["get", "category"], "sexual"]}
            style={{
              circleColor: "#9333ea",
              circleRadius: 6,
              circleStrokeColor: "#f5d0fe",
              circleStrokeWidth: 1.5
            }}
          />

          <Mapbox.CircleLayer
            id="property-layer"
            filter={["==", ["get", "category"], "property"]}
            style={{
              circleColor: "#f97316",
              circleRadius: 5,
              circleStrokeColor: "#ffedd5",
              circleStrokeWidth: 1.2
            }}
          />

          <Mapbox.CircleLayer
            id="women-layer"
            filter={['==', ['get', 'category'], 'women']}
            style={{
              circleColor: '#ec4899',
              circleRadius: 7,
              circleBlur: 0.5,
              circleOpacity: 0.9
            }}
          />

          <Mapbox.CircleLayer
            id="cyber-layer"
            filter={["==", ["get", "category"], "cyber"]}
            style={{
              circleColor: "#2563eb",
              circleRadius: 6,
              circleStrokeColor: "#bfdbfe",
              circleStrokeWidth: 1.4
            }}
          />

          <Mapbox.CircleLayer
            id="highlight-layer"
            filter={['==', ['get', 'highlighted'], true]}
            style={{
              circleColor: 'rgba(255,255,255,0)',
              circleRadius: 13,
              circleStrokeColor: '#93c5fd',
              circleStrokeWidth: 2
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.ShapeSource id="tap-radius-source" shape={radiusOverlay}>
          <Mapbox.FillLayer
            id="tap-radius-fill"
            style={{
              fillColor: '#60a5fa',
              fillOpacity: isDarkMode ? 0.16 : 0.11
            }}
          />
          <Mapbox.LineLayer
            id="tap-radius-line"
            style={{
              lineColor: '#60a5fa',
              lineWidth: 2,
              lineOpacity: 0.9
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>

      <Animated.View
        style={[
          styles.panelAnimated,
          {
            opacity: panelAnim,
            transform: [
              {
                translateY: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] })
              }
            ]
          }
        ]}>
        <RegionSelectorPanel
          states={states}
          districts={districts}
          areas={areas}
          state={selectedState}
          district={selectedDistrict}
          area={selectedArea}
          onStateChange={(nextState) => {
            setSelectedState(nextState);
            const nextDistrict = getDistricts(nextState)[0] || DEFAULT_REGION.district;
            setSelectedDistrict(nextDistrict);
            const nextArea = getAreas(nextState, nextDistrict)[0] || DEFAULT_REGION.area;
            setSelectedArea(nextArea);
          }}
          onDistrictChange={(nextDistrict) => {
            setSelectedDistrict(nextDistrict);
            const nextArea = getAreas(selectedState, nextDistrict)[0] || DEFAULT_REGION.area;
            setSelectedArea(nextArea);
          }}
          onAreaChange={(nextArea) => setSelectedArea(nextArea)}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.rightPanel,
          {
            opacity: panelAnim,
            transform: [
              {
                translateX: panelAnim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] })
              }
            ]
          }
        ]}>
        <Pressable
          style={[styles.glassCard, { backgroundColor: colors.panelBg, borderColor: colors.panelBorder, paddingVertical: 8, alignItems: 'center' }]}
          onPress={() => setIsControlsExpanded(!isControlsExpanded)}
        >
          <Text style={[styles.cardTitle, { color: colors.panelText }]}>Controls {isControlsExpanded ? '▲' : '▼'}</Text>
        </Pressable>

        {isControlsExpanded && (
          <>
            <View style={[styles.glassCard, { backgroundColor: colors.panelBg, borderColor: colors.panelBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.panelMuted }]}>Demo Mode</Text>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardValue, { color: colors.panelText }]}>{simulationMode ? 'Simulation' : 'Live'}</Text>
                <Switch value={simulationMode} onValueChange={toggleSimulation} />
              </View>
              <View style={styles.socketRow}>
                <View style={[styles.socketDot, { backgroundColor: getSocketDotColor(socketStatus) }]} />
                <Text style={[styles.statusValue, { color: colors.panelMuted }]}>Socket: {socketStatus}</Text>
              </View>
            </View>

            <View style={[styles.glassCard, { backgroundColor: colors.panelBg, borderColor: colors.panelBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.panelMuted }]}>Location</Text>
              <Text style={[styles.cardValue, { color: colors.panelText }]}>{coordinate ? 'Ready' : 'Unavailable'}</Text>
              <Pressable style={styles.smallAction} onPress={resolveLocation}>
                <Text style={styles.smallActionText}>Retry GPS</Text>
              </Pressable>
              <Pressable style={styles.smallAction} onPress={useManualLocation}>
                <Text style={styles.smallActionText}>Use Manual Location</Text>
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>

      {simulationMode ? (
        <Animated.View style={[styles.simBadge, { backgroundColor: colors.simBadgeBg, transform: [{ scale: simBadgeAnim }] }]}>
          <Text style={styles.simBadgeText}>SIMULATION MODE</Text>
        </Animated.View>
      ) : null}

      {!simulationMode && socketStatus !== 'connected' ? (
        <View
          style={[
            styles.feedBanner,
            {
              backgroundColor: colors.statusErrorBg,
              borderColor: colors.statusErrorBorder
            }
          ]}>
          <Text style={[styles.feedBannerText, { color: colors.statusErrorText }]}>Live feed unavailable</Text>
          <Text style={[styles.feedBannerSub, { color: colors.statusErrorSub }]}>
            {socketStatus === 'reconnecting' || socketStatus === 'connecting'
              ? 'Reconnecting...'
              : 'Switch to Simulation mode or reconnect server'}
          </Text>
        </View>
      ) : null}

      {manualMode ? (
        <View style={styles.manualHint}>
          <Text style={styles.manualHintText}>Manual location mode: long press map to set your location</Text>
        </View>
      ) : null}

      {locationError ? (
        <View style={styles.locationErrorBox}>
          <Text style={styles.locationErrorText}>{locationError}</Text>
        </View>
      ) : null}

      <Animated.View
        style={{
          transform: [{ scale: popupAnim }],
          opacity: popupAnim
        }}>
        <IncidentTapPopup coordinate={tapCoordinate} incidents={nearbyIncidents} radiusMeters={TAP_RADIUS_METERS} />
      </Animated.View>

      <IncidentDetailsModal
        visible={Boolean(selectedIncident)}
        incident={selectedIncident}
        locationEnabled={locationEnabled}
        onClose={() => setSelectedIncident(null)}
      />

      <LocationAccessModal
        visible={showPermissionModal}
        onOpenSettings={() => {
          setShowPermissionModal(false);
          openSettings();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617'
  },
  userDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#38bdf8',
    borderWidth: 2,
    borderColor: '#f8fafc'
  },
  panelAnimated: {
    position: 'absolute',
    left: 0,
    right: 0
  },
  rightPanel: {
    position: 'absolute',
    right: 12,
    top: 262,
    gap: 10,
    width: 172
  },
  glassCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 7
  },
  cardTitle: {
    textTransform: 'uppercase',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8
  },
  cardValue: {
    fontWeight: '700',
    marginTop: 4,
    fontSize: 13
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  socketRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  socketDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  smallAction: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#33587f',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center'
  },
  smallActionText: {
    color: '#c6ddf5',
    fontSize: 11,
    fontWeight: '700'
  },
  statusValue: {
    fontSize: 11,
    textTransform: 'capitalize'
  },
  simBadge: {
    position: 'absolute',
    top: 236,
    left: 14,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#93c5fd'
  },
  simBadgeText: {
    color: '#eaf4ff',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5
  },
  feedBanner: {
    position: 'absolute',
    top: 198,
    left: 14,
    right: 14,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  feedBannerText: {
    fontWeight: '800'
  },
  feedBannerSub: {
    marginTop: 2,
    fontSize: 12
  },
  manualHint: {
    position: 'absolute',
    bottom: 30,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(30,58,138,0.86)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#60a5fa',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  manualHintText: {
    color: '#dbeafe',
    fontWeight: '700'
  },
  locationErrorBox: {
    position: 'absolute',
    bottom: 88,
    left: 14,
    right: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(120,53,15,0.86)',
    borderWidth: 1,
    borderColor: '#fb923c',
    paddingVertical: 8,
    paddingHorizontal: 11
  },
  locationErrorText: {
    color: '#fed7aa',
    fontWeight: '700'
  }
});




















