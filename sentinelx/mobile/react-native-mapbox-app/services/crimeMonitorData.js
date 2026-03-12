import { getAreaConfig } from './regions';

export const CRIME_CATEGORIES = [
  { key: 'all', label: 'All Crimes' },
  { key: 'violent', label: 'Violent Crimes' },
  { key: 'sexual', label: 'Sexual Crimes' },
  { key: 'property', label: 'Property Crimes' },
  { key: 'women', label: 'Women Safety Crimes' },
  { key: 'cyber', label: 'Cyber Crimes' }
];

export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const WEEK_OPTIONS = [1, 2, 3, 4];

export const SEVERITY_COLORS = {
  Low: '#16a34a',
  Medium: '#eab308',
  High: '#f97316',
  Critical: '#dc2626'
};

const SEVERITY_WEIGHTS = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4
};

export const SCORE_BANDS = [
  { min: 80, label: 'Very Safe', color: '#16a34a' },
  { min: 60, label: 'Moderate', color: '#eab308' },
  { min: 40, label: 'Risk', color: '#f97316' },
  { min: 0, label: 'Dangerous', color: '#dc2626' }
];

export const OFFICIAL_SOURCE_TEXT =
  'Official Sources: NCRB Crime in India (CCTNS extracts), Tamil Nadu Police Open Data, Greater Chennai Police public bulletins.';

const CRIME_TYPES = {
  violent: ['Assault', 'Robbery', 'Homicide Attempt', 'Street Violence'],
  sexual: ['Sexual Assault', 'Harassment', 'Stalking', 'Molestation'],
  property: ['Theft', 'Burglary', 'Vehicle Theft', 'Property Damage'],
  women: ['Eve Teasing', 'Domestic Harassment', 'Women Harassment', 'Stalking'],
  cyber: ['Phishing', 'UPI Fraud', 'Identity Theft', 'Cyber Extortion']
};

const TYPE_SEVERITY = {
  Assault: 'High',
  Robbery: 'High',
  'Homicide Attempt': 'Critical',
  'Street Violence': 'Medium',
  'Sexual Assault': 'Critical',
  Harassment: 'Medium',
  Stalking: 'Medium',
  Molestation: 'High',
  Theft: 'Low',
  Burglary: 'Medium',
  'Vehicle Theft': 'Medium',
  'Property Damage': 'Low',
  'Eve Teasing': 'Low',
  'Domestic Harassment': 'Medium',
  'Women Harassment': 'Medium',
  Phishing: 'Low',
  'UPI Fraud': 'Medium',
  'Identity Theft': 'High',
  'Cyber Extortion': 'High'
};

const STREET_PREFIX = [
  'Lake View Rd',
  'Main Bazaar St',
  'Market Road',
  'Temple Street',
  'Station Road',
  'North Avenue',
  'South Avenue',
  'Park Lane',
  'School Road',
  'Canal Street'
];

const EARTH_RADIUS = 6371000;
const GRID_SIZE_METERS = 500;

let revisionSeed = 1;
let lastUpdatedAt = new Date();
const cache = new Map();

const currentYear = () => new Date().getFullYear();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const hashString = (value) => {
  let hash = 7;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }
  return Math.abs(hash);
};

const seededUnit = (seed) => {
  const raw = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return raw - Math.floor(raw);
};

const randomBetween = (seed, min, max) => min + seededUnit(seed) * (max - min);

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const pad2 = (value) => String(value).padStart(2, '0');

const toDateIso = ({ year, monthIndex, weekIndex, seed }) => {
  const days = daysInMonth(year, monthIndex);
  const block = Math.floor(days / 4);
  const start = weekIndex === 4 ? block * 3 + 1 : (weekIndex - 1) * block + 1;
  const end = weekIndex === 4 ? days : weekIndex * block;
  const day = Math.max(1, Math.min(days, Math.floor(randomBetween(seed + 9, start, end + 1))));
  const hour = Math.floor(randomBetween(seed + 11, 0, 24));
  const minute = Math.floor(randomBetween(seed + 17, 0, 60));
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00.000Z`;
};

const svgThumbnail = (title, color) => {
  const safe = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='150'>
      <rect width='100%' height='100%' rx='18' fill='${color}'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-size='18' font-family='Verdana'>${title}</text>
    </svg>`
  );
  return `data:image/svg+xml;utf8,${safe}`;
};

const selectType = (category, seed) => {
  const options = CRIME_TYPES[category];
  return options[Math.floor(seededUnit(seed) * options.length)] || options[0];
};

const chooseCategory = (seed) => {
  const value = seededUnit(seed);
  if (value < 0.25) return 'property';
  if (value < 0.44) return 'violent';
  if (value < 0.6) return 'women';
  if (value < 0.77) return 'cyber';
  return 'sexual';
};

