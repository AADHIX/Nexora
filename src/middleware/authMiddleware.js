const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  // Retrieve token from cookie or Authorization header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token || token === 'none') {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route: Session missing' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user details
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User account not found' });
    }

    // Attach user information to request object
    req.user = {
      id: user._id,
      role: user.role,
      doctorId: user.doctorId,
    };
    next();
  } catch (error) {
    logger.error('JWT Verification failed: ', error.message);
    return res.status(401).json({ success: false, error: 'Session expired or invalid token' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user.role}' is not authorized to access this resource`,
      });
    }
    next();
  };
};
