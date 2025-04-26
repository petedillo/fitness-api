import { PrismaClient } from '../generated/prisma';
import { endTestTimer, startTestTimer } from './testTimerUtil.js';
import { describe, expect, test, afterAll } from 'vitest';
import request from "supertest";
import app from "../server";

const prisma = new PrismaClient();

describe('User Authentication Flow', () => {
    test('Register and immediately log in as a new user (checks happy-path registration/login)', async () => {
        startTestTimer('register-login');
        // Create unique user data for this test to avoid conflicts
        const uniqueSuffix = Date.now();
        const newUser = {
            username: `autheduser${uniqueSuffix}`,
            email: `authed${uniqueSuffix}@example.com`,
            password: 'TestPassw0rd!'
        };

        // Register the new user
        const registerRes = await request(app)
            .post('/auth/register')
            .send(newUser);

        expect(registerRes.status).toBe(201);
        expect(registerRes.body).toHaveProperty('token');
        expect(registerRes.body.user).toHaveProperty('email', newUser.email);

        // Now log in with the same credentials
        const loginRes = await request(app)
            .post('/auth/login')
            .send({ email: newUser.email, password: newUser.password });

        expect(loginRes.status).toBe(200);
        expect(loginRes.body).toHaveProperty('token');
        expect(loginRes.body.user).toHaveProperty('username', newUser.username);

        // Clean up: delete this user from DB to prevent test pollution
        const createdUserId = registerRes.body.user.id;
        if (createdUserId) {
            await prisma.user.delete({ where: { id: createdUserId } });
        }

        endTestTimer('register-login');
    });
});

afterAll(async () => {
    await prisma.$disconnect();
});