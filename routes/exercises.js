const express = require('express');
const router = express.Router();
const exercisesController = require('../controllers/exercisesController');
const {verifyToken} = require('../middleware/auth');

// All routes protected by authentication
router.use(verifyToken);

// CREATE - Create a new exercise
router.post('/', exercisesController.createExercise);

// READ - Get all exercises
router.get('/', exercisesController.getAllExercises);

// READ - Get a specific exercise by ID
router.get('/:id', exercisesController.getExerciseById);

// UPDATE - Update an exercise
router.put('/:id', exercisesController.updateExercise);

// DELETE - Delete an exercise
router.delete('/:id', exercisesController.deleteExercise);

module.exports = router;