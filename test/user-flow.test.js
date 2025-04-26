// tests/user-flow.test.js
import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import request from 'supertest';
import app from '../server.js';
import {PrismaClient} from '../generated/prisma';

const prisma = new PrismaClient();

// Test user data
const testUser = {
    username: 'testuser' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'Password123!'
};

// Global variables to store created entities
let authToken;
let userId;
let exerciseId;
let workoutId;

// Clean up any test data that might exist from previous runs
beforeAll(async () => {
    try {
        // Find and delete the test user if it exists
        const existingUser = await prisma.user.findUnique({
            where: {email: testUser.email}
        });

        if (existingUser) {
            await prisma.user.delete({where: {id: existingUser.id}});
        }
    } catch (error) {
        console.log('No cleanup needed or error during cleanup:', error.message);
    }
});

// Clean up after tests
afterAll(async () => {
    try {
        // Attempt to delete the test user if it still exists
        if (userId) {
            const user = await prisma.user.findUnique({
                where: {id: userId}
            });

            if (user) {
                // Delete all workouts (cascade should handle dependencies)
                await prisma.workout.deleteMany({
                    where: {userId}
                });

                // Delete the user
                await prisma.user.delete({
                    where: {id: userId}
                });
            }
        }
    } catch (error) {
        console.log('Error during cleanup or already deleted:', error.message);
    } finally {
        await prisma.$disconnect();
    }
});

describe('User, Exercise and Workout Integration Test', () => {
    // 1. Register a new user
    test('Register a new user', async () => {
        const response = await request(app)
            .post('/users/register')
            .send(testUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.username).toBe(testUser.username);
        expect(response.body.user.email).toBe(testUser.email);

        // Save token and user ID for later requests
        authToken = response.body.token;
        userId = response.body.user.id;
    });

    // 2. Create an exercise
    test('Create a new exercise', async () => {
        const exerciseData = {
            name: 'Push-ups Test ' + Date.now(),
            description: 'Standard push-ups for testing'
        };

        const response = await request(app)
            .post('/exercises')
            .set('Authorization', `Bearer ${authToken}`)
            .send(exerciseData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(exerciseData.name);
        expect(response.body.description).toBe(exerciseData.description);

        // Save the exercise ID for later
        exerciseId = response.body.id;
    });

    // 3. Create a workout with the exercise
    test('Create a workout with the exercise', async () => {
        const workoutData = {
            name: 'Morning Routine Test ' + Date.now(),
            description: 'Morning workout routine for testing',
            exercises: [
                {
                    exerciseId: exerciseId,
                    sets: 3,
                    repetitions: '10-12',
                    weight: 0,
                    order: 1
                }
            ]
        };

        const response = await request(app)
            .post(`/users/${userId}/workouts`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(workoutData);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.name).toBe(workoutData.name);
        expect(response.body.description).toBe(workoutData.description);
        expect(response.body.workoutExercises).toHaveLength(1);
        expect(response.body.workoutExercises[0].exerciseId).toBe(exerciseId);

        // Save the workout ID for later
        workoutId = response.body.id;
    });

    // 4. Get current user profile (should include workouts)
    test('Get current user profile with workouts', async () => {
        const response = await request(app)
            .get('/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('workouts');
        expect(response.body.workouts.length).toBeGreaterThan(0);

        // Find our created workout
        const foundWorkout = response.body.workouts.find(w => w.id === workoutId);
        expect(foundWorkout).toBeDefined();
    });

    // 5. Get all exercises (should include our exercise)
    test('Get all exercises', async () => {
        const response = await request(app)
            .get('/exercises')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        // Find our created exercise
        const foundExercise = response.body.find(e => e.id === exerciseId);
        expect(foundExercise).toBeDefined();
        expect(foundExercise.id).toBe(exerciseId);
    });

    // 6. Get specific workout details
    test('Get specific workout details', async () => {
        const response = await request(app)
            .get(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', workoutId);
        expect(response.body).toHaveProperty('workoutExercises');
        expect(response.body.workoutExercises.length).toBeGreaterThan(0);

        // Check that the exercise is included in the workout
        const exerciseInWorkout = response.body.workoutExercises[0].exercise;
        expect(exerciseInWorkout).toHaveProperty('id', exerciseId);
    });

    // 7. Update the workout
    test('Update the workout', async () => {
        const updatedWorkoutData = {
            name: 'Updated Workout ' + Date.now(),
            description: 'Updated workout description',
            exercises: [
                {
                    exerciseId: exerciseId,
                    sets: 4,  // Changed from 3 to 4
                    repetitions: '8-10',  // Changed
                    weight: 5,  // Added some weight
                    order: 1
                }
            ]
        };

        const response = await request(app)
            .put(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedWorkoutData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', workoutId);
        expect(response.body.name).toBe(updatedWorkoutData.name);
        expect(response.body.description).toBe(updatedWorkoutData.description);
        expect(response.body.workoutExercises[0].sets).toBe(4);
        expect(response.body.workoutExercises[0].repetitions).toBe('8-10');
        expect(response.body.workoutExercises[0].weight).toBe(5);
    });

    // 8. Get all workouts for the user
    test('Get all workouts for user', async () => {
        const response = await request(app)
            .get(`/users/${userId}/workouts`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        // Find our created workout
        const foundWorkout = response.body.find(w => w.id === workoutId);
        expect(foundWorkout).toBeDefined();
    });

    // 9. Delete the workout
    test('Delete the workout', async () => {
        const response = await request(app)
            .delete(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        // Verify it's deleted
        const checkResponse = await request(app)
            .get(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(checkResponse.status).toBe(404);
    });

    // 10. Delete the exercise and verify it's properly removed from the system
    test('Delete the exercise', async () => {
        // First get the exercise to confirm it exists
        const getResponse = await request(app)
            .get(`/exercises/${exerciseId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(getResponse.status).toBe(200);
        expect(getResponse.body).toHaveProperty('id', exerciseId);

        // Delete the exercise
        const deleteResponse = await request(app)
            .delete(`/exercises/${exerciseId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(deleteResponse.status).toBe(204);

        // Verify it's deleted
        const checkResponse = await request(app)
            .get(`/exercises/${exerciseId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(checkResponse.status).toBe(404);
    });


    // 11. Delete the user and clean up all associated data
    test('Delete the user', async () => {
        const response = await request(app)
            .delete(`/users/${userId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        // Verify user deletion
        const checkResponse = await request(app)
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(checkResponse.status).toBe(404);

        // Set userId to null to skip the cleanup
        userId = null;
    });
}); // End of User, Exercise and Workout Integration Test