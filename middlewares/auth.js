const pool = require('../db');
const multer = require('multer');
const path = require('path');

// Set storage engine
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // make sure this folder exists!
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

// File filter (optional)
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only images are allowed'), false);
  }
  cb(null, true);
};

const upload = multer({ storage, fileFilter });
// voir si le seller s'est connecté
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated() || req.session.user) {
        return next();
    }
    req.flash('error', 'Veuillez vous connecter pour accéder à cette page.');
    res.redirect('/login');
}
  
  // s'assurer du fait que le seller est verifié
  function ensureVerifiedSeller(req, res, next) {
    if (req.isAuthenticated() && req.user.is_verified) {
      return next();
    }
    req.flash('error', 'Votre compte n\'a pas encore été vérifié par l\'administrateur.');
    res.redirect('/login');
  }
  
  // s'assurer que l'user un administrateur
  const ensureAdmin = async (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.redirect('/login');
    }
    console.log('Checking admin with email:', req.user.email); // log this

    const admin = await pool.query('SELECT * FROM admins WHERE LOWER(email) = $1', [req.user.email]);
    console.log('Admin found:', admin.rows);
    if (admin.rows.length === 0) {
      req.flash('error', 'Accès réservé aux administrateurs.');
      return res.redirect('/login');
    }
  
    next();
  };
  

  const setAdminFlag = async (req, res, next) => {
    if (req.isAuthenticated()) {
      try {
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [req.user.email]);
        res.locals.isAdmin = result.rows.length > 0;
      } catch (err) {
        console.error('Error checking admin status:', err);
        res.locals.isAdmin = false;
      }
    } else {
      res.locals.isAdmin = false;
    }
    next();
  };
  module.exports = { 
    ensureAuthenticated, 
    ensureVerifiedSeller,
    ensureAdmin,
    setAdminFlag,
    upload
   };
  