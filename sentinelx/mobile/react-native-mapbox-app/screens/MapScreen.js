import React, { useState, useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Text, PermissionsAndroid, Platform, Animated, FlatList, Dimensions, SafeAreaView } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import Geolocation from '@react-native-community/geolocation';
import { ThemeContext } from '../theme/ThemeContext';

Mapbox.setAccessToken('pk.YOUR_MAPBOX_ACCESS_TOKEN');

const BACKEND_URL = '10.104.72.216:8088';

export default function MapScreen() {
    const { isDarkMode } = useContext(ThemeContext);
    const [location, setLocation] = useState(null);
    const [incidents, setIncidents] = useState([]);
    const [simMode, setSimMode] = useState(false);
    const [showFeed, setShowFeed] = useState(false);
    const [pulsingCoordinate, setPulsingCoordinate] = useState(null);
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const cameraRef = useRef(null);
    const wsRef = useRef(null);

    const requestLocationAndLocate = async () => {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
            } else {
                Geolocation.requestAuthorization();
            }

            Geolocation.getCurrentPosition(
                (position) => {
                    setLocation([position.coords.longitude, position.coords.latitude]);
                    cameraRef.current?.setCamera({ centerCoordinate: [position.coords.longitude, position.coords.latitude], zoomLevel: 13, animationDuration: 1000 });
                },
                () => { },
                { enableHighAccuracy: false, timeout: 30000, maximumAge: 10000 }
            );
        } catch (error) { }
    };

    useEffect(() => {
        requestLocationAndLocate();
    }, []);

    useEffect(() => {
        const fetchAPI = async () => {
            try {
                const res = await fetch(`http://${BACKEND_URL}/api/incidents?status=verified`);
                const data = await res.json();
                if (Array.isArray(data)) setIncidents(data);
            } catch (err) {
                console.error('Fetch error:', err);
            }
        };
        fetchAPI();

        const connectWS = () => {
            wsRef.current = new WebSocket(`ws://${BACKEND_URL}/ws/incidents`);
            wsRef.current.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                if (msg.op === 'incident') {
                    setIncidents(prev => [msg.data, ...prev]);

                    if (msg.data.status === 'verified') {
                        setPulsingCoordinate([msg.data.longitude, msg.data.latitude]);
                        pulseAnim.setValue(0);
                        Animated.loop(
                            Animated.sequence([
                                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                                Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
                            ]),
                            { iterations: 6 }
                        ).start(() => setPulsingCoordinate(null));
                    }
                }
            };
        };
        connectWS();

        return () => wsRef.current?.close();
    }, []);

    const features = incidents.filter(i => simMode ? i.source === 'simulator' : true).map(inc => ({
        type: 'Feature',
        id: inc.id,
        geometry: { type: 'Point', coordinates: [inc.longitude, inc.latitude] },
        properties: {
            severity: inc.severity || 1,
            type: inc.type,
            status: inc.status
        }
    }));

    const geoJSON = { type: 'FeatureCollection', features };

    const handleReport = async () => {
        if (!location) return Alert.alert('Wait', 'Location not yet acquired. Try again.');
        try {
            await fetch(`http://${BACKEND_URL}/api/incidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source: simMode ? 'simulator' : 'user',
                    type: 'fire',
                    description: 'Emergency: User reported incident from Map UI',
                    longitude: location[0],
                    latitude: location[1],
                    confidence: 0.95
                })
            });
            Alert.alert('Report Sent! 🚀', 'Your alert is in the moderation queue. Check your admin dashboard to approve it.');
        } catch (err) {
            Alert.alert('Network Error', `Could not reach ${BACKEND_URL}. Ensure your laptop firewall is disabled.`);
        }
    };

    return (
        <View style={styles.container}>
            <Mapbox.MapView style={StyleSheet.absoluteFillObject} styleURL={isDarkMode ? Mapbox.StyleURL.TrafficNight : Mapbox.StyleURL.Street} logoEnabled={false} attributionEnabled={false}>
                <Mapbox.Camera ref={cameraRef} defaultSettings={{ centerCoordinate: [80.2707, 13.0827], zoomLevel: 11 }} />
                {location && <Mapbox.PointAnnotation id="user-location" coordinate={location}><View style={styles.userDot} /></Mapbox.PointAnnotation>}

                <Mapbox.ShapeSource id="incidents" shape={geoJSON} cluster={true} clusterRadius={40} clusterMaxZoom={14}>
                    <Mapbox.HeatmapLayer
                        id="heatmap"
                        sourceID="incidents"
                        style={{
                            heatmapWeight: ['interpolate', ['linear'], ['get', 'severity'], 1, 0.2, 3, 1],
                            heatmapIntensity: ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
                            heatmapColor: ['interpolate', ['linear'], ['heatmap-density'], 0, 'rgba(0,0,255,0)', 0.5, 'yellow', 1.0, 'red'],
                            heatmapRadius: ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 30]
                        }}
                    />
                    <Mapbox.CircleLayer
                        id="unclustered-points"
                        style={{
                            circleColor: ['match', ['get', 'severity'], 3, '#ff3b30', 2, '#ff9500', 1, '#ffd60a', '#9ca3af'],
                            circleRadius: 8,
                            circleStrokeWidth: 1,
                            circleStrokeColor: '#ffffff'
                        }}
                    />
                </Mapbox.ShapeSource>

                {pulsingCoordinate && (
                    <Mapbox.MarkerView id="pulse" coordinate={pulsingCoordinate}>
                        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }], opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]} />
                    </Mapbox.MarkerView>
                )}
            </Mapbox.MapView>

            <SafeAreaView style={styles.safeLayer} pointerEvents="box-none">
                {/* Premium Floating Status Bar */}
                <View style={[styles.topBar, isDarkMode && styles.darkTopBar]}>
                    <View style={styles.statusDot} />
                    <Text style={[styles.topBarText, isDarkMode && styles.darkText]}>SentinelX Network Online</Text>
                </View>

                {/* Right Floating Actions */}
                <View style={styles.rightActions} pointerEvents="box-none">
                    <TouchableOpacity activeOpacity={0.8} style={styles.glassBtn} onPress={() => setSimMode(!simMode)}>
                        <Text style={styles.glassText}>{simMode ? '🌐 Live' : '📡 Base'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8} style={styles.glassBtn} onPress={() => setShowFeed(!showFeed)}>
                        <Text style={styles.glassText}>{showFeed ? '▼ Hide' : '▲ Feed'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Report Action Button */}
                <View style={styles.bottomActionArea} pointerEvents="box-none">
                    <TouchableOpacity activeOpacity={0.9} style={styles.reportBtn} onPress={handleReport}>
                        <Text style={styles.reportText}>REPORT INCIDENT</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Bottom Sheet Feed */}
            {showFeed && (
                <View style={[styles.feedOverlay, isDarkMode && styles.darkFeedOverlay]}>
                    <View style={styles.dragHandle} />
                    <Text style={[styles.feedTitle, isDarkMode && { color: '#fff' }]}>Live Intelligence Feed</Text>
                    {incidents.length === 0 && <Text style={{ color: '#888', marginTop: 20, textAlign: 'center' }}>Awaiting incident reports...</Text>}
                    <FlatList
                        data={incidents.slice(0, 20)}
                        keyExtractor={item => item.id}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={[styles.feedCard, isDarkMode && styles.darkCard]}>
                                <View style={styles.cardHeader}>
                                    <View style={[styles.severityDot, item.severity === 3 ? { backgroundColor: '#ff3b30' } : item.severity === 2 ? { backgroundColor: '#ff9500' } : { backgroundColor: '#ffd60a' }]} />
                                    <Text style={[styles.cardType, isDarkMode && { color: '#fff' }]}>{item.type.toUpperCase()}</Text>
                                    <Text style={styles.cardTime}>{new Date(item.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                </View>
                                <Text style={[styles.cardDesc, isDarkMode && { color: '#bbb' }]}>{item.description}</Text>
                            </View>
                        )}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    safeLayer: { flex: 1, zIndex: 10 },
    userDot: { width: 18, height: 18, backgroundColor: '#007AFF', borderRadius: 9, borderWidth: 3, borderColor: '#FFF', elevation: 8 },
    pulseRing: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,59,48,0.6)', top: -20, left: -20, borderWidth: 2, borderColor: '#ff3b30' },

    topBar: { alignSelf: 'center', marginTop: 15, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, flexDirection: 'row', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    darkTopBar: { backgroundColor: 'rgba(30,30,30,0.9)' },
    statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34C759', marginRight: 8 },
    topBarText: { fontWeight: '700', fontSize: 13, color: '#1A1A1A', letterSpacing: 0.5 },
    darkText: { color: '#E5E5E5' },

    rightActions: { position: 'absolute', right: 20, top: 100, gap: 15 },
    glassBtn: { backgroundColor: 'rgba(255,255,255,0.95)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5 },
    glassText: { fontWeight: '800', color: '#1A1A1A', fontSize: 13, textAlign: 'center' },

    bottomActionArea: { position: 'absolute', bottom: 100, width: '100%', alignItems: 'center' },
    reportBtn: { backgroundColor: '#FF3B30', paddingVertical: 16, paddingHorizontal: 40, borderRadius: 30, elevation: 12, shadowColor: '#FF3B30', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 8 },
    reportText: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 1.5 },

    feedOverlay: { position: 'absolute', bottom: 0, width: '100%', height: '55%', backgroundColor: '#F8F9FA', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 80, zIndex: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 20 },
    darkFeedOverlay: { backgroundColor: '#1C1C1E' },
    dragHandle: { width: 40, height: 5, backgroundColor: '#D1D1D6', borderRadius: 3, alignSelf: 'center', marginBottom: 15 },
    feedTitle: { fontSize: 22, fontWeight: '900', marginBottom: 15, color: '#1A1A1A', letterSpacing: -0.5 },

    feedCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    darkCard: { backgroundColor: '#2C2C2E' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    severityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    cardType: { flex: 1, fontWeight: '800', fontSize: 15, color: '#1A1A1A', letterSpacing: 0.5 },
    cardTime: { fontSize: 12, color: '#8E8E93', fontWeight: '600' },
    cardDesc: { fontSize: 14, color: '#3A3A3C', lineHeight: 20 }
});
