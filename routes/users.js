const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

// CREATE - Create a new user
router.post('/', usersController.createUser);

// READ - Get all users
router.get('/', usersController.getAllUsers);

// READ - Get a specific user by ID
router.get('/:id', usersController.getUserById);

// UPDATE - Update a user
router.put('/:id', usersController.updateUser);

// DELETE - Delete a user
router.delete('/:id', usersController.deleteUser);

module.exports = router;