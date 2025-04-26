// Add performance timers and more assertions to enhance test feedback

import {afterAll, beforeAll, describe, expect, test} from 'vitest';
import request from 'supertest';
import app from '../server.js';
import {PrismaClient} from '../generated/prisma';
import {endTestTimer, startTestTimer} from './testTimerUtil.js';

const prisma = new PrismaClient();


// Test user data
const testUser = {
    username: 'testuser' + Date.now(),
    email: `test${Date.now()}@example.com`,
    password: 'Password123!'
};

let authToken;
let userId;
let exerciseId;
let workoutId;

beforeAll(async () => {
    try {
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

afterAll(async () => {
    try {
        if (userId) {
            const user = await prisma.user.findUnique({
                where: {id: userId}
            });

            if (user) {
                await prisma.workout.deleteMany({
                    where: {userId}
                });
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
    test('Register a new user', async () => {
        startTestTimer('register');
        const response = await request(app)
            .post('/auth/register')
            .send(testUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('id');
        expect(typeof response.body.user.id).toBe('number');
        expect(response.body.user.username).toBe(testUser.username);
        expect(response.body.user.email).toBe(testUser.email);

        authToken = response.body.token;
        userId = response.body.user.id;

        // Check token has expected JWT-like format for debugging
        expect(authToken.split('.').length).toBe(3);

        endTestTimer('register');
    });

    test('Login with invalid credentials should fail', async () => {
        startTestTimer('invalid-login');
        const res = await request(app)
            .post('/auth/login')
            .send({email: testUser.email, password: 'wrongPass!'});

        expect(res.status).toBeGreaterThanOrEqual(400);
        expect(res.status).toBeLessThan(500); // Client error
        expect(res.body).toHaveProperty('error');
        endTestTimer('invalid-login');
    });

    test('Create a new exercise', async () => {
        startTestTimer('create-exercise');
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
        expect(typeof response.body.id).toBe('number');
        expect(response.body.name).toBe(exerciseData.name);
        expect(response.body.description).toBe(exerciseData.description);

        // Save the exercise ID for later
        exerciseId = response.body.id;

        // Check id is unique and positive
        expect(exerciseId).toBeGreaterThan(0);

        endTestTimer('create-exercise');
    });

    test('Create a workout with the exercise', async () => {
        startTestTimer('create-workout');
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
        expect(typeof response.body.id).toBe('number');
        expect(response.body.name).toBe(workoutData.name);
        expect(response.body.description).toBe(workoutData.description);
        expect(response.body.workoutExercises).toHaveLength(1);
        expect(response.body.workoutExercises[0].exerciseId).toBe(exerciseId);

        workoutId = response.body.id;
        endTestTimer('create-workout');
    });

    test('Get current user profile with workouts', async () => {
        startTestTimer('get-me');
        const response = await request(app)
            .get('/users/me')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', userId);
        expect(response.body).toHaveProperty('workouts');
        expect(Array.isArray(response.body.workouts)).toBe(true);
        expect(response.body.workouts.length).toBeGreaterThan(0);

        const foundWorkout = response.body.workouts.find(w => w.id === workoutId);
        expect(foundWorkout).toBeDefined();

        endTestTimer('get-me');
    });

    test('Get all exercises', async () => {
        startTestTimer('get-all-exercises');
        const response = await request(app)
            .get('/exercises')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        const foundExercise = response.body.find(e => e.id === exerciseId);
        expect(foundExercise).toBeDefined();
        expect(foundExercise.id).toBe(exerciseId);

        endTestTimer('get-all-exercises');
    });

    test('Get specific workout details', async () => {
        startTestTimer('get-workout');
        const response = await request(app)
            .get(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', workoutId);
        expect(response.body).toHaveProperty('workoutExercises');
        expect(Array.isArray(response.body.workoutExercises)).toBe(true);
        expect(response.body.workoutExercises.length).toBeGreaterThan(0);

        const exerciseInWorkout = response.body.workoutExercises[0].exercise;
        expect(exerciseInWorkout).toHaveProperty('id', exerciseId);

        endTestTimer('get-workout');
    });

    test('Update the workout', async () => {
        startTestTimer('update-workout');
        const updatedWorkoutData = {
            name: 'Updated Workout ' + Date.now(),
            description: 'Updated workout description',
            exercises: [
                {
                    exerciseId: exerciseId,
                    sets: 4,
                    repetitions: '8-10',
                    weight: 5,
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

        endTestTimer('update-workout');
    });

    test('Get all workouts for user', async () => {
        startTestTimer('get-all-user-workouts');
        const response = await request(app)
            .get(`/users/${userId}/workouts`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);

        const foundWorkout = response.body.find(w => w.id === workoutId);
        expect(foundWorkout).toBeDefined();

        endTestTimer('get-all-user-workouts');
    });

    test('Delete the workout', async () => {
        startTestTimer('delete-workout');
        const response = await request(app)
            .delete(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        const checkResponse = await request(app)
            .get(`/workouts/${workoutId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(checkResponse.status).toBe(404);

        endTestTimer('delete-workout');
    });

    test('Delete the exercise', async () => {
        startTestTimer('delete-exercise');
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
        endTestTimer('delete-exercise');
    });

    test('Delete the user', async () => {
        startTestTimer('delete-user');
        const response = await request(app)
            .delete(`/users/${userId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(204);

        // Verify user deletion
        const checkResponse = await request(app)
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${authToken}`);

        expect(checkResponse.status).toBe(404);
        // Set userId to null in case afterAll
        userId = null;
        endTestTimer('delete-user');
    });
});