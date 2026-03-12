const express = require('express');

const {
  getSimulatorState,
  startSimulator,
  stopSimulator
} = require('../controllers/simulatorController');

const router = express.Router();

router.get('/simulate/state', getSimulatorState);
router.post('/simulate/start', startSimulator);
router.post('/simulate/stop', stopSimulator);

module.exports = router;
