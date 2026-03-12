import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export function OperationsIcon({ size = 22, color = '#0f172a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3.5 10.25L12 3.75L20.5 10.25V20.25H3.5V10.25Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9.5 20.25V14.25H14.5V20.25"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="18.25" cy="5.75" r="2.25" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

export function CrimeMonitorIcon({ size = 22, color = '#0f172a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3.5L19 6.3V11.7C19 16.44 16.05 20.65 12 22C7.95 20.65 5 16.44 5 11.7V6.3L12 3.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="8.3" y="9.2" width="7.4" height="5.6" rx="1.2" stroke={color} strokeWidth={1.5} />
      <Path d="M9.4 13.6L10.9 12.1L12 13.2L14.4 10.8" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SettingsIcon({ size = 22, color = '#0f172a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 8.25C9.93 8.25 8.25 9.93 8.25 12C8.25 14.07 9.93 15.75 12 15.75C14.07 15.75 15.75 14.07 15.75 12C15.75 9.93 14.07 8.25 12 8.25Z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M19.38 9.37L20.96 8.46L19.46 5.86L17.88 6.77C17.37 6.35 16.79 6.02 16.17 5.78V4H13.17V5.78C12.55 6.02 11.97 6.35 11.46 6.77L9.88 5.86L8.38 8.46L9.96 9.37C9.87 9.78 9.82 10.2 9.82 10.63C9.82 11.06 9.87 11.48 9.96 11.89L8.38 12.8L9.88 15.4L11.46 14.49C11.97 14.91 12.55 15.24 13.17 15.48V17.26H16.17V15.48C16.79 15.24 17.37 14.91 17.88 14.49L19.46 15.4L20.96 12.8L19.38 11.89C19.47 11.48 19.52 11.06 19.52 10.63C19.52 10.2 19.47 9.78 19.38 9.37Z"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
