const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

exports.createExercise = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ 
        error: 'Exercise name is required and must be a non-empty string' 
      });
    }

    if (description !== undefined && typeof description !== 'string') {
      return res.status(400).json({ 
        error: 'Description must be a string if provided' 
      });
    }

    const newExercise = await prisma.exercise.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
      },
    });

    res.status(201).json(newExercise);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: 'An exercise with this name already exists' 
      });
    }

    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
};