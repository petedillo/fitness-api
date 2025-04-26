const {PrismaClient} = require('../generated/prisma');
const prisma = new PrismaClient();

// CREATE - Already implemented
exports.createWorkout = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const {name, description, exercises} = req.body;

        // Validate required fields
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({
                error: 'Workout name is required and must be a non-empty string'
            });
        }

        if (!Array.isArray(exercises) || exercises.length === 0) {
            return res.status(400).json({
                error: 'At least one exercise is required'
            });
        }

        // Verify all exercises exist before creating the workout
        const exerciseIds = exercises.map(exercise => exercise.exerciseId);
        const existingExercises = await prisma.exercise.findMany({
            where: {
                id: {
                    in: exerciseIds
                }
            }
        });

        if (existingExercises.length !== exerciseIds.length) {
            return res.status(404).json({
                error: 'One or more exercises do not exist'
            });
        }

        // Create a workout with nested workout exercises
        const newWorkout = await prisma.workout.create({
            data: {
                name: name.trim(),
                description: description?.trim(),
                userId: userId,
                workoutExercises: {
                    create: exercises.map(exercise => ({
                        exerciseId: exercise.exerciseId,
                        sets: exercise.sets || 1,
                        repetitions: exercise.repetitions?.trim(),
                        weight: exercise.weight,
                        order: exercise.order || 1
                    }))
                }
            },
            include: {
                workoutExercises: {
                    include: {
                        exercise: true
                    }
                }
            }
        });

        res.status(201).json(newWorkout);
    } catch (error) {
        console.error('Error creating workout:', error);

        if (error.code === 'P2003') {
            return res.status(404).json({
                error: 'One or more exercises not found'
            });
        }

        if (error.code === 'P2025') {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        res.status(500).json({error: 'Failed to create workout'});
    }
};

// READ (all workouts for a user)
exports.getUserWorkouts = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);

        if (isNaN(userId)) {
            return res.status(400).json({error: 'Invalid user ID'});
        }

        // Check if a user exists
        const user = await prisma.user.findUnique({
            where: {id: userId}
        });

        if (!user) {
            return res.status(404).json({error: 'User not found'});
        }

        const workouts = await prisma.workout.findMany({
            where: {userId},
            include: {
                workoutExercises: {
                    include: {
                        exercise: true
                    }
                }
            }
        });

        res.status(200).json(workouts);
    } catch (error) {
        console.error('Error fetching workouts:', error);
        res.status(500).json({error: 'Failed to fetch workouts'});
    }
};

// READ (single workout)
exports.getWorkoutById = async (req, res) => {
    try {
        const workoutId = parseInt(req.params.id);

        if (isNaN(workoutId)) {
            return res.status(400).json({error: 'Invalid workout ID'});
        }

        const workout = await prisma.workout.findUnique({
            where: {id: workoutId},
            include: {
                workoutExercises: {
                    include: {
                        exercise: true
                    },
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });

        if (!workout) {
            return res.status(404).json({error: 'Workout not found'});
        }

        res.status(200).json(workout);
    } catch (error) {
        console.error('Error fetching workout:', error);
        res.status(500).json({error: 'Failed to fetch workout'});
    }
};

// UPDATE
exports.updateWorkout = async (req, res) => {
    try {
        const workoutId = parseInt(req.params.id);
        const {name, description, exercises} = req.body;

        if (isNaN(workoutId)) {
            return res.status(400).json({error: 'Invalid workout ID'});
        }

        // Check if workout exists
        const existingWorkout = await prisma.workout.findUnique({
            where: {id: workoutId},
            include: {
                workoutExercises: true
            }
        });

        if (!existingWorkout) {
            return res.status(404).json({error: 'Workout not found'});
        }

        // Validate fields if provided
        if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
            return res.status(400).json({
                error: 'Workout name must be a non-empty string if provided'
            });
        }

        // Start a transaction to update the workout and its exercises
        const updatedWorkout = await prisma.$transaction(async (tx) => {
            // Update basic workout info
            await tx.workout.update({
                where: {id: workoutId},
                data: {
                    name: name !== undefined ? name.trim() : existingWorkout.name,
                    description: description !== undefined ? description?.trim() : existingWorkout.description,
                }
            });

            // If exercises are provided, update them
            if (exercises) {
                if (!Array.isArray(exercises) || exercises.length === 0) {
                    throw new Error('At least one exercise is required');
                }

                // Verify all exercises exist
                const exerciseIds = exercises.map(exercise => exercise.exerciseId);
                const existingExercises = await tx.exercise.findMany({
                    where: {
                        id: {
                            in: exerciseIds
                        }
                    }
                });

                if (existingExercises.length !== exerciseIds.length) {
                    throw new Error('One or more exercises do not exist');
                }

                // Delete existing workout exercises
                await tx.workoutExercise.deleteMany({
                    where: {workoutId}
                });

                // Create new workout exercises
                await tx.workoutExercise.createMany({
                    data: exercises.map(exercise => ({
                        workoutId,
                        exerciseId: exercise.exerciseId,
                        sets: exercise.sets || 1,
                        repetitions: exercise.repetitions?.trim(),
                        weight: exercise.weight,
                        order: exercise.order || 1
                    }))
                });
            }

            // Return the updated workout with its exercises
            return tx.workout.findUnique({
                where: {id: workoutId},
                include: {
                    workoutExercises: {
                        include: {
                            exercise: true
                        },
                        orderBy: {
                            order: 'asc'
                        }
                    }
                }
            });
        });

        res.status(200).json(updatedWorkout);
    } catch (error) {
        console.error('Error updating workout:', error);

        if (error.message === 'At least one exercise is required') {
            return res.status(400).json({error: error.message});
        }

        if (error.message === 'One or more exercises do not exist') {
            return res.status(404).json({error: error.message});
        }

        res.status(500).json({error: 'Failed to update workout'});
    }
};

// DELETE
exports.deleteWorkout = async (req, res) => {
    try {
        const workoutId = parseInt(req.params.id);

        if (isNaN(workoutId)) {
            return res.status(400).json({error: 'Invalid workout ID'});
        }

        // Check if workout exists
        const existingWorkout = await prisma.workout.findUnique({
            where: {id: workoutId}
        });

        if (!existingWorkout) {
            return res.status(404).json({error: 'Workout not found'});
        }

        // Delete workout (cascade should handle workout exercises)
        await prisma.workout.delete({
            where: {id: workoutId}
        });

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting workout:', error);

        if (error.code === 'P2003') {
            return res.status(400).json({
                error: 'Cannot delete workout that has workout logs. Delete logs first.'
            });
        }

        res.status(500).json({error: 'Failed to delete workout'});
    }
};