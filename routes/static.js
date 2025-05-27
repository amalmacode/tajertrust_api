const express = require('express');
const router = express.Router();

router.get('/terms', (req, res) => {
  res.render('terms',{
    title: 'TajerTrust - terms',
    user: req.user,
    currentPath: req.path,
    layout:false
  });
});

router.get('/privacy', (req, res) => {
  res.render('privacy',{
    user: req.user,
    currentPath: req.path,
    layout:false
  });
  });


module.exports = router;


 
    
