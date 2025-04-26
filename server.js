/**
 * Main server application file for the Fitness Tracker API
 * Sets up Express server with middleware, routes, and database connection
 */

// Third-party dependencies
const express = require('express');
const {PrismaClient} = require('./generated/prisma');
const cors = require('cors');
require('dotenv').config();

// Route handlers
const usersRouter = require('./routes/users');
const exercisesRouter = require('./routes/exercises');
const workoutsRouter = require('./routes/workouts');
const authRouter = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Verify required environment variables
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET environment variable must be set for authentication to work');
  process.exit(1);
}

// Configure CORS middleware
const corsOptions = {
  origin: [...(process.env.ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',')],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Parse JSON payloads
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Fitness Tracker API with Prisma is running!');
});

// Register route handlers
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/exercises', exercisesRouter);
app.use('/', workoutsRouter);


// Start server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('Disconnected from database');
});

// Export for testing
module.exports = app;