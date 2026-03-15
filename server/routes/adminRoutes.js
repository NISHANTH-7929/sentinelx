const express = require('express');

const {
  approveIncident,
  getPendingIncidents,
  rejectIncident
} = require('../controllers/adminController');

const router = express.Router();

router.get('/incidents/pending', getPendingIncidents);
router.post('/incidents/:id/approve', approveIncident);
router.post('/incidents/:id/reject', rejectIncident);

module.exports = router;
