const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

router.post('/', usersController.createUser);
// Add other user routes here

module.exports = router;