const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

/**
 * Validates exercise name
 * @param {string} name - The exercise name to validate
 * @returns {string|null} - Error message or null if valid
 */
const validateExerciseName = (name) => {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return 'Exercise name is required and must be a non-empty string';
  }
  return null;
};

/**
 * Validates exercise description
 * @param {string|undefined} description - The exercise description to validate
 * @returns {string|null} - Error message or null if valid
 */
const validateExerciseDescription = (description) => {
  if (description !== undefined && typeof description !== 'string') {
    return 'Description must be a string if provided';
  }
  return null;
};

/**
 * Creates a new exercise
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createExercise = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validate input
    const nameError = validateExerciseName(name);
    if (nameError) {
      return res.status(400).json({error: nameError});
    }

    const descriptionError = validateExerciseDescription(description);
    if (descriptionError) {
      return res.status(400).json({error: descriptionError});
    }

    // Create exercise
    const newExercise = await prisma.exercise.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
      },
    });

    res.status(201).json(newExercise);
  } catch (error) {
    console.error('Error creating exercise:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'An exercise with this name already exists' 
      });
    }

    res.status(500).json({ error: 'Failed to create exercise' });
  }
};

// READ (all exercises)
exports.getAllExercises = async (req, res) => {
  try {
    const exercises = await prisma.exercise.findMany();
    res.status(200).json(exercises);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({error: 'Failed to fetch exercises'});
  }
};

// READ (single exercise)
exports.getExerciseById = async (req, res) => {
  try {
    const exerciseId = parseInt(req.params.id);

    if (isNaN(exerciseId)) {
      return res.status(400).json({error: 'Invalid exercise ID'});
    }

    const exercise = await prisma.exercise.findUnique({
      where: {id: exerciseId}
    });

    if (!exercise) {
      return res.status(404).json({error: 'Exercise not found'});
    }

    res.status(200).json(exercise);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    res.status(500).json({error: 'Failed to fetch exercise'});
  }
};

// UPDATE
exports.updateExercise = async (req, res) => {
  try {
    const exerciseId = parseInt(req.params.id);
    const {name, description} = req.body;

    if (isNaN(exerciseId)) {
      return res.status(400).json({error: 'Invalid exercise ID'});
    }

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: {id: exerciseId}
    });

    if (!existingExercise) {
      return res.status(404).json({error: 'Exercise not found'});
    }

    // Validate fields
    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      return res.status(400).json({
        error: 'Exercise name must be a non-empty string if provided'
      });
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({
        error: 'Description must be a string if provided'
      });
    }

    // Update exercise
    const updatedExercise = await prisma.exercise.update({
      where: {id: exerciseId},
      data: {
        name: name !== undefined ? name.trim() : existingExercise.name,
        description: description !== undefined ? description.trim() : existingExercise.description,
      }
    });

    res.status(200).json(updatedExercise);
  } catch (error) {
    console.error('Error updating exercise:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'An exercise with this name already exists'
      });
    }

    res.status(500).json({error: 'Failed to update exercise'});
  }
};

// DELETE
exports.deleteExercise = async (req, res) => {
  try {
    const exerciseId = parseInt(req.params.id);

    if (isNaN(exerciseId)) {
      return res.status(400).json({error: 'Invalid exercise ID'});
    }

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: {id: exerciseId}
    });

    if (!existingExercise) {
      return res.status(404).json({error: 'Exercise not found'});
    }

    // Delete exercise
    await prisma.exercise.delete({
      where: {id: exerciseId}
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting exercise:', error);

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete exercise that is used in workouts. Remove it from workouts first.'
      });
    }

    res.status(500).json({error: 'Failed to delete exercise'});
  }
};