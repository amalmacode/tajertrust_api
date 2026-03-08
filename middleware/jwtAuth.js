
const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware
 * 
 * Specifically designed for stateless mobile app requests.
 * Expects header: Authorization: Bearer <token>
 */
module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  // Check for Bearer token in the Authorization header
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      error: { 
        code: 'UNAUTHORIZED', 
        message: 'Authentication token is missing. Please provide a Bearer token.' 
      }
    });
  }

  try {
    // Verify the token using the system JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user identity to the request object
    // decoded usually contains { id, email, role }
    req.user = decoded;
    
    next();
  } catch (error) {
    let message = 'Invalid or expired token';
    let code = 'INVALID_TOKEN';

    if (error.name === 'TokenExpiredError') {
      message = 'Your session has expired. Please log in again.';
      code = 'EXPIRED_TOKEN';
    }

    return res.status(403).json({
      success: false,
      data: null,
      error: { code, message }
    });
  }
};
