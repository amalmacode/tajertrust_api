
const express = require('express');
const router = express.Router();
const authService = require('../../../services/auth.service');
const apiAuth = require('../../../middleware/apiAuth');

/**
 * @route POST /api/v1/auth/login
 * @desc  Authenticates a user and returns a stateless JWT token
 * @access Public
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: 'MISSING_CREDENTIALS', message: 'Email and password are required' }
    });
  }

  try {
    const { user, token } = await authService.login(email, password);

    res.status(200).json({
      success: true,
      data: {
        token: token,
        user: {
            id: user.id,
            email: user.email,
            businessName: user.business_name,
            is_email_verified: user.is_email_verified,
            is_social_verified: user.is_social_verified,
            is_validated: user.is_validated,
            social_link: user.social_link,
            role: user.role,
            status: user.status
        },
        message: 'Login successful'
      },
      error: null
    });
  } catch (error) {
    let statusCode = 401;
    let errorCode = 'AUTH_FAILED';

    if (error.message.includes('PENDING')) {
      statusCode = 403;
      errorCode = 'ACCESS_LOCKED';
    }

    res.status(statusCode).json({
      success: false,
      data: null,
      error: { code: errorCode, message: error.message }
    });
  }
});

/**
 * @route POST /api/v1/auth/register
 * @desc  Registers a new seller into pending_registrations
 * @access Public
 */
router.post('/register', async (req, res) => {
  const { email, password, business_name, social_link } = req.body;

  if (!email || !password || !business_name) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { 
        code: 'MISSING_REQUIRED_FIELDS', 
        message: 'Email, password, and business name are required' 
      }
    });
  }

  try {
    const newUser = await authService.register({
      email,
      password,
      business_name,
      social_link,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        message: 'Registration successful. Please wait for admin validation.'
      },
      error: null
    });
  } catch (error) {
    const isConflict = error.message === 'EMAIL_ALREADY_EXISTS';
    res.status(isConflict ? 409 : 400).json({
      success: false,
      data: null,
      error: { 
        code: isConflict ? 'CONFLICT' : 'REGISTRATION_ERROR', 
        message: error.message 
      }
    });
  }
});

/**
 * @route POST /api/v1/auth/logout
 * @desc  Terminates session (for web compatibility) or confirms stateless logout
 * @access Private
 */
router.post('/logout', apiAuth, (req, res) => {
  if (req.authMethod === 'SESSION') {
    // Passport session logout
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          data: null,
          error: { code: 'LOGOUT_ERROR', message: 'Internal server error during logout' }
        });
      }
      return res.json({
        success: true,
        data: { message: 'Session terminated successfully' },
        error: null
      });
    });
  } else {
    // Stateless logout (JWT/API Key)
    // Server acknowledges request; client is responsible for deleting the token.
    res.json({
      success: true,
      data: { 
        message: 'Logout successful. Please delete your local credentials.',
        method: req.authMethod
      },
      error: null
    });
  }
});

/**
 * @route GET /api/v1/auth/me
 * @desc  Verify token and return current seller identity
 * @access Private
 */
router.get('/me', apiAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role || 'USER'
      },
      authMethod: req.authMethod
    },
    error: null
  });
});


router.get('/verify-email', async (req, res) => {
  const { token } = req.query;

  try {
    await authService.verifyEmailToken(token);

    return res.redirect('tajertrust://verified?success=true');


  } catch (error) {
    console.error('Verification error:', error.message);

    return res.redirect('tajertrust://verified?success=false');
  }
});


module.exports = router;
