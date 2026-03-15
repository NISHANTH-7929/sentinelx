import React from 'react';
import Svg, { Circle, Path, Polygon, Rect, Line } from 'react-native-svg';

// Live Map tab — map with location pin
export function OperationsIcon({ size = 22, color = '#0f172a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Map folded sheet */}
      <Path
        d="M1 6L8 3L16 6L23 3V18L16 21L8 18L1 21V6Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 3V18"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M16 6V21"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      {/* Pin on map */}
      <Circle cx="19.5" cy="4.5" r="0" />
    </Svg>
  );
}

// Crime Intel tab — shield with magnifying glass/alert indicator
export function CrimeMonitorIcon({ size = 22, color = '#0f172a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Shield */}
      <Path
        d="M12 3L20 6.5V12C20 16.5 16.5 20.5 12 22C7.5 20.5 4 16.5 4 12V6.5L12 3Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Alert exclamation */}
      <Path
        d="M12 9V13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="12" cy="16" r="0.8" fill={color} />
    </Svg>
  );
}

// Settings tab — gear
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

// File Report tab — megaphone/alert report icon
export function ReportIcon({ size = 22, color = '#0f172a' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Megaphone body */}
      <Path
        d="M18 8C18 8 20 9.5 20 12C20 14.5 18 16 18 16"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Speaker horn */}
      <Path
        d="M4 9H7L14 5V19L7 15H4C3.45 15 3 14.55 3 14V10C3 9.45 3.45 9 4 9Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Base line from speaker */}
      <Path
        d="M7 15V19C7 19.55 7.45 20 8 20H9C9.55 20 10 19.55 10 19V15"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
