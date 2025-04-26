const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const {verifyToken} = require('../middleware/auth');

router.get('/me', verifyToken, usersController.getCurrentUser);

// CRUD routes - protected by authentication
router.post('/', verifyToken, usersController.createUser);
router.get('/', verifyToken, usersController.getAllUsers);
router.get('/:id', verifyToken, usersController.getUserById);
router.put('/:id', verifyToken, usersController.updateUser);
router.delete('/:id', verifyToken, usersController.deleteUser);

module.exports = router;