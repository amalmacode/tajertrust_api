
const express = require('express');
const router = express.Router();
const securityService = require('../../../services/security.service');
const apiAuth = require('../../../middleware/apiAuth');

// All key management routes require authentication
router.use(apiAuth);

/**
 * @route GET /api/v1/keys
 * @desc  List all active API keys for the current user
 * @access Private
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : 'system';
    const keys = await securityService.listUserKeys(userId);
    
    res.status(200).json({
      success: true,
      data: { keys },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'FETCH_KEYS_ERROR', message: error.message }
    });
  }
});

/**
 * @route POST /api/v1/keys
 * @desc  Generate a new API key
 * @access Private
 */
router.post('/', async (req, res) => {
  const { label } = req.body;
  
  try {
    const userId = req.user ? req.user.id : 'system';
    const newKeyRecord = await securityService.generateNewKey(userId, label);
    
    res.status(201).json({
      success: true,
      data: {
        ...newKeyRecord,
        warning: 'This key will only be displayed once. Store it securely.'
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'KEY_GEN_ERROR', message: error.message }
    });
  }
});

/**
 * @route DELETE /api/v1/keys/:id
 * @desc  Revoke an existing API key
 * @access Private
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const userId = req.user ? req.user.id : 'system';
    await securityService.revokeKey(id, userId);
    
    res.status(200).json({
      success: true,
      data: { message: `API Key ${id} revoked successfully` },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'KEY_REVOKE_ERROR', message: error.message }
    });
  }
});

module.exports = router;
