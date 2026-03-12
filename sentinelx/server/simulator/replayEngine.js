const path = require('path');
const fs = require('fs');

const { ingestIncident } = require('../services/incidentIngestionService');

let replayTimer = null;
let replayState = {
  running: false,
  dataset: 'chennai_crimes.json',
  replay_speed: 1,
  loop: false,
  index: 0
};

const datasetsRoot = path.resolve(__dirname, '..', '..', 'datasets');

const normalizeDatasetRecord = (record, index) => ({
  source: 'simulator',
  type: record.type || record.category || 'other',
  description: record.description || `Simulated incident #${index + 1}`,
  latitude: Number(record.latitude ?? record.lat),
  longitude: Number(record.longitude ?? record.lng),
  confidence: Number(record.confidence ?? 0.95),
  media_urls: Array.isArray(record.media_urls) ? record.media_urls : [],
  datetime: new Date().toISOString(),
  reporter_id: 'simulator-engine'
});

const loadDataset = (datasetName) => {
  const filePath = path.join(datasetsRoot, datasetName);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset not found: ${datasetName}`);
  }

  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(content) || content.length === 0) {
    throw new Error(`Dataset ${datasetName} is empty or invalid.`);
  }

  return content;
};

const stopReplay = () => {
  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }

  replayState = {
    ...replayState,
    running: false,
    index: 0
  };

  return replayState;
};

const startReplay = ({ dataset = 'chennai_crimes.json', replay_speed = 1, loop = true, events_per_second } = {}) => {
  if (replayTimer) {
    stopReplay();
  }

  const records = loadDataset(dataset);
  let cursor = 0;

  const speed = Number(events_per_second || replay_speed || 1);
  const intervalMs = Math.max(120, Math.floor(1000 / speed));

  replayState = {
    running: true,
    dataset,
    replay_speed: speed,
    loop: Boolean(loop),
    index: 0
  };

  replayTimer = setInterval(async () => {
    try {
      if (cursor >= records.length) {
        if (loop) {
          cursor = 0;
        } else {
          stopReplay();
          return;
        }
      }

      const payload = normalizeDatasetRecord(records[cursor], cursor);
      cursor += 1;
      replayState.index = cursor;

      await ingestIncident(payload);
    } catch (error) {
      console.error('[Simulator] replay failure:', error.message);
    }
  }, intervalMs);

  return replayState;
};

const getReplayState = () => replayState;

module.exports = {
  startReplay,
  stopReplay,
  getReplayState
};
