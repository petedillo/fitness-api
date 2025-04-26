const express = require('express');
const { PrismaClient } = require('./generated/prisma');
require('dotenv').config();

const usersRouter = require('./routes/users');
const exercisesRouter = require('./routes/exercises');
const workoutsRouter = require('./routes/workouts');

const app = express();
const port = 3000;
const prisma = new PrismaClient();

app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Fitness Tracker API with Prisma is running!');
});

app.use('/users', usersRouter);
app.use('/exercises', exercisesRouter);
app.use('/', workoutsRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = app;