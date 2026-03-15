const CATEGORY_RULES = [
  {
    match: ['murder', 'assault', 'robbery', 'fire', 'accident'],
    category: 'violent'
  },
  {
    match: ['rape', 'sexual'],
    category: 'sexual'
  },
  {
    match: ['theft', 'burglary', 'property'],
    category: 'property'
  },
  {
    match: ['harassment', 'women'],
    category: 'women'
  },
  {
    match: ['cyber', 'fraud'],
    category: 'cyber'
  }
];

const SEVERITY_BY_TYPE = {
  murder: 'Critical',
  rape: 'Critical',
  assault: 'High',
  robbery: 'High',
  burglary: 'Medium',
  theft: 'Low',
  'cyber fraud': 'Medium',
  harassment: 'Medium'
};

const severityColor = {
  Critical: '#ef4444',
  High: '#f97316',
  Medium: '#eab308',
  Low: '#16a34a'
};

const normalizeType = (incident) => {
  const raw = `${incident.type || ''} ${incident.description || ''}`.toLowerCase();

  if (raw.includes('cyber') || raw.includes('fraud')) {
    return 'cyber fraud';
  }
  if (raw.includes('harassment')) {
    return 'harassment';
  }
  if (raw.includes('robbery')) {
    return 'robbery';
  }
  if (raw.includes('burglary')) {
    return 'burglary';
  }
  if (raw.includes('rape') || raw.includes('sexual')) {
    return 'rape';
  }
  if (raw.includes('murder')) {
    return 'murder';
  }
  if (raw.includes('assault')) {
    return 'assault';
  }
  if (raw.includes('theft')) {
    return 'theft';
  }

  return (incident.type || 'theft').toLowerCase();
};

export const enrichIncident = (incident) => {
  const normalizedType = normalizeType(incident);

  const severity = SEVERITY_BY_TYPE[normalizedType] || 'Medium';

  const category =
    CATEGORY_RULES.find((rule) => rule.match.some((word) => normalizedType.includes(word) || (incident.description || '').toLowerCase().includes(word)))
      ?.category || 'property';

  return {
    ...incident,
    normalizedType,
    severityLevel: severity,
    severityColor: severityColor[severity],
    category
  };
};

export const getSeverityWeight = (severityLevel) => {
  if (severityLevel === 'Critical') return 4;
  if (severityLevel === 'High') return 3;
  if (severityLevel === 'Medium') return 2;
  return 1;
};
