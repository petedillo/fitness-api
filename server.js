const express = require('express');
const { PrismaClient } = require('./generated/prisma');
const app = express();
const port = 3000;
require('dotenv').config();
const prisma = new PrismaClient();

app.use(express.json()); 

app.get('/', (req, res) => {
  res.send('Fitness Tracker API with Prisma is running!');
});

app.post('/users', async (req, res) => {
  try {
    const newUser = await prisma.user.create({
      data: {
        username: req.body.username,
        email: req.body.email,
        passwordHash: req.body.passwordHash,
      },
    });
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    await prisma.$disconnect();
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// Optional: Disconnect Prisma Client on shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});