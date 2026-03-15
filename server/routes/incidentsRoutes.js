const express = require('express');
const multer = require('multer');

const { createIncident, getIncidents } = require('../controllers/incidentsController');

const upload = multer({
  dest: 'uploads/'
});

const router = express.Router();

router.post('/incidents', upload.array('media', 5), createIncident);
router.get('/incidents', getIncidents);

module.exports = router;
