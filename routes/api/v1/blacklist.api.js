const express = require('express');
const router = express.Router();
const blacklistService = require('../../../services/blacklist.service');
const apiAuth = require('../../../middleware/apiAuth');

/**
 * @route GET /api/v1/blacklist
 * @desc  Retrieve list of blacklisted phone numbers
 * @access Private (Sellers/Admins)
 */
router.get('/', apiAuth, async (req, res) => {
  try {
    const blacklist = await blacklistService.getAll();
    
    res.status(200).json({
      success: true,
      data: {
        items: blacklist,
        count: blacklist.length
      },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to retrieve blacklist data: ' + error.message
      }
    });
  }
});

/**
 * @route POST /api/v1/blacklist
 * @desc  Report a phone number to the blacklist
 * @access Private (Sellers/Admins)
 */
router.post('/', apiAuth, async (req, res) => {
  const { phone, reason } = req.body;

  if (!phone) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: 'MISSING_PHONE', message: 'Phone number is required' }
    });
  }

  try {
    // Use req.user.email or id for the reporter identity
    // const reporter = req.user ? (req.user.name || req.user.email) : 'API_CLIENT';
    const reporter = req.user ? req.user.id : 'API_CLIENT';

    const newEntry = await blacklistService.add(phone, reason, reporter);

    res.status(201).json({
      success: true,
      data: newEntry,
      error: null
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      data: null,
      error: {
        code: error.message === 'INVALID_PHONE_FORMAT' ? 'INVALID_PHONE' : 'CREATE_ERROR',
        message: error.message
      }
    });
  }
});


/**
 * @route DELETE /api/v1/blacklist/myBlacklist
 * @desc  Remove the whole blacklist for a seller
 * @access Private (validated sellers )
 */
router.delete('/myBlacklist', apiAuth, async (req, res) => {
  
  try {
   
    const sellerId = req.user.id;
    console.log("USER ID  to DELETE A LIST FOR : ", sellerId);
    const result = await blacklistService.deleteMyBlacklist(sellerId);


    console.log("deleted Count :", result.deletedCount);
    return res.json({
      success: true,
      deletedCount : result.deletedCount
    });

  } catch (error) {
    console.error('DELETE /blacklist/myBlacklist error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to delete blacklist'
    });
  }
});

/**
 * @route DELETE /api/v1/blacklist/:id
 * @desc  Remove a phone number from the blacklist
 * @access Private (Sellers/Admins)
 */
router.delete('/:id', apiAuth, async (req, res) => {
  const { id } = req.params;
  const sellerId = req.user.id;
  console.log("Entry ID, SELLERID: ",id,sellerId);
  try {
    await blacklistService.remove(id, sellerId);
    
    res.status(200).json({
      success: true,
      data: {
        message: `Blacklist entry ${id} successfully removed`,
        id: id
      },
      error: null
    });
  } catch (error) {
    res.status(error.message === 'ENTRY_NOT_FOUND' ? 404 : 500).json({
      success: false,
      data: null,
      error: {
        code: error.message === 'ENTRY_NOT_FOUND' ? 'NOT_FOUND' : 'DELETE_ERROR',
        message: error.message
      }
    });
  }
});



/**
 * @route GET /api/v1/blacklist/update
 * @desc  update blacklisted phone : reason , number
 */

// router.put('/:id', apiAuth, async (req, res) => {
//   const { id } = req.params;
//   const { phone, reason } = req.body;
  
//   if (!phone || !reason) {
//     return res.status(400).json({
//       success: false,
//       data: null,
//       error: {
//         code: 'MISSING_FIELDS',
//         message: 'Phone and reason are required'
//       }
//     });
//   }

//   try {

//     const sellerId = req.user.id;

//     const updated = await blacklistService.update(
//       id,
//       sellerId,
//       phone,
//       reason
//     );

//     res.status(200).json({
//       success: true,
//       data: updated,
//       error: null
//     });

//   } catch (error) {
//     res.status(400).json({
//       success: false,
//       data: null,
//       error: {
//         code: error.message,
//         message: error.message
//       }
//     });
//   }
// });

router.put('/:id', apiAuth, async (req, res) => {
  const { id } = req.params;
  const { phone, reason } = req.body;

      // At least one field required
      if (!phone && !reason) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'MISSING_FIELDS', message: 'At least phone or reason is required' }
        });
      }

      try {
        const updated = await blacklistService.update(id, req.user.id, phone, reason);
        return res.status(200).json({ success: true, data: updated, error: null });
      } catch (error) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: error.message, message: error.message }
    });
  }
});
/**
 * @route GET /api/v1/blacklist/check
 * @desc  Check if a specific phone is blacklisted
 */
router.get('/check', apiAuth, async (req, res) => {
  const { phone } = req.query;
  
  if (!phone) {
    return res.status(400).json({
      success: false,
      data: null,
      error: { code: 'MISSING_PARAM', message: 'Phone number is required' }
    });
  }

  try {
    const result = await blacklistService.check(phone);
    res.status(200).json({
      success: true,
      // data: {
      //   isBlacklisted: !!record,
      //   details: record || null
      // },
      data : result,
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: { code: 'CHECK_ERROR', message: error.message }
    });
  }
});

/**
 * @route GET /api/v1/blacklist/bulk
 * @desc  synchronize a blacklist of phones at once by a seller
 */
router.post('/bulk', apiAuth, async (req, res) => {
  const user = req.user;
  console.log("USER FROM API:" , user);

  if (!user.is_validated || !user.is_social_verified) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const entries = req.body.entries;
 
  try {
    const inserted = await blacklistService.bulkAdd(entries, user.id);
    console.log("inserted in API IMPORT :", inserted);
    res.json({
      success: true,
      // insertedCount: inserted.length
      data: inserted.map(entry => ({
            phone: entry.phone,
            id: entry.id,
            reason: entry.reason
          }))
    });

    
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk insert failed' });
  }
});

/**
 * @route GET /api/v1/blacklist/mine
 * @desc  blacklist a list of phones at once by a seller
 */

router.get('/mine', apiAuth, async (req, res) => {
  try {
    const entries = await blacklistService.findBlackListByUserId(req.user.id);
     
    console.log('entries of the seller connected on MINE:',entries);
    res.json({
      success: true,
      data: entries
    });

  } catch (err) {
    res.status(500).json({ success: false });
  }
});



module.exports = router;
