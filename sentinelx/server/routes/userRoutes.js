const express = require('express');
const { upsertUser } = require('../controllers/usersController');

const router = express.Router();

router.post('/users/register', upsertUser);

module.exports = router;
