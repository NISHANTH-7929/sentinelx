const express = require('express');
const { upsertUser, updateUserLocation } = require('../controllers/usersController');

const router = express.Router();

router.post('/users/register', upsertUser);
router.patch('/users/location', updateUserLocation);

module.exports = router;
