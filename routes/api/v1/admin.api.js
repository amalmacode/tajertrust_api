
const express = require('express');
const router = express.Router();
const adminService = require('../../../services/admin.service');
const apiAuth = require('../../../middleware/apiAuth');

/**
 * Middleware to ensure only admins can access these endpoints.
 */

// Apply multi-method authentication to all admin routes
router.use(apiAuth);

const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    return next();
  }
  return res.status(403).json({
    success: false,
    data: null,
    error: { 
      code: 'FORBIDDEN_ACCESS', 
      message: 'This operation requires administrator privileges' 
    }
  });
};

/**
 * Middleware to ensure only super admins can access these endpoints.
 */
const isSuperAdmin = (req, res, next) => {

  if (req.user && req.user.role === 'super_admin') {
    console.log('passed')
    return next();
  }
 
  return res.status(403).json({
    success: false,
    data: null,
    error: { 
      code: 'SUPER_ADMIN_REQUIRED', 
      message: 'This operation requires super administrator privileges' 
    }
  });
};


router.patch('/users/:id/role', isSuperAdmin, async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const updated = await adminService.updateUserRole(id, role);
    res.json({
      success: true,
      data: updated,
      error: null
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: null,
      error: { message: err.message }
    });
  }
});

/**
 * @route GET /api/v1/admin/users
 * @desc  List all users for admin review
 * @access Admin
 */
router.get('/users', isAdmin, async (req, res) => {
  try {
    const users = await adminService.getUsers(req.user);
    console.log('users :',users)
    res.status(200).json({
      success: true,
      data: { 
        users: users,
        total: users.length
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { 
        code: 'ADMIN_FETCH_ERROR', 
        message: 'Failed to retrieve user list: ' + error.message 
      }
    });
  }
});

/**
 * @route POST /api/v1/admin/users/:id/validation
 * @desc  Verify a user account
 * @access Admin
 */

router.patch('/users/:id/validation', isAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_validated } = req.body;

  if (typeof is_validated !== 'boolean') {
    return res.status(400).json({
      success: false,
      data: null,
      error: { message: 'is_validated must be boolean' }
    });
  }

  try {
    const updated = await adminService.updateValidation(id, is_validated, req.user.id);
    res.json({
      success: true,
      data: updated,
      error: null
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: null,
      error: { message: err.message }
    });
  }
});

/**
 * @route POST /api/v1/admin/users/bulk-validation
 * @desc  Verify a user account
 * @access Admin
 */

router.patch('/users/bulk-validation', isAdmin, async (req, res) => {
  const { userIds, is_validated } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { message: 'userIds must be a non-empty array' }
    });
  }

  if (typeof is_validated !== 'boolean') {
    return res.status(400).json({
      success: false,
      data: null,
      error: { message: 'is_validated must be boolean' }
    });
  }

  try {
    const updatedUsers = await adminService.bulkUpdateValidation(
      userIds,
      is_validated,
      req.user.id
    );

    res.json({
      success: true,
      data: updatedUsers,
      error: null
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      data: null,
      error: { message: err.message }
    });
  }
});

/**
 * @route DELETE /api/v1/admin/users/id
 * @desc   delete user and related data
 * @access Super Admin
 */
router.delete('/users/:id', isSuperAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await adminService.deleteUser(id, req.user.email, 'Manual deletion');
    res.json({
      success: true,
      data: result,
      error: null
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      data: null,
      error: { message: err.message }
    });
  }
});


/**
 * @route DELETE /api/v1/admin/users/bulk
 * @desc  Bulk delete users and related data
 * @access Super Admin
 */
router.post('/users/bulk-delete', isSuperAdmin, async (req, res) => {
  const { userIds } = req.body;
  const adminEmail = req.user.email;

  console.log('Ids:', userIds);
   console.log('adminEmail',adminEmail);
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: 'INVALID_INPUT', message: 'userIds array is required' }
    });
  }

  try {
    const results = [];
    for (const id of userIds) {
      try {
        const deleted = await adminService.deleteUser(id,adminEmail);
        results.push({ id, status: 'deleted', email: deleted.email });
      } catch (err) {
        results.push({ id, status: 'error', message: err.message });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        results,
        message: 'Bulk deletion process completed'
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'BULK_DELETE_ERROR', message: error.message }
    });
  }
});

module.exports = router;
