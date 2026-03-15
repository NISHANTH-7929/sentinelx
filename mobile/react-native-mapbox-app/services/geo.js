export const toRad = (value) => (value * Math.PI) / 180;

export const distanceMeters = (from, to) => {
  if (!from || !to) {
    return null;
  }

  const [lng1, lat1] = from;
  const [lng2, lat2] = to;

  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const formatDistance = (meters) => {
  if (!Number.isFinite(meters)) {
    return '--';
  }

  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(1)} km`;
};
