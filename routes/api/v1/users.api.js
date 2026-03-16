
const express = require('express');
const router = express.Router();
const userService = require('../../../services/user.service');
const apiAuth = require('../../../middleware/apiAuth');

/**
 * @route GET /api/v1/me
 * @desc  Retrieve current authenticated user's profile
 * @access Private
 */
router.get('/me', apiAuth, async (req, res) => {
  try {
    // Passport attaches the user to req.user
    const profile = await userService.getProfile(req.user.id);
    console.log("PROFILE:" , profile);
    if (!profile) {
      return res.status(404).json({
        success: false,
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'User profile could not be found' }
      });
    }

    res.status(200).json({
      success: true,
      data: profile,
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'FETCH_ERROR', message: error.message }
    });
  }
});

/**
 * @route PATCH /api/v1/me
 * @desc  Update current authenticated user's profile
 * @access Private
 */
router.patch('/me', apiAuth, async (req, res) => {
  const { name, email } = req.body;

  if (!name && !email) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'At least one field (name, email) must be provided for update' }
    });
  }

  try {
    const updatedProfile = await userService.updateProfile(req.user.id, { name, email });
    
    res.status(200).json({
      success: true,
      data: {
        user: updatedProfile,
        message: 'Profile updated successfully'
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'UPDATE_ERROR', message: error.message }
    });
  }
});

/**
 * @route GET /api/v1/users/social/instagram/start
 */
router.get('/social/instagram/start', apiAuth, async (req, res) => {
  try {
    const authUrl = userService.generateInstagramAuthUrl(req.user);
    console.log('authUrl:' , authUrl)
    res.json({
      success: true,
      data: { authUrl },
      error: null
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      data: null,
      error: { message: err.message }
    });
  }
});

/**
 * @route GET /api/v1/users/social/instagram/callback
 */
router.get('/social/instagram/callback', async (req, res) => {
  const { code, state } = req.query;
  console.log("code , state :",req.query)

  if (!code || !state) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { message: 'Missing code or state' }
    });
  }

  try {
    const result = await userService.handleInstagramCallback(code, state);

    // Redirect to mobile deep link
    const mobileRedirect = `tajertrust://instagram-verified?username=${result.username}`;
    return res.redirect(mobileRedirect);
     

  } catch (err) {
    console.error(err);
    
     if (err.message === 'SOCIAL_LINK_MISMATCH') {
      return res.redirect(
        `tajertrust://instagram-verified?error=MISMATCH&instagram_username=${err.instagramUsername}`
      );
    }
    

    return res.redirect(`tajertrust://instagram-verified?error=true`);
  }
});


/**
 * @route PUT /api/v1/users/me/social
 */
router.put('/me/social', apiAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {socialLink}  = req.body;
    console.log("socialLink: ",socialLink);

    if (/*!socialPlatform ||*/ !socialLink) {
      return res.status(400).json({
        success: false,
        message: 'Missing social data'
      });
    }

    const result = await userService.updateSocial(
      userId,
      socialLink
    );


    // if (!result.success) {
    //   return res.status(400).json({
    //     success: false,
    //     message: result.error
    //   });
    // }

    return res.status(200).json({
      success: true,
      data: result.data,
      error: null
    });

  } catch (error) {
    console.error('users.api update social error:', error);
     // 🔥 HANDLE UNIQUE CONSTRAINT
    if (error.code === '23505' && error.constraint === 'unique_social') {
      return res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'SOCIAL_LINK_ALREADY_EXISTS',
          message: 'This social link is already used by another seller.'
        }
      });
    }

    return res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'UPDATE_SOCIAL_FAILED',
        message: 'Failed to update social link.'
      }
    });
  }
});

module.exports = router;
