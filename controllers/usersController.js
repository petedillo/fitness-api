const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

exports.createUser = async (req, res) => {
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
  }
};