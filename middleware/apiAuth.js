
const jwt = require('jsonwebtoken');
const securityService = require('../services/security.service');

module.exports = async function(req, res, next) {
  // 1. JWT Authentication (Stateless - Mobile Preferred)
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      req.authMethod = 'JWT';
      return next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: 'INVALID_TOKEN', message: 'Your session has expired. Please log in again.' }
      });
    }
  }

  // 2. API Key Authentication (System Integration)
  const apiKey = req.headers['x-api-key'];
  if (apiKey) {
    const keyData = await securityService.validateApiKey(apiKey);
    if (keyData) {
      req.authMethod = 'API_KEY';
      req.user = keyData;
      return next();
    }
    return res.status(401).json({
      success: false,
      data: null,
      error: { code: 'INVALID_API_KEY', message: 'Access denied: Invalid API Key' }
    });
  }

  // 3. Session Authentication (Web Compatibility)
  if (req.isAuthenticated && req.isAuthenticated()) {
    req.authMethod = 'SESSION';
    return next();
  }
  
  // 4. Fallback
  res.status(401).json({
    success: false,
    data: null,
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Use Bearer Token or API Key.'
    }
  });
};
