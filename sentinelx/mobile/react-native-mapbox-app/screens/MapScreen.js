import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import { useRoute, useFocusEffect } from '@react-navigation/native';
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

// Pulsing dot annotation rendered over new incidents on the map
function PulsingRing({ color = '#ef4444' }) {
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.8, duration: 700, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.5, duration: 700, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.15, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,    duration: 700, useNativeDriver: true })
        ])
      ])
    ).start();
    return () => { scale.stopAnimation(); opacity.stopAnimation(); };
  }, [opacity, scale]);
  return (
    <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{
        width: 22, height: 22, borderRadius: 11,
        borderWidth: 2.5, borderColor: color,
        backgroundColor: `${color}33`,
        transform: [{ scale }],
        opacity
      }} />
    </View>
  );
}

import IncidentDetailsModal from '../components/IncidentDetailsModal';
import IncidentTapPopup from '../components/IncidentTapPopup';
import LocationAccessModal from '../components/LocationAccessModal';
import RegionSelectorPanel from '../components/RegionSelectorPanel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../theme/ThemeContext';
import { useUserLocation } from '../hooks/useUserLocation';
import AnimatedPin from '../components/AnimatedPin';
import { useAIIncidentStore } from '../services/aiIncidentStore';
import { enrichIncident, getSeverityWeight } from '../services/incidentClassifier';
import {
  fetchIncidents,
  fetchIncidentsWithinRadius,
  startSimulator,
  stopSimulator
} from '../services/incidentsApi';
import { IncidentSocketClient } from '../services/incidentsSocket';
import LiveIncidentFeedPanel from '../components/LiveIncidentFeedPanel';
import { MAPBOX_ACCESS_TOKEN, API_BASE_URL } from '../services/config';
import {
  DEFAULT_REGION,
  getAreaConfig,
  getAreas,
  getDistricts,
  findAreaByCoordinate,
  REGION_TREE
} from '../services/regions';
import { distanceMeters } from '../services/geo';

// NOTE: Mapbox.setAccessToken is called once globally in App.js at module scope.
// Do NOT call it here — re-initializing Mapbox inside a component causes the
// "map stuck on tab switch" bug by resetting the native GL context.

const GRID_SIZE_METERS = 500;
const TAP_RADIUS_METERS = 500;
const MAX_ZONE_FEATURES = 800;

const PALETTE = {
  dark: {
    zoneOutline: '#2f455f',
    zoneSafe: '#16a34a',
    zoneModerate: '#eab308',
    zoneRisk: '#f97316',
    zoneDanger: '#dc2626',
    panelBg: 'rgba(8,24,41,0.88)',
    panelBorder: 'rgba(100,160,220,0.25)',
    panelText: '#eaf4ff',
    panelMuted: '#91b5d8',
    statusErrorBg: 'rgba(127,29,29,0.92)',
    statusErrorBorder: '#ef4444',
    statusErrorText: '#fee2e2',
    statusErrorSub: '#fca5a5',
    simBadgeBg: '#1e3a8a'
  },
  light: {
    zoneOutline: '#7f97b2',
    zoneSafe: '#16a34a',
    zoneModerate: '#ca8a04',
    zoneRisk: '#ea580c',
    zoneDanger: '#dc2626',
    panelBg: 'rgba(242,247,252,0.88)',
    panelBorder: 'rgba(64,111,161,0.3)',
    panelText: '#12365d',
    panelMuted: '#365f8a',
    statusErrorBg: 'rgba(185,28,28,0.92)',
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
      if (tileCount >= MAX_ZONE_FEATURES) break;

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
        properties: { score, label, color }
      });

      tileCount += 1;
    }

    if (tileCount >= MAX_ZONE_FEATURES) break;
  }

  return { type: 'FeatureCollection', features: zones };
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