const createIncident = ({ state, district, area, bbox, monthIndex, weekIndex, index }) => {
  const key = `${state}-${district}-${area}-${monthIndex}-${weekIndex}-${index}-${revisionSeed}`;
  const seed = hashString(key);
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const longitude = randomBetween(seed + 31, minLng + 0.0004, maxLng - 0.0004);
  const latitude = randomBetween(seed + 33, minLat + 0.0004, maxLat - 0.0004);

  const category = chooseCategory(seed + 7);
  const type = selectType(category, seed + 13);
  const severityLevel = TYPE_SEVERITY[type] || 'Medium';
  const locationText = `${STREET_PREFIX[Math.floor(seededUnit(seed + 23) * STREET_PREFIX.length)]}, ${area}, ${district}`;
  const includeImage = seededUnit(seed + 51) > 0.48;
  const datetime = toDateIso({
    year: currentYear(),
    monthIndex,
    weekIndex,
    seed
  });

  return {
    id: `${area.replace(/\s/g, '-')}-${monthIndex + 1}-${weekIndex}-${index}`,
    category,
    type,
    severityLevel,
    severityColor: SEVERITY_COLORS[severityLevel],
    latitude,
    longitude,
    datetime,
    monthIndex,
    weekIndex,
    locationText,
    imageUrl: includeImage ? svgThumbnail(type, SEVERITY_COLORS[severityLevel]) : null
  };
};

const buildAreaDataset = ({ state, district, area }) => {
  const config = getAreaConfig(state, district, area);
  const records = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    for (let weekIndex = 1; weekIndex <= 4; weekIndex += 1) {
      const baseSeed = hashString(`${state}-${district}-${area}-${monthIndex}-${weekIndex}-${revisionSeed}`);
      const count = 16 + Math.floor(seededUnit(baseSeed) * 14);
      for (let index = 0; index < count; index += 1) {
        records.push(
          createIncident({
            state,
            district,
            area,
            bbox: config.bbox,
            monthIndex,
            weekIndex,
            index
          })
        );
      }
    }
  }

  return records;
};

const getAreaDataset = ({ state, district, area }) => {
  const key = `${state}|${district}|${area}|${revisionSeed}`;
  if (!cache.has(key)) {
    cache.set(key, buildAreaDataset({ state, district, area }));
  }
  return cache.get(key);
};

const weightForIncident = (incident) => SEVERITY_WEIGHTS[incident.severityLevel] || 1;

const scoreBand = (score) => SCORE_BANDS.find((item) => score >= item.min) || SCORE_BANDS[SCORE_BANDS.length - 1];

const calculateSafetyScore = (incidents) => {
  const weighted = incidents.reduce((sum, incident) => sum + weightForIncident(incident) * 2.6, 0);
  const incidentPenalty = incidents.length * 0.9;
  const score = clamp(Math.round(100 - weighted - incidentPenalty), 0, 100);
  return score;
};

const categoryLabelMap = CRIME_CATEGORIES.reduce((acc, item) => ({ ...acc, [item.key]: item.label }), {});

const categoryBreakdown = (incidents) => {
  const result = {};
  CRIME_CATEGORIES.filter((item) => item.key !== 'all').forEach((item) => {
    result[item.key] = 0;
  });

  incidents.forEach((incident) => {
    result[incident.category] = (result[incident.category] || 0) + 1;
  });

  return Object.entries(result).map(([category, count]) => ({
    category,
    label: categoryLabelMap[category],
    count
  }));
};

const monthRange = (incidents, monthIndex) => incidents.filter((item) => item.monthIndex === monthIndex);

const weeklyScoresForMonth = (incidents, monthIndex) =>
  WEEK_OPTIONS.map((week) => {
    const weekIncidents = incidents.filter((item) => item.monthIndex === monthIndex && item.weekIndex === week);
    return {
      week,
      incidents: weekIncidents.length,
      score: calculateSafetyScore(weekIncidents)
    };
  });

const previousWindow = (monthIndex, weekIndex) => {
  if (weekIndex > 1) {
    return { monthIndex, weekIndex: weekIndex - 1 };
  }
  return {
    monthIndex: monthIndex === 0 ? 11 : monthIndex - 1,
    weekIndex: 4
  };
};

const dominantCrime = (incidents) => {
  if (!incidents.length) return 'No incidents';
  const counts = incidents.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0][0];
};

