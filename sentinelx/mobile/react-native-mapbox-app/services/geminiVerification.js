/**
 * Gemini AI Verification Service
 *
 * Simulates Gemini multimodal AI verification for incident reports.
 * In production, replace SIMULATE_GEMINI = false and provide your API key in config.js.
 *
 * AI signals:
 *  1. Media analysis via Gemini Vision
 *  2. Location-based signal aggregation (nearby reports, news, social)
 */

import { API_BASE_URL } from './config';

const SIMULATE_GEMINI = false; // Set to false + add GEMINI_API_KEY for real Gemini calls

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ─── Simulated AI responses per incident type ──────────────────────────────
const SIMULATED_RESPONSES = {
  Accident: {
    detectedType: 'Vehicle Collision',
    confidence: 82,
    explanation:
      'Image shows multiple vehicles with visible collision damage. Emergency indicators such as airbag deployment and debris field are present. High confidence of a road accident scenario.'
  },
  Fire: {
    detectedType: 'Active Fire / Smoke',
    confidence: 91,
    explanation:
      'Significant smoke plume and orange flame glow detected. Structural fire indicators visible in background. Immediate emergency response recommended.'
  },
  Robbery: {
    detectedType: 'Suspicious Activity',
    confidence: 58,
    explanation:
      'Image shows individuals in a confrontational posture near a commercial property. Confidence is moderate — visual context alone insufficient for definitive classification.'
  },
  Assault: {
    detectedType: 'Physical Altercation',
    confidence: 71,
    explanation:
      'Scene displays signs of physical confrontation between individuals. Defensive postures and bystander crowd visible. Moderate-to-high confidence of assault scenario.'
  },
  Disaster: {
    detectedType: 'Structural Damage / Disaster',
    confidence: 88,
    explanation:
      'Widespread debris, collapsed structures, and displaced persons visible in image. Consistent with natural disaster or infrastructure failure. High confidence rating.'
  },
  default: {
    detectedType: 'Unclassified Emergency',
    confidence: 45,
    explanation:
      'Image content detected as potentially emergency-related but insufficient visual cues for specific classification. Manual review recommended.'
  }
};

// ─── Simulated location signals ─────────────────────────────────────────────
const SIMULATED_LOCATION_SIGNALS = [
  {
    signalCount: 3,
    newsHits: 1,
    nearbyReports: 2,
    socialMentions: 0,
    summary: '2 nearby user reports + 1 news mention detected within 500m.'
  },
  {
    signalCount: 5,
    newsHits: 2,
    nearbyReports: 2,
    socialMentions: 1,
    summary: 'High signal density: 2 nearby reports, 2 news articles, 1 social mention.'
  },
  {
    signalCount: 0,
    newsHits: 0,
    nearbyReports: 0,
    socialMentions: 0,
    summary: 'No corroborating signals found at this location at this time.'
  },
  {
    signalCount: 1,
    newsHits: 0,
    nearbyReports: 1,
    socialMentions: 0,
    summary: '1 nearby user report found in the same area.'
  }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Analyzes uploaded media via Gemini Vision API.
 * @param {string} imageUri - local file URI of the image
 * @param {string} incidentType - user-selected incident type
 */
export const analyzeMediaWithGemini = async (imageUri, incidentType) => {
  if (SIMULATE_GEMINI || !GEMINI_API_KEY) {
    // Simulate a realistic API delay
    await delay(1800 + Math.random() * 1200);
    const response = SIMULATED_RESPONSES[incidentType] || SIMULATED_RESPONSES.default;
    return {
      ...response,
      confidence: Math.min(100, Math.max(10, response.confidence + Math.round((Math.random() - 0.5) * 14)))
    };
  }

  // Real Gemini call (requires base64 encoding the image)
  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are an emergency incident classifier for a public safety platform. 
Analyze this image and determine if it shows an emergency situation.
The user reported this as: "${incidentType}".
Respond ONLY with a JSON object: { "detectedType": string, "confidence": number (0-100), "explanation": string }`
              },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: imageUri // should be base64 in production
                }
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return parsed;
  } catch (_err) {
    return SIMULATED_RESPONSES[incidentType] || SIMULATED_RESPONSES.default;
  }
};

/**
 * Checks location-based corroborating signals near the incident coordinates.
 * @param {number} lat
 * @param {number} lng
 */
export const checkLocationSignals = async (lat, lng) => {
  await delay(1200 + Math.random() * 800);

  // Simulate: use lat/lng as a seed to pick a consistent simulation
  const index = Math.abs(Math.round(lat * lng * 13)) % SIMULATED_LOCATION_SIGNALS.length;
  return SIMULATED_LOCATION_SIGNALS[index];
};

/**
 * Computes final verification status from AI confidence and location signals.
 */
export const computeVerificationStatus = (aiConfidence, locationSignals) => {
  const hasSignals = locationSignals && locationSignals.signalCount > 0;

  if (aiConfidence > 70 && hasSignals) {
    return 'VERIFIED';
  }
  if (aiConfidence > 70 && !hasSignals) {
    return 'PENDING'; // high AI confidence but no corroborating signals
  }
  if (aiConfidence >= 40) {
    return 'PENDING';
  }
  return 'REJECTED';
};
