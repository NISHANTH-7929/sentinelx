const VALID_TYPES = new Set(['murder', 'rape', 'theft', 'fire', 'accident', 'assault', 'other']);

const KEYWORD_RULES = [
  { keywords: ['fire', 'smoke', 'burn', 'blaze'], type: 'fire', confidence: 0.9 },
  { keywords: ['crash', 'accident', 'collision', 'overturn'], type: 'accident', confidence: 0.85 },
  { keywords: ['murder', 'killed', 'dead body', 'homicide', 'shooting', 'gunshot'], type: 'murder', confidence: 0.88 },
  { keywords: ['rape', 'sexual assault'], type: 'rape', confidence: 0.92 },
  { keywords: ['theft', 'robbery', 'snatch', 'stolen'], type: 'theft', confidence: 0.82 },
  { keywords: ['assault', 'fight', 'attack', 'stab'], type: 'assault', confidence: 0.76 }
];

const normalizeType = (rawType) => {
  if (!rawType) {
    return 'other';
  }

  const lower = String(rawType).trim().toLowerCase();
  return VALID_TYPES.has(lower) ? lower : 'other';
};

const classifyIncident = ({ description, category, type: suppliedType, confidence: suppliedConfidence }) => {
  const text = `${description || ''} ${category || ''} ${suppliedType || ''}`.toLowerCase();

  let resultType = normalizeType(category || suppliedType);
  let resultConfidence = Number.isFinite(Number(suppliedConfidence)) ? Number(suppliedConfidence) : 0;

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      resultType = rule.type;
      resultConfidence = Math.max(resultConfidence, rule.confidence);
      break;
    }
  }

  if (!resultConfidence) {
    resultConfidence = resultType === 'other' ? 0.35 : 0.65;
  }

  return {
    type: resultType,
    confidence: Math.max(0, Math.min(1, Number(resultConfidence.toFixed(2))))
  };
};

module.exports = {
  classifyIncident,
  normalizeType
};
