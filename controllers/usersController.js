const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

// CREATE - Already implemented
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

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'A user with this username or email already exists'
      });
    }
    
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// READ (all users)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        // Removed updatedAt as it doesn't exist in the User model
        // Exclude passwordHash for security reasons
      }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({error: 'Failed to fetch users'});
  }
};

// READ (single user)
exports.getUserById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({error: 'Invalid user ID'});
    }

    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        // Removed updatedAt as it doesn't exist in the User model
        workouts: true
      }
    });

    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({error: 'Failed to fetch user'});
  }
};

// UPDATE
exports.updateUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const {username, email} = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({error: 'Invalid user ID'});
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {id: userId}
    });

    if (!existingUser) {
      return res.status(404).json({error: 'User not found'});
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: {id: userId},
      data: {
        username: username !== undefined ? username : existingUser.username,
        email: email !== undefined ? email : existingUser.email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        // Removed updatedAt as it doesn't exist in the User model
      }
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Username or email already in use by another user'
      });
    }

    res.status(500).json({error: 'Failed to update user'});
  }
};

// DELETE
exports.deleteUser = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      return res.status(400).json({error: 'Invalid user ID'});
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: {id: userId}
    });

    if (!existingUser) {
      return res.status(404).json({error: 'User not found'});
    }

    // Delete user
    await prisma.user.delete({
      where: {id: userId}
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Cannot delete user with associated workouts. Delete workouts first.'
      });
    }

    res.status(500).json({error: 'Failed to delete user'});
  }
};