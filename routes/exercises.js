const express = require('express');
const router = express.Router();
const exercisesController = require('../controllers/exercisesController');

router.post('/', exercisesController.createExercise);
// Add other exercise routes here

module.exports = router;