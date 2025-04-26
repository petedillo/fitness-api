const express = require('express');
const router = express.Router();
const workoutsController = require('../controllers/workoutsController');

// CREATE - Create a new workout for a user
router.post('/users/:userId/workouts', workoutsController.createWorkout);

// READ - Get all workouts for a user
router.get('/users/:userId/workouts', workoutsController.getUserWorkouts);

// READ - Get a specific workout by ID
router.get('/workouts/:id', workoutsController.getWorkoutById);

// UPDATE - Update a workout
router.put('/workouts/:id', workoutsController.updateWorkout);

// DELETE - Delete a workout
router.delete('/workouts/:id', workoutsController.deleteWorkout);

module.exports = router;