import { Platform } from 'react-native';

// For physical devices, replace MANUAL_HOST with your laptop IP:PORT.
const MANUAL_HOST = '10.96.5.216:8088';

export const API_HOST = MANUAL_HOST || (Platform.OS === 'android' ? '10.0.2.2:8088' : 'localhost:8088');
export const API_BASE_URL = `http://${API_HOST}`;
export const WS_BASE_URL = `ws://${API_HOST}`;
export const MAPBOX_ACCESS_TOKEN = 'pk.YOUR_MAPBOX_ACCESS_TOKEN';
export const DEFAULT_USER_ID = 'sentinelx-mobile-user';
