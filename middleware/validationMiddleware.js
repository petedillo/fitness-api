exports.validateExercise = (req, res, next) => {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ 
      error: 'Exercise name is required and must be a non-empty string' 
    });
  }

  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ 
      error: 'Description must be a string if provided' 
    });
  }

  next();
};

exports.validateUser = (req, res, next) => {
  const { username, email, passwordHash } = req.body;

  if (!username || !email || !passwordHash) {
    return res.status(400).json({
      error: 'Username, email, and password are required'
    });
  }

  next();
};