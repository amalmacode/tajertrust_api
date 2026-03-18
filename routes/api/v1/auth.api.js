
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

//  Verify Email GET
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  const userAgent = req.headers['user-agent'] || '';
  const isMobile = /android|iphone|ipad/i.test(userAgent);

  try {
    await authService.verifyEmailToken(token);

    if (isMobile) {
      return res.redirect('tajertrust://verified?success=true');
    }

    // Browser fallback — nice success page
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Email Verified - TajerTrust</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, sans-serif; background: #f0f4ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: white; border-radius: 16px; padding: 48px 40px; text-align: center; max-width: 420px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .icon { font-size: 64px; margin-bottom: 24px; }
            h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 12px; }
            p { color: #666; line-height: 1.6; margin-bottom: 32px; }
            .btn { display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
            .btn:hover { background: #1d4ed8; }
          </style>
          <script>
            // Try to open the app automatically
            window.location.href = 'tajertrust://verified?success=true';
          </script>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>Email Verified!</h1>
            <p>Your TajerTrust account is now active. You can close this window and log in to the app.</p>
            <a href="tajertrust://verified?success=true" class="btn">Open TajerTrust App</a>
          </div>
        </body>
      </html>
    `);

  } catch (error) {
    if (isMobile) {
      return res.redirect('tajertrust://verified?success=false');
    }

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Verification Failed - TajerTrust</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, sans-serif; background: #f0f4ff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: white; border-radius: 16px; padding: 48px 40px; text-align: center; max-width: 420px; width: 90%; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
            .icon { font-size: 64px; margin-bottom: 24px; }
            h1 { color: #1a1a2e; font-size: 24px; margin-bottom: 12px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">❌</div>
            <h1>Verification Failed</h1>
            <p>This link may have already been used or has expired. Please register again or contact support.</p>
          </div>
        </body>
      </html>
    `);
  }
});


// Forgot Password - POST
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    await authService.forgotPassword(email);
    return res.json({ success: true, data: null, error: null });
  } catch (err) {
    return res.status(500).json({ success: false, data: null, error: { message: err.message } });
  }
});

// Redirect deep link to app
router.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  return res.redirect(`tajertrust://reset-password?token=${token}`);
});

// Reset Password - POST
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    await authService.resetPassword(token, password);
    return res.json({ success: true, data: null, error: null });
  } catch (err) {
    return res.status(400).json({ success: false, data: null, error: { code: err.message, message: err.message } });
  }
});



module.exports = router;