const EMPTY_GEOJSON = { type: 'FeatureCollection', features: [] };

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute();

  const { isDarkMode } = useContext(ThemeContext);

  const colors = useMemo(
    () => (isDarkMode ? PALETTE.dark : PALETTE.light),
    [isDarkMode]
  );

  const cameraRef = useRef(null);
  const socketRef = useRef(null);
  const mountedRef = useRef(true);
  const zoneTaskRef = useRef(null);

  const [selectedState, setSelectedState] = useState(DEFAULT_REGION.state);
  const [selectedDistrict, setSelectedDistrict] = useState(DEFAULT_REGION.district);
  const [selectedArea, setSelectedArea] = useState(DEFAULT_REGION.area);

  const [incidents, setIncidents] = useState([]);
  const [allStreamIncidents, setAllStreamIncidents] = useState([]); // All WS events, no bbox
  const [recentIds, setRecentIds] = useState(new Set()); // IDs of newly arrived incidents (for blinking)
  const [simulationMode, setSimulationMode] = useState(true);
  const [socketStatus, setSocketStatus] = useState('connecting');

  const [tapCoordinate, setTapCoordinate] = useState(null);
  const [nearbyIncidents, setNearbyIncidents] = useState([]);
  const [radiusOverlay, setRadiusOverlay] = useState(EMPTY_GEOJSON);
  const [highlightedIncidentIds, setHighlightedIncidentIds] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [zonesSource, setZonesSource] = useState(EMPTY_GEOJSON);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);
  const [showSafetyScore, setShowSafetyScore] = useState(true);
  
  // Flag to know if area change was from a tap
  const isTapNavigation = useRef(false);

  const panelAnim = useRef(new Animated.Value(0)).current;
  const popupAnim = useRef(new Animated.Value(0)).current;

  // Handle focus-incident deep link from proximity alert banner tap
  useFocusEffect(
    useCallback(() => {
      const focusIncident = route.params?.focusIncident;
      if (!focusIncident) return;

      // Fly camera to the incident location
      cameraRef.current?.setCamera({
        centerCoordinate: [focusIncident.longitude, focusIncident.latitude],
        zoomLevel: 15,
        animationDuration: 900
      });

      // Open the incident details modal
      setSelectedIncident(focusIncident);
    }, [route.params?.focusIncident])
  );

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

  // Panel entrance animation
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();

    return () => {
      panelAnim.stopAnimation();
    };
  }, [panelAnim]);

  // Popup animation (opacity only — no scale to avoid layout jump)
  useEffect(() => {
    Animated.timing(popupAnim, {
      toValue: nearbyIncidents.length > 0 || tapCoordinate ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start();
  }, [nearbyIncidents.length, popupAnim, tapCoordinate]);

  // Debounced zone grid computation — longer debounce prevents freezing on rapid events
  useEffect(() => {
    if (zoneTaskRef.current) {
      clearTimeout(zoneTaskRef.current);
    }

    zoneTaskRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setZonesSource(buildZoneGrid(areaConfig.bbox, incidents, colors));
      }
    }, 600);

    return () => {
      if (zoneTaskRef.current) {
        clearTimeout(zoneTaskRef.current);
      }
    };
  }, [areaConfig.bbox, colors, incidents]);

  const loadIncidentsForArea = useCallback(async () => {
    const sourceOpts = simulationMode
      ? { source: 'simulator' }
      : { excludeSource: 'simulator' };

    try {
      const records = await fetchIncidents({
        bbox: areaConfig.bbox,
        ...sourceOpts
      });

      if (!mountedRef.current) return;

      // If API returns zero results (server up but bbox has no data), use offline fallback
      // so the selected area always shows incidents for a useful UI experience
      if (records.length === 0) {
        const fallback = buildOfflineIncidents(areaConfig.center).map(enrichIncident);
        setIncidents(fallback);
      } else {
        setIncidents(records.map(enrichIncident));
      }
    } catch (_error) {
      if (!mountedRef.current) return;
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
        if (!mountedRef.current) return;
        const enriched = enrichIncident(incoming);

        // ── All-stream feed (no bbox) — feeds the Live Feed Panel ──────────
        setAllStreamIncidents((prev) => {
          const deduped = [enriched, ...prev.filter((i) => i.id !== enriched.id)];
          return deduped.slice(0, 60);
        });

        // ── Track recent IDs for pulsing PointAnnotations (12 s window) ────
        setRecentIds((prev) => new Set([...prev, enriched.id]));
        setTimeout(() => {
          setRecentIds((prev) => {
            const next = new Set(prev);
            next.delete(enriched.id);
            return next;
          });
        }, 12000);

        // ── Map display — only show incident if it's inside current area ───
        if (!inBbox(enriched, areaConfig.bbox)) return;
        setIncidents((previous) => {
          const deduped = [enriched, ...previous.filter((item) => item.id !== enriched.id)];
          return deduped.slice(0, 200);
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
    
    if (isTapNavigation.current) {
      isTapNavigation.current = false;
    } else {
      cameraRef.current?.setCamera({
        centerCoordinate: areaConfig.center,
        zoomLevel: 12,
        animationDuration: 950
      });
    }
  }, [areaConfig, loadIncidentsForArea]);

  // Auto-focus on live location when coordinate is first resolved
  const hasAutoCentered = useRef(false);
  useEffect(() => {
    if (coordinate && !hasAutoCentered.current && mountedRef.current) {
      hasAutoCentered.current = true;
      
      const foundRegion = findAreaByCoordinate(coordinate[0], coordinate[1]);
      if (foundRegion) {
        isTapNavigation.current = true; // Prevent areaConfig effect from fighting the camera
        setSelectedState(foundRegion.state);
        setSelectedDistrict(foundRegion.district);
        setSelectedArea(foundRegion.area);
      }

      cameraRef.current?.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: 14,
        animationDuration: 1200
      });
      
      // Auto-trigger nearby lookup on load
      setTimeout(() => {
        if (mountedRef.current) {
          onMapTap({ geometry: { coordinates: coordinate } });
        }
      }, 1500);
    }
  }, [coordinate, onMapTap]);

  const allAiIncidents = useAIIncidentStore();
  const aiVerifiedIncidents = useMemo(
    () => allAiIncidents.filter((i) => i.status === 'VERIFIED'),
    [allAiIncidents]
  );

  const incidentSource = useMemo(() => {
    const highlightedSet = new Set(highlightedIncidentIds);
    const base = incidents.map((incident) => ({
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
        weight: getSeverityWeight(incident.severityLevel),
        aiVerified: false
      }
    }));

    const aiFeatures = aiVerifiedIncidents.map((incident) => ({
      type: 'Feature',
      id: incident.id,
      geometry: {
        type: 'Point',
        coordinates: [incident.location.lng, incident.location.lat]
      },
      properties: {
        incidentId: incident.id,
        category: incident.type,
        color: '#16a34a',
        highlighted: highlightedSet.has(incident.id),
        weight: 0.8,
        aiVerified: true,
        aiConfidence: incident.aiResult?.confidence || 0,
        aiExplanation: incident.aiResult?.explanation || ''
      }
    }));

    return {
      type: 'FeatureCollection',
      features: [...base, ...aiFeatures]
    };
  }, [highlightedIncidentIds, incidents, aiVerifiedIncidents]);

  const dismissTap = useCallback(() => {
    setTapCoordinate(null);
    setNearbyIncidents([]);
    setRadiusOverlay(EMPTY_GEOJSON);
    setHighlightedIncidentIds([]);
  }, []);

  const onMapTap = useCallback(
    async (event) => {
      if (event?.features?.length) return;

      const coords = event?.geometry?.coordinates;
      if (!coords) return;

      // If tapping again, dismiss the popup
      if (tapCoordinate) {
        dismissTap();
        return;
      }

      setTapCoordinate(coords);
      setRadiusOverlay(createCirclePolygon(coords, TAP_RADIUS_METERS));

      // Auto-update the region selector UI
      const foundRegion = findAreaByCoordinate(coords[0], coords[1]);
      if (foundRegion) {
        // Avoid fighting between tap flyTo and useEffect areaConfig flyTo
        isTapNavigation.current = true;
        setSelectedState(foundRegion.state);
        setSelectedDistrict(foundRegion.district);
        setSelectedArea(foundRegion.area);
      }

      // Auto-center camera on the tapped location
      cameraRef.current?.setCamera({
        centerCoordinate: coords,
        animationDuration: 600,
        zoomLevel: 13.5
      });

      try {
        const nearby = await fetchIncidentsWithinRadius({
          coordinate: coords,
          radiusMeters: TAP_RADIUS_METERS,
          sourceFilter: simulationMode ? 'simulator' : 'live'
        });

        if (!mountedRef.current) return;

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
    [dismissTap, simulationMode, tapCoordinate]
  );

  const onMapLongPress = useCallback(
    (event) => {
      const coords = event?.geometry?.coordinates;
      if (!coords) return;
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
      if (!feature) return;
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
        styleURL={Mapbox.StyleURL.Standard}
        onPress={onMapTap}
        onLongPress={onMapLongPress}
        surfaceView={false} // CRITICAL FIX: Forces Android TextureView so map survives tab switches
        compassEnabled={false}
        scaleBarEnabled={false}
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
            <View style={styles.userDotOuter}>
              <View style={styles.userDotInner} />
            </View>
          </Mapbox.PointAnnotation>
        ) : null}

        {/* Zones (Safety Score Grid) */}
        {showSafetyScore && (
          <Mapbox.ShapeSource id="zones-source" shape={zonesSource}>
            <Mapbox.FillLayer
              id="zones-fill"
              style={{
                fillColor: ['get', 'color'],
                fillOpacity: isDarkMode ? 0.2 : 0.15
              }}
            />
            <Mapbox.LineLayer
              id="zones-outline"
              style={{
                lineColor: colors.zoneOutline,
                lineWidth: 0.7,
                lineOpacity: 0.4
              }}
            />
          </Mapbox.ShapeSource>
        )}

        <Mapbox.ShapeSource
          id="incidents-source"
          shape={incidentSource}
          onPress={onIncidentPress}
          cluster
          clusterRadius={40}
          clusterMaxZoomLevel={14}>

          {showSafetyScore && (
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
                heatmapRadius: ['interpolate', ['linear'], ['zoom'], 8, 8, 14, 30],
                heatmapOpacity: isDarkMode ? 0.8 : 0.65
              }}
            />
          )}

          <Mapbox.CircleLayer
            id="violent-core"
            filter={['==', ['get', 'category'], 'violent']}
            style={{
              circleColor: ['get', 'color'],
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 7],
              circleStrokeColor: '#fee2e2',
              circleStrokeWidth: 1
            }}
          />

          <Mapbox.CircleLayer
            id="sexual-layer"
            filter={['==', ['get', 'category'], 'sexual']}
            style={{
              circleColor: '#9333ea',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 6],
              circleStrokeColor: '#f5d0fe',
              circleStrokeWidth: 1
            }}
          />

          <Mapbox.CircleLayer
            id="property-layer"
            filter={['==', ['get', 'category'], 'property']}
            style={{
              circleColor: '#f97316',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 5],
              circleStrokeColor: '#ffedd5',
              circleStrokeWidth: 1
            }}
          />

          <Mapbox.CircleLayer
            id="women-layer"
            filter={['==', ['get', 'category'], 'women']}
            style={{
              circleColor: '#ec4899',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 6],
              circleStrokeColor: '#fce7f3',
              circleStrokeWidth: 1
            }}
          />

          <Mapbox.CircleLayer
            id="cyber-layer"
            filter={['==', ['get', 'category'], 'cyber']}
            style={{
              circleColor: '#2563eb',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 3, 14, 6],
              circleStrokeColor: '#bfdbfe',
              circleStrokeWidth: 1
            }}
          />

          <Mapbox.CircleLayer
            id="highlight-layer"
            filter={['==', ['get', 'highlighted'], true]}
            style={{
              circleColor: 'rgba(255,255,255,0)',
              circleRadius: 14,
              circleStrokeColor: '#93c5fd',
              circleStrokeWidth: 2.5
            }}
          />

          {/* AI Verified incidents — green ring, larger marker */}
          <Mapbox.CircleLayer
            id="ai-verified-layer"
            existing={false}
            filter={['==', ['get', 'aiVerified'], true]}
            style={{
              circleColor: '#16a34a',
              circleRadius: ['interpolate', ['linear'], ['zoom'], 9, 5, 14, 10],
              circleStrokeColor: '#ffffff',
              circleStrokeWidth: 2.5,
              circleOpacity: 0.95
            }}
          />
        </Mapbox.ShapeSource>

        <Mapbox.ShapeSource id="tap-radius-source" shape={radiusOverlay}>
          <Mapbox.FillLayer
            id="tap-radius-fill"
            style={{
              fillColor: '#60a5fa',
              fillOpacity: isDarkMode ? 0.14 : 0.1
            }}
          />
          <Mapbox.LineLayer
            id="tap-radius-line"
            style={{
              lineColor: '#60a5fa',
              lineWidth: 2,
              lineOpacity: 0.85,
              lineDasharray: [3, 2]
            }}
          />
        </Mapbox.ShapeSource>

        {tapCoordinate ? (
          <Mapbox.PointAnnotation id="tap-pin" coordinate={tapCoordinate}>
            <AnimatedPin color="#3b82f6" />
          </Mapbox.PointAnnotation>
        ) : null}

        {/* Pulsing rings for newly arrived incidents (visible for 12 s) */}
        {allStreamIncidents
          .filter((inc) => recentIds.has(inc.id) && inc.longitude && inc.latitude)
          .slice(0, 8)
          .map((inc) => {
            const ringColor =
              (inc.severityLevel ?? inc.severity) >= 3 ? '#ef4444' :
              (inc.severityLevel ?? inc.severity) >= 2 ? '#f97316' :
              '#eab308';
            return (
              <Mapbox.PointAnnotation
                key={`pulse-${inc.id}`}
                id={`pulse-${inc.id}`}
                coordinate={[inc.longitude, inc.latitude]}>
                <PulsingRing color={ringColor} />
              </Mapbox.PointAnnotation>
            );
          })
        }
      </Mapbox.MapView>

      {/* Region selector at the top */}
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
            dismissTap();
          }}
          onDistrictChange={(nextDistrict) => {
            setSelectedDistrict(nextDistrict);
            const nextArea = getAreas(selectedState, nextDistrict)[0] || DEFAULT_REGION.area;
            setSelectedArea(nextArea);
            dismissTap();
          }}
          onAreaChange={(nextArea) => {
            setSelectedArea(nextArea);
            dismissTap();
          }}
          containerStyle={{ marginTop: insets.top + 8 }}
        />
      </Animated.View>

      {/* Controls panel – right side */}
      <View style={styles.rightPanel}>
        <Pressable
          style={[styles.glassCard, { backgroundColor: colors.panelBg, borderColor: colors.panelBorder }]}
          onPress={() => setIsControlsExpanded(!isControlsExpanded)}>
          <Text style={[styles.cardTitle, { color: colors.panelText }]}>
            {isControlsExpanded ? '▲ Controls' : '▼ Controls'}
          </Text>
        </Pressable>

        {isControlsExpanded ? (
          <>
            <View style={[styles.glassCard, { backgroundColor: colors.panelBg, borderColor: colors.panelBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.panelMuted }]}>Mode</Text>
              <View style={styles.rowBetween}>
                <Text style={[styles.cardValue, { color: colors.panelText }]}>{simulationMode ? 'Simulation' : 'Live'}</Text>
                <Switch value={simulationMode} onValueChange={toggleSimulation} />
              </View>
              <View style={[styles.rowBetween, { marginTop: 10 }]}>
                <Text style={[styles.cardValue, { color: colors.panelText }]}>Safety Score Overlay</Text>
                <Switch value={showSafetyScore} onValueChange={setShowSafetyScore} />
              </View>
              <View style={styles.socketRow}>
                <View style={[styles.socketDot, { backgroundColor: getSocketDotColor(socketStatus) }]} />
                <Text style={[styles.statusValue, { color: colors.panelMuted }]}>Socket: {socketStatus}</Text>
              </View>
              {/* Test nearby alerts button for demos */}
              {coordinate && (
                <Pressable
                  style={[styles.smallAction, { marginTop: 10, backgroundColor: 'rgba(239,68,68,0.18)', borderColor: '#ef4444' }]}
                  onPress={async () => {
                    const [lng, lat] = coordinate;
                    const testTypes = [
                      { type: 'fire',     description: 'Large building fire nearby',      severity: 3, confidence: 0.97, lat: lat + 0.001, lng: lng + 0.001 },
                      { type: 'robbery',  description: 'Armed robbery in progress',       severity: 3, confidence: 0.95, lat: lat - 0.001, lng: lng + 0.002 },
                      { type: 'assault',  description: 'Physical altercation reported',   severity: 2, confidence: 0.90, lat: lat + 0.0008, lng: lng - 0.001 },
                      { type: 'accident', description: 'Vehicle collision on road nearby', severity: 2, confidence: 0.88, lat: lat - 0.0005, lng: lng - 0.002 },
                      { type: 'theft',    description: 'Bag snatching near you',          severity: 1, confidence: 0.85, lat: lat + 0.0015, lng: lng + 0.0005 }
                    ];
                    for (const t of testTypes) {
                      try {
                        const res = await fetch(`${API_BASE_URL}/api/incidents`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: t.type,
                            description: t.description,
                            latitude: t.lat,
                            longitude: t.lng,
                            confidence: t.confidence,
                            source: simulationMode ? 'simulator' : 'user'
                          })
                        });
                        if (!res.ok) {
                          const errText = await res.text();
                          console.warn('Inject Failed:', res.status, errText);
                        }
                        await new Promise(r => setTimeout(r, 400));
                      } catch (err) {
                        console.warn('Inject request failed:', err.message);
                      }
                    }
                  }}>
                  <Text style={[styles.smallActionText, { color: '#ef4444' }]}>🚨 Inject Nearby Alerts</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.glassCard, { backgroundColor: colors.panelBg, borderColor: colors.panelBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.panelMuted }]}>Location</Text>
              <Text style={[styles.cardValue, { color: colors.panelText }]}>{coordinate ? 'Ready' : 'Unavailable'}</Text>
              <Pressable style={styles.smallAction} onPress={resolveLocation}>
                <Text style={styles.smallActionText}>Retry GPS</Text>
              </Pressable>
              <Pressable style={styles.smallAction} onPress={useManualLocation}>
                <Text style={styles.smallActionText}>Use Manual</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>

      {/* Simulation mode badge */}
      {simulationMode ? (
        <View style={[styles.simBadge, { backgroundColor: colors.simBadgeBg, top: insets.top + 60 }]}>
          <Text style={styles.simBadgeText}>SIMULATION</Text>
        </View>
      ) : null}

      {/* Live feed unavailable banner */}
      {!simulationMode && socketStatus !== 'connected' ? (
        <View
          style={[
            styles.feedBanner,
            { backgroundColor: colors.statusErrorBg, borderColor: colors.statusErrorBorder }
          ]}>
          <Text style={[styles.feedBannerText, { color: colors.statusErrorText }]}>Live feed unavailable</Text>
          <Text style={[styles.feedBannerSub, { color: colors.statusErrorSub }]}>
            {socketStatus === 'reconnecting' || socketStatus === 'connecting'
              ? 'Reconnecting...'
              : 'Switch to Simulation mode or reconnect server'}
          </Text>
        </View>
      ) : null}

      {/* Manual location hint */}
      {manualMode ? (
        <View style={styles.manualHint}>
          <Text style={styles.manualHintText}>Manual mode active — long press map to set location</Text>
        </View>
      ) : null}

      {/* Location error */}
      {locationError && !manualMode ? (
        <View style={styles.locationErrorBox}>
          <Text style={styles.locationErrorText}>{locationError}</Text>
          <View style={styles.errorActions}>
            <Pressable style={styles.errorActionBtn} onPress={resolveLocation}>
              <Text style={styles.errorActionText}>Retry GPS</Text>
            </Pressable>
            <Pressable style={styles.errorActionBtn} onPress={useManualLocation}>
              <Text style={styles.errorActionText}>Use Manual</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Animated.View style={{ opacity: popupAnim }} pointerEvents={tapCoordinate ? 'auto' : 'none'}>
        <IncidentTapPopup
          coordinate={tapCoordinate}
          incidents={nearbyIncidents}
          radiusMeters={TAP_RADIUS_METERS}
          onDismiss={dismissTap}
        />
      </Animated.View>

      <LiveIncidentFeedPanel
        incidents={allStreamIncidents}
        isDarkMode={isDarkMode}
        insets={insets}
        onSelectIncident={(incident) => {
          if (incident.longitude && incident.latitude) {
            cameraRef.current?.setCamera({
              centerCoordinate: [incident.longitude, incident.latitude],
              zoomLevel: 14.5,
              animationDuration: 850
            });
            setTimeout(() => setSelectedIncident(incident), 300);
          } else {
            setSelectedIncident(incident);
          }
        }}
      />

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
  userDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(56,189,248,0.25)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  userDotInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
    top: 52,
    gap: 8,
    width: 160,
    zIndex: 5
  },
  glassCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5
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
    alignItems: 'center',
    marginBottom: 8
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
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#2d4f73',
    borderRadius: 8,
    paddingVertical: 5,
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
    top: 52,
    left: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#3b82f6'
  },
  simBadgeText: {
    color: '#e0ecff',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.6
  },
  feedBanner: {
    position: 'absolute',
    top: 52,
    left: 12,
    right: 186,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  feedBannerText: {
    fontWeight: '800',
    fontSize: 12
  },
  feedBannerSub: {
    marginTop: 2,
    fontSize: 11
  },
  manualHint: {
    position: 'absolute',
    bottom: 88,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(30,58,138,0.88)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#60a5fa',
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  manualHintText: {
    color: '#dbeafe',
    fontWeight: '700',
    fontSize: 12
  },
  locationErrorBox: {
    position: 'absolute',
    bottom: 88,
    left: 14,
    right: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(120,53,15,0.9)',
    borderWidth: 1,
    borderColor: '#fb923c',
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  locationErrorText: {
    color: '#fed7aa',
    fontWeight: '700',
    fontSize: 12
  },
  errorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6
  },
  errorActionBtn: {
    borderWidth: 1,
    borderColor: '#fb923c',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  errorActionText: {
    color: '#fed7aa',
    fontSize: 11,
    fontWeight: '700'
  }
});
