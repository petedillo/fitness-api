const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Registers a new user with the provided credentials
 * @param {Object} req - Express request object containing username, email, and password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with user data and authentication token
 */
exports.register = async (req, res) => {
  try {
    const {username, email, password} = req.body;

    // Input validation
    if (!username || !email || !password) {
      return res.status(400).json({error: 'Username, email, and password are required'});
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      }
    });

    // Generate JWT
    const token = jwt.sign(
        {userId: newUser.id},
        process.env.JWT_SECRET,
        {expiresIn: '24h'}
    );

    res.status(201).json({
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'A user with this username or email already exists'
      });
    }

    res.status(500).json({error: 'Failed to register user'});
  }
};

/**
 * Authenticates user credentials and provides a JWT token
 * @param {Object} req - Express request object containing email and password
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with user data and authentication token
 */
exports.login = async (req, res) => {
  try {
    const {email, password} = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({error: 'Email and password are required'});
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {email},
    });

    if (!user) {
      return res.status(401).json({error: 'Invalid credentials'});
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({error: 'Invalid credentials'});
    }

    // Generate JWT
    const token = jwt.sign(
        {userId: user.id},
        process.env.JWT_SECRET,
        {expiresIn: '24h'}
    );

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({error: 'Failed to log in'});
  }
};

/**
 * Retrieves the profile of the currently authenticated user
 * @param {Object} req - Express request object with authenticated user data
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with user profile data
 */
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        workouts: true
      }
    });

    if (!user) {
      return res.status(404).json({error: 'User not found'});
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({error: 'Failed to fetch user profile'});
  }
};

/**
 * Creates a new user in the database
 * @param {Object} req - Express request object with user data
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with created user data
 */
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

/**
 * Retrieves all users from the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with array of users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      }
    });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({error: 'Failed to fetch users'});
  }
};

/**
 * Retrieves a specific user by their ID
 * @param {Object} req - Express request object with user ID parameter
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with user data
 */
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

/**
 * Updates user information by ID
 * @param {Object} req - Express request object with user ID parameter and update data
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - JSON response with updated user data
 */
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

/**
 * Deletes a user by their ID
 * @param {Object} req - Express request object with user ID parameter
 * @param {Object} res - Express response object
 * @returns {Promise<void>} - Empty response with 204 status on success
 */
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