export const distanceMeters = (from, to) => {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const rLat1 = (fromLat * Math.PI) / 180;
  const rLat2 = (toLat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(rLat1) * Math.cos(rLat2);
  return 2 * EARTH_RADIUS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const refreshCrimeMonitorData = () => {
  revisionSeed += 1;
  lastUpdatedAt = new Date();
  cache.clear();
  return { lastUpdatedAt: lastUpdatedAt.toISOString() };
};

export const getCrimeMonitorMeta = () => ({
  year: currentYear(),
  sourcesText: OFFICIAL_SOURCE_TEXT,
  lastUpdatedAt: lastUpdatedAt.toISOString()
});

export const getCrimeSnapshot = ({
  state,
  district,
  area,
  monthIndex,
  weekIndex,
  selectedCategories = ['all'],
  severityGradedOnly = false
}) => {
  const allAreaIncidents = getAreaDataset({ state, district, area });
  const activeCategories =
    selectedCategories.includes('all') || selectedCategories.length === 0
      ? ['violent', 'sexual', 'property', 'women', 'cyber']
      : selectedCategories;

  const filtered = allAreaIncidents.filter((incident) => {
    const sameWindow = incident.monthIndex === monthIndex && incident.weekIndex === weekIndex;
    const categoryAllowed = activeCategories.includes(incident.category);
    const severityAllowed = severityGradedOnly ? weightForIncident(incident) >= 2 : true;
    return sameWindow && categoryAllowed && severityAllowed;
  });

  const currentScore = calculateSafetyScore(filtered);
  const currentBand = scoreBand(currentScore);

  const previous = previousWindow(monthIndex, weekIndex);
  const previousSet = allAreaIncidents.filter(
    (incident) =>
      incident.monthIndex === previous.monthIndex &&
      incident.weekIndex === previous.weekIndex &&
      activeCategories.includes(incident.category) &&
      (severityGradedOnly ? weightForIncident(incident) >= 2 : true)
  );

  const previousScore = calculateSafetyScore(previousSet);
  const scoreChangePct =
    previousScore === 0
      ? currentScore === 0
        ? 0
        : 100
      : Number((((currentScore - previousScore) / previousScore) * 100).toFixed(1));

  const selectedMonthIncidents = monthRange(allAreaIncidents, monthIndex).filter(
    (incident) =>
      activeCategories.includes(incident.category) && (severityGradedOnly ? weightForIncident(incident) >= 2 : true)
  );
  const previousMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const previousMonthIncidents = monthRange(allAreaIncidents, previousMonthIndex).filter(
    (incident) =>
      activeCategories.includes(incident.category) && (severityGradedOnly ? weightForIncident(incident) >= 2 : true)
  );

  const monthDiff =
    previousMonthIncidents.length === 0
      ? selectedMonthIncidents.length === 0
        ? 0
        : 100
      : Number(
          (((selectedMonthIncidents.length - previousMonthIncidents.length) / previousMonthIncidents.length) * 100).toFixed(1)
        );

  return {
    incidents: filtered,
    currentBand,
    currentScore,
    previousScore,
    scoreChangePct,
    dominantCrimeType: dominantCrime(filtered),
    totalIncidents: filtered.length,
    categoryBars: categoryBreakdown(filtered),
    weeklyTrend: weeklyScoresForMonth(
      allAreaIncidents.filter(
        (incident) =>
          activeCategories.includes(incident.category) && (severityGradedOnly ? weightForIncident(incident) >= 2 : true)
      ),
      monthIndex
    ),
    monthComparison: {
      selectedMonthIncidents: selectedMonthIncidents.length,
      previousMonthIncidents: previousMonthIncidents.length,
      diffPct: monthDiff
    }
  };
};

export const toIncidentFeatureCollection = (incidents) => ({
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
      severity: incident.severityLevel,
      color: incident.severityColor,
      category: incident.category
    }
  }))
});

const incidentsInTile = (incidents, lng, lat, lngStep, latStep) =>
  incidents.filter(
    (incident) =>
      incident.longitude >= lng &&
      incident.longitude < lng + lngStep &&
      incident.latitude >= lat &&
      incident.latitude < lat + latStep
  );

export const buildMicrozoneTiles = ({ bbox, incidents }) => {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const latStep = GRID_SIZE_METERS / 111320;
  const lngStep = GRID_SIZE_METERS / (111320 * Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180));
  const features = [];
  let tileId = 1;

  for (let lat = minLat; lat < maxLat; lat += latStep) {
    for (let lng = minLng; lng < maxLng; lng += lngStep) {
      const tileIncidents = incidentsInTile(incidents, lng, lat, lngStep, latStep);
      const riskWeight = tileIncidents.reduce((sum, item) => sum + weightForIncident(item) * 9, 0);
      const score = clamp(Math.round(100 - riskWeight), 0, 100);
      const band = scoreBand(score);

      features.push({
        type: 'Feature',
        id: `tile-${tileId}`,
        geometry: {
          type: 'Polygon',
          coordinates: [[[lng, lat], [lng + lngStep, lat], [lng + lngStep, lat + latStep], [lng, lat + latStep], [lng, lat]]]
        },
        properties: {
          tileId,
          score,
          label: band.label,
          color: band.color,
          incidents: tileIncidents.length
        }
      });
      tileId += 1;
    }
  }

  return {
    type: 'FeatureCollection',
    features
  };
};

export const nearbySummary = ({ incidents, coordinate, radiusMeters = 500 }) => {
  if (!coordinate) {
    return null;
  }

  const focused = incidents.filter((item) => distanceMeters(coordinate, [item.longitude, item.latitude]) <= radiusMeters);
  const score = calculateSafetyScore(focused);

  return {
    incidents: focused,
    count: focused.length,
    dominantCrimeType: dominantCrime(focused),
    score
  };
};

