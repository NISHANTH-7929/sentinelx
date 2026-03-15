import { API_BASE_URL } from './config';

const parseJson = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Request failed');
  }
  return data;
};

const REQUEST_TIMEOUT_MS = 6000;

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Network timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const fetchIncidents = async ({ bbox, status, source, excludeSource } = {}) => {
  const params = new URLSearchParams();
  if (bbox) params.append('bbox', bbox.join(','));
  if (status) params.append('status', status);
  if (source) params.append('source', source);
  if (excludeSource) params.append('exclude_source', excludeSource);

  const query = params.toString();
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/incidents${query ? `?${query}` : ''}`);
  return parseJson(response);
};

export const fetchIncidentsWithinRadius = async ({ coordinate, radiusMeters = 500, sourceFilter }) => {
  const [lng, lat] = coordinate;
  const latDelta = radiusMeters / 111320;
  const lngDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

  return fetchIncidents({
    bbox: [lng - lngDelta, lat - latDelta, lng + lngDelta, lat + latDelta],
    ...(sourceFilter === 'simulator' ? { source: 'simulator' } : {}),
    ...(sourceFilter === 'live' ? { excludeSource: 'simulator' } : {})
  });
};

export const startSimulator = async () => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/simulate/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset: 'chennai_crimes.json',
      replay_speed: 5,
      loop: true
    })
  });

  return parseJson(response);
};

export const stopSimulator = async () => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/simulate/stop`, {
    method: 'POST'
  });

  return parseJson(response);
};

export const registerUserDevice = async (payload) => {
  const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return parseJson(response);
};

const uploadOnce = ({ incident, mediaAsset, onProgress }) =>
  new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('source', 'user');
    formData.append('type', incident.type || 'other');
    formData.append('description', `Evidence upload for ${incident.type || 'incident'}`);
    formData.append('latitude', String(incident.latitude));
    formData.append('longitude', String(incident.longitude));
    formData.append('reporter_id', 'citizen-evidence');

    formData.append('media', {
      uri: mediaAsset.uri,
      type: mediaAsset.type || 'image/jpeg',
      name: mediaAsset.fileName || `incident-${Date.now()}.jpg`
    });

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/incidents`);
    xhr.timeout = 30000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(formData);
  });

export const uploadIncidentEvidence = async ({ incident, mediaAsset, onProgress, retries = 2 }) => {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await uploadOnce({ incident, mediaAsset, onProgress });
    } catch (error) {
      attempt += 1;
      if (attempt > retries) {
        throw error;
      }
    }
  }

  throw new Error('Upload failed');
};
