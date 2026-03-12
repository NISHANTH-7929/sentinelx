const { getReplayState, startReplay, stopReplay } = require('../simulator/replayEngine');

const startSimulator = (req, res) => {
  try {
    const state = startReplay(req.body || {});
    res.json({ message: 'Simulator started', state });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const stopSimulator = (_req, res) => {
  const state = stopReplay();
  res.json({ message: 'Simulator stopped', state });
};

const getSimulatorState = (_req, res) => {
  res.json(getReplayState());
};

module.exports = {
  startSimulator,
  stopSimulator,
  getSimulatorState
};
