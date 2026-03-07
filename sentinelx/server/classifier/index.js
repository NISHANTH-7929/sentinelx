const classifyIncident = (payload) => {
    const text = (payload.description || '').toLowerCase();
    let type = payload.type || 'other';
    let confidence = payload.confidence !== undefined ? payload.confidence : 0.5;

    // Simple keyword rules
    if (text.includes('fire') || text.includes('smoke') || text.includes('burn')) {
        type = 'fire';
        confidence += 0.2;
    } else if (text.includes('crash') || text.includes('accident') || text.includes('collision')) {
        type = 'accident';
        confidence += 0.2;
    } else if (text.includes('shoot') || text.includes('gun') || text.includes('murder')) {
        type = 'murder';
        confidence += 0.3;
    } else if (text.includes('steal') || text.includes('rob') || text.includes('theft')) {
        type = 'theft';
        confidence += 0.2;
    } else if (text.includes('assault') || text.includes('fight') || text.includes('attack')) {
        type = 'assault';
        confidence += 0.2;
    }

    confidence = Math.min(Math.max(confidence, 0), 1.0); // Normalize 0-1

    let status = 'pending';
    if (confidence >= 0.8) status = 'verified';
    else if (confidence < 0.4) status = 'rejected';

    const highSeverityTypes = ['terror', 'shooting', 'fire', 'major accident', 'murder', 'rape'];
    let severity = 1;

    if (highSeverityTypes.includes(type)) {
        severity = 3;
    } else if (confidence >= 0.7) {
        severity = 2; // Also if 'multiple reports within 15 mins', but skipping for prototype logic
    }

    return { type, confidence, severity, status };
};

module.exports = { classifyIncident };
