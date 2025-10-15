const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { ensureAuthenticated,upload } = require('../middlewares/auth');
const { ensureAdmin } = require('../middlewares/auth');
const passport = require('passport');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const puppeteer = require('puppeteer');

const axios = require('axios');
const cheerio = require('cheerio'); // for scraping

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/'); // your upload directory
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // get original file extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, uniqueName);
  }
});

const uploadCsv = multer({ storage: storage });

 // Send confirmation email
 const transporter = nodemailer.createTransport({
  service: 'gmail', // or your provider
  auth: {
    user: 'amaldotrading@gmail.com',
    pass: 'yszy wsfr dhyb sbaa'  // Use app password for Gmail
  },
  tls: {
    rejectUnauthorized: false // Accept self-signed certificates
  }
});

// Facebook App Configuration
const FACEBOOK_CONFIG = {
    APP_ID: process.env.FACEBOOK_APP_ID,
    APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    REDIRECT_URI: process.env.FACEBOOK_REDIRECT_URI || 'https://tajertrust.com/auth/instagram/callback',
    LOGIN_REDIRECT_URI : process.env.FACEBOOK_LOGIN_REDIRECT_URI || 'https://tajertrust.com/auth/instagram/login-callback'
};
// Show login/register pages
// GET login page
router.get('/login', (req, res) => {
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
   // If user is already logged in, redirect to check page
  if (currentUser && currentUser.id) {
    req.flash('info', 'Vous êtes déjà connecté.');
    return res.redirect('/check');
  }

  // If not logged in, show login page
  res.render('login', {
    title: 'Login - TajerTrust',
    messages: {
      error: req.flash('error'),
      success: req.flash('success')
    },
    currentPath: req.path
  });
});

// GET REGISTER
router.get('/register', (req, res) => {
   // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  // If user is already logged in, redirect to check page
  if (currentUser && currentUser.id) {
    req.flash('info', 'Vous êtes déjà connecté.');
    return res.redirect('/check');
  }

  res.render('register', {
  messages: {
    success: req.flash('success'),
    error: req.flash('error')
  },
  title: 'Register - TajerTrust',
  layout: 'layout',
  currentPath: req.path // Not required, but explicit
 });
});

// POST Register
router.post('/register', async (req, res) => {
  const { business_name, email, password, confirmPassword} = req.body;
  let { social_link, website} = req.body;
 
  try {
     // Check if social_link exists
     if (!social_link || social_link.trim() === '') {
      req.flash('error', "Le lien vers votre compte social est obligatoire.");
      return res.redirect('/register');
    }

    social_link = social_link.trim();

    // Accept @username or full URLs — transform if necessary
    if (social_link.startsWith('@')) {
      // Convert @username to a full Instagram link by default
      social_link = `https://www.instagram.com/${social_link.slice(1)}`;
    }

    // Validate that it's an Instagram or TikTok URL
    const validInstagram = /^https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/i;
    const validTikTok = /^https?:\/\/(www\.)?tiktok\.com\/(@)?[a-zA-Z0-9_.]+\/?$/i;

    if (!validInstagram.test(social_link) && !validTikTok.test(social_link)) {
      req.flash('error', "Veuillez fournir un lien Instagram ou TikTok valide, ou utilisez le format @username.");
      return res.redirect('/register');
    }
     // Now generate the other values
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verifyCode = 'verify-' + crypto.randomBytes(3).toString('hex'); // e.g., verify-a1b2c3
    const hashedPassword = await bcrypt.hash(password, 10);
   // Insert the seller
    await pool.query(
      `INSERT INTO sellers (
        business_name, email, password, social_link, website, 
        is_verified, verification_token, verify_code, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        business_name,
        email,
        hashedPassword,
        social_link,
        website || '',
        false,
        verificationToken,
        verifyCode
      ]
    );
    
    // Send confirmation email
   const verifyLink = `${process.env.verifyLink}/verify?token=${verificationToken}`;
    
    console.log("Sending confirmation email to:", email);
    await transporter.sendMail({
      to: email,
      subject: "Confirmez votre email - TajerTrust",
      html: `<p>Bienvenue sur TajerTrust!</p><p>Veuillez confirmer votre inscription en cliquant ici :</p><a href="${verifyLink}">Confirmer</a>`
    });
    req.flash('success', "Veuillez confirmer votre email, pour réussir votre inscription.");
    // res.redirect('/register');
    res.redirect(`/verify-social?code=${verifyCode}`);

  } catch (err) {
    console.error(err);
    let msg = "Une erreur est survenue lors de l'inscription.";
    if (err.code === '23505') {
      msg = "Cet email ou lien social est déjà utilisé.";
    }
    req.flash('error', msg);
    res.redirect('/register');
  }
});



// Step 1: Social verification page (after registration)
router.get('/verify-social', async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
        req.flash('error', 'Code de vérification manquant.');
        return res.redirect('/register');
    }
    
    try {
        // Find seller by verify_code
        const sellerResult = await pool.query(
            'SELECT * FROM sellers WHERE verify_code = $1',
            [code]
        );
        
        if (sellerResult.rows.length === 0) {
            req.flash('error', 'Code de vérification invalide.');
            return res.redirect('/register');
        }
        
        const seller = sellerResult.rows[0];
        
        // Check if already verified
        if (seller.is_social_verified) {
            req.flash('success', 'Votre compte social est déjà vérifié. Vérifiez votre email pour continuer.');
            return res.redirect('/login');
        }
        
        // Determine social platform from their provided link
        const isInstagram = seller.social_link.includes('instagram.com');
        const isTikTok = seller.social_link.includes('tiktok.com');
        
        res.render('verify-social', {
            seller,
            code,
            isInstagram,
            isTikTok,
            facebookAppId: FACEBOOK_CONFIG.APP_ID,
            messages: {
                success: req.flash('success'),
                error: req.flash('error')
            },
            title: 'Vérification du compte social - TajerTrust',
            layout: 'layout',
            currentPath: req.path
        });
        
    } catch (err) {
        console.error('Verify social error:', err);
        req.flash('error', 'Erreur lors de la vérification.');
        res.redirect('/register');
    }
});

// Step 2: Instagram verification initiation
router.get('/auth/instagram/verify', async (req, res) => {
    const { code } = req.query; // verify_code from the verification page
    
    if (!code) {
        req.flash('error', 'Code de vérification manquant.');
        return res.redirect('/register');
    }
    
    // Store the verify_code in session for callback
    req.session.verifyCode = code;
    
    // Redirect to Facebook OAuth for Instagram verification
    const authUrl = `https://www.facebook.com/v23.0/dialog/oauth?client_id=${FACEBOOK_CONFIG.APP_ID}&redirect_uri=${encodeURIComponent(FACEBOOK_CONFIG.REDIRECT_URI)}&scope=business_management,pages_show_list,instagram_business_basic&response_type=code&state=verify_instagram_${code}`;
    
    res.redirect(authUrl);
});

// Step 3: Instagram verification callback
router.get('/auth/instagram/callback', async (req, res) => {
    const { code, state } = req.query;
    const verifyCode = req.session.verifyCode;
    
    if (!state || !state.startsWith('verify_instagram_') || !verifyCode) {
        req.flash('error', 'Session de vérification invalide.');
        return res.redirect('/register');
    }
    
    try {
        // Exchange code for access token
        const tokenResponse = await axios.get(`https://graph.facebook.com/v23.0/oauth/access_token?client_id=${FACEBOOK_CONFIG.APP_ID}&client_secret=${FACEBOOK_CONFIG.APP_SECRET}&redirect_uri=${encodeURIComponent(FACEBOOK_CONFIG.REDIRECT_URI)}&code=${code}`);
        
        const access_token = tokenResponse.data.access_token;
        
        // Get Instagram business account
        const instagramAccount = await getInstagramBusinessAccount(access_token);
        
        if (instagramAccount) {
            // Update seller with verified Instagram data
            await pool.query(`
                UPDATE sellers 
                SET 
                    is_social_verified = true,
                    social_verified_at = NOW(),
                    instagram_username = $1,
                    instagram_account_id = $2,
                    instagram_account_type = $3,
                    instagram_page_name = $4,
                    instagram_followers_count = $5
                WHERE verify_code = $6
            `, [
                instagramAccount.username,
                instagramAccount.id,
                instagramAccount.account_type,
                instagramAccount.page_name,
                instagramAccount.followers_count || 0,
                verifyCode
            ]);
            
            // Clear session
            delete req.session.verifyCode;
            
            req.flash('success', `🎉 Instagram vérifié avec succès! (@${instagramAccount.username}). Vérifiez maintenant votre email pour finaliser votre inscription.`);
            res.redirect(`/verify-social?code=${verifyCode}&verified=true`);
            
        } else {
            req.flash('error', 'Aucun compte Instagram Business trouvé. Assurez-vous que votre Instagram est un compte Business/Créateur connecté à une page Facebook.');
            res.redirect(`/verify-social?code=${verifyCode}&error=no_instagram`);
        }
        
    } catch (error) {
        console.error('Instagram verification error:', error);
        req.flash('error', 'Erreur lors de la vérification Instagram. Veuillez réessayer.');
        res.redirect(`/verify-social?code=${verifyCode}&error=verification_failed`);
    }
});



// Step 4: Skip social verification (optional - for TikTok or later)
router.post('/skip-social-verification', async (req, res) => {
    const { code } = req.body;
    
    try {
        // Mark as "skipped" but not verified
        await pool.query(`
            UPDATE sellers 
            SET social_verified_at = NOW()
            WHERE verify_code = $1
        `, [code]);
        
        req.flash('success', 'Vérification reportée. Vérifiez votre email pour continuer.');
        res.redirect('/login');
        
    } catch (err) {
        console.error('Skip verification error:', err);
        req.flash('error', 'Erreur lors du report de vérification.');
        res.redirect(`/verify-social?code=${code}`);
    }
});

// POST : verify social check (verifier le code saisi dans BIO)
// router.post('/verify-social-check', async (req, res) => {
//   const { code } = req.body;

//   try {
//     const result = await pool.query(
//       'SELECT id, social_link FROM sellers WHERE verify_code = $1',
//       [code]
//     );
//     if (result.rows.length === 0) {
//       req.flash('error', 'Code invalide.');
//       return res.redirect('/register');
//     }

//     const seller = result.rows[0];
//     const browser = await puppeteer.launch({ headless: 'new' });
//     const page = await browser.newPage();

//     await page.setUserAgent(
//       'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
//     );

//     await page.goto(seller.social_link, {
//       waitUntil: 'domcontentloaded',
//       timeout: 60000,
//     });

//     const bio = await page.$eval('meta[name="description"]', el => el.content);

//     console.log("Bio found:", bio);

//     if (bio.includes(code)) {
//       await pool.query(
//         'UPDATE sellers SET is_social_verified = true WHERE id = $1',
//         [seller.id]
//       );
//       req.flash('success', 'Compte vérifié avec succès !');
//     } else {
//       req.flash('error', 'Code introuvable dans votre bio.');
//     }

//     await browser.close();
//     res.redirect(`/verify-social?code=${code}`);
//   } catch (err) {
//     console.error('Erreur de vérification:', err);
//     req.flash('error', 'Une erreur est survenue lors de la vérification.');
//     res.redirect(`/verify-social?code=${code}`);
//   }
// });
// POST /Verify
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  try {
    const result = await pool.query(
      `UPDATE sellers SET is_verified = true, verification_token = NULL
       WHERE verification_token = $1 RETURNING *`, [token]);

    if (result.rowCount === 0) {
      req.flash('error', 'Lien de confirmation invalide ou expiré.');
    } else {
      req.flash('success', 'Email confirmé avec succès. Veuillez attendre la validation de l\'administrateur afin de pouvoir vous connecter à la platforme. Un email vous sera livré dans moins de 24h!');
    }
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Une erreur est survenue pendant la vérification.');
    res.redirect('/login');
  }
});
// POST /login
// POST login using Passport
router.post('/login', (req, res, next) => {

  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash('error', info.message || 'Erreur de connexion.');
      return res.redirect('/login');
    }
    req.logIn(user, async (err) => {
      if (err) return next(err);

       try {
         // ✅ Gérer la case "Se souvenir de moi"
         if (req.body.remember_me) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 jours
        } else {
          req.session.cookie.expires = false; // expire à la fermeture du navigateur
        }
        // Check if this user is an admin by email
        const result = await pool.query('SELECT * FROM admins WHERE email = $1', [user.email]);
        const isAdmin = result.rows.length > 0;
        // Attach this info to session if needed
        req.user.role = isAdmin ? 'admin' : 'seller';

        return res.redirect(isAdmin ? '/pending_sellers' : '/check');

      } catch (dbError) {
        console.error('Database error during admin check:', dbError);
        req.flash('error', 'Erreur de connexion.');
        return res.redirect('/login');
      }
    });
  })(req, res, next);
});
//  GET / POST CHECK
router.get('/check', ensureAuthenticated, (req, res) => {
  // console.log('User in check page:', req.user); // Should show user info
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  res.render('check', {
    title: 'Vérifier un numéro - TajerTrust',
    user: currentUser,
    messages: {
      success: req.flash('success'),
      error: req.flash('error')
    },
    currentPath: req.path
  });
});

// POST : Check - verifier si un numéro est blacklisté 
router.post('/check', ensureAuthenticated, async (req, res) => {
  const { phone } = req.body;
// 🔒 Add phone format validation here
const cleanedPhone = phone.replace(/\s+/g, ''); // remove spaces
const moroccanPhoneRegex = /^(?:\+212|0)([5-7]\d{8})$/; // +212 or 0, followed by 9 digits starting with 5, 6, or 7

if (!moroccanPhoneRegex.test(cleanedPhone)) {
  req.flash('error', "📵 Numéro invalide. Veuillez entrer un numéro marocain valide.");
  return res.redirect('/check');
}

  try {
    const result = await pool.query(`
      SELECT phone, reason, date, COUNT(*) as report_count
      FROM blacklisted_phones
      WHERE phone = $1
      GROUP BY phone, reason, date
    `, [cleanedPhone]);

    if (result.rows.length >= 3) {
      req.flash('error', `❌Le numéro ${cleanedPhone} a été signalé par ${result.rows.length} vendeurs.`);
    } else {
      req.flash('success', `✅Le numéro ${cleanedPhone} n'est pas suffisamment signalé pour être blacklisté.`);
    }
  } catch (err) {
    console.error(err);
    req.flash('error', "Erreur lors de la vérification du numéro.");
  }

  res.redirect('/check');
});

// GET: ajouter un numéro à la blacklist 
router.get('/blacklist_add', ensureAuthenticated, async(req, res) => {

  const result = await pool.query('SELECT reason FROM blacklist_reasons');
  const reasons = result.rows.map(row => row.reason);
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  res.render('blacklist_add', {
    title: 'Ajouter à la Blacklist',
    reasons,
    user: currentUser,
    messages: {
      success: req.flash('success'),
      error: req.flash('error')
    },
    currentPath: req.path
  });
});

// POST: Add to Blacklist
router.post('/blacklist_add', ensureAuthenticated, async (req, res) => {
  const { phone, reason } = req.body;
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  const seller_id = currentUser.id;
  
  // Validation for Moroccan phone number
  // Accepts 06 12 34 56 78 or 0612345678 or +212 6 12 34 56 78
let cleanedPhone = phone.replace(/\s+/g, ''); // remove all spaces
  const moroccanRegex = /^(?:\+212|0)([5-7]\d{8})$/;
  if (!moroccanRegex.test(cleanedPhone)) {
    req.flash('error', "Numéro invalide. Veuillez entrer un numéro marocain valide.");
    return res.redirect('/blacklist_add');
  }

  try {

    // Get valid reasons from DB
  const reasons = await pool.query('SELECT reason  FROM blacklist_reasons');
  const validReasons = reasons.rows.map(row => row.reason);
  console.log("resaons :" +validReasons);
  console.log("Reason entred :" +reason);

  if (!reason || !validReasons.includes(reason)) {
    req.flash('error', "Veuillez sélectionner une raison valide.");
    return res.redirect('/blacklist_add');
  }

// 🔍 Check if this phone number is already blacklisted by the current seller
const existing = await pool.query(
  'SELECT * FROM blacklisted_phones WHERE seller_id = $1 AND phone = $2',
  [seller_id, cleanedPhone]
);

if (existing.rows.length > 0) {
  req.flash('error', `Le numéro ${cleanedPhone} est déjà dans votre blacklist.`);
  return res.redirect('/blacklist_add');
}

// ✅ If not, insert it

    await pool.query(
      `INSERT INTO blacklisted_phones (phone, reason, seller_id, date)
       VALUES ($1, $2, $3, NOW())`,
      [cleanedPhone, reason, seller_id]
    );
    req.flash('success', `Le numéro ${cleanedPhone} a été ajouté à votre blacklist.`);
    res.redirect('/blacklist_add');
  } catch (err) {
    console.error(err);
    req.flash('error', "Erreur lors de l'ajout à la blacklist.");
    res.redirect('/blacklist_add');
  }
});

// GET My Blacklist
router.get('/ma_blacklist', ensureAuthenticated, async (req, res) => {
  try {

    // Get user from either Passport or session
    const currentUser = req.user || req.session.user;
    const result = await pool.query(`
      SELECT id, phone, reason, to_char(date, 'DD/MM/YYYY') as date
      FROM blacklisted_phones
      WHERE seller_id = $1
      ORDER BY date DESC
    `, [currentUser.id]);

    res.render('ma_blacklist', {
      title: 'Ma Liste Noire - TajerTrust',
      user: currentUser,
      messages: {
        success: req.flash('success'),
        error: req.flash('error')
      },
      entries: result.rows,
      currentPath: req.path
     
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur lors du chargement de votre liste noire.');
    res.redirect('/check');
  }
});

// UPDATE reason for a blacklisted phone
router.post('/blacklist/update', ensureAuthenticated, async (req, res) => {

  const { id, phone, reason } = req.body;
  // Get user from either Passport or session
    const currentUser = req.user || req.session.user;

  try {
    // Fetch the old entry
    const { rows } = await pool.query(
      'SELECT phone, reason FROM blacklisted_phones WHERE id = $1 AND seller_id = $2',
      [id, currentUser.id]
    );

    if (rows.length === 0) {
      req.flash('error', 'Entrée introuvable.');
      return res.redirect('/ma_blacklist');
    }

    const oldEntry = rows[0];

    // Update the entry
    await pool.query(
      'UPDATE blacklisted_phones SET phone = $1, reason = $2 WHERE id = $3 AND seller_id = $4',
      [phone, reason, id, currentUser.id]
    );

    req.flash(
      'success',
      `✅ Mise à jour : ${oldEntry.phone} → ${phone}, raison : "${oldEntry.reason}" → "${reason}"`
    );
  } catch (err) {
    console.error(err);
    req.flash('error', "❌ Erreur lors de la mise à jour.");
  }

  res.redirect('/ma_blacklist');
});

// DELETE a blacklisted phone
router.post('/blacklist/delete/:id', ensureAuthenticated, async (req, res) => {
  const id = req.params.id;
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  const sellerId = currentUser.id;

  try {
    // Fetch the phone number first
    const resultSelect = await pool.query(
      'SELECT phone FROM blacklisted_phones WHERE id = $1 AND seller_id = $2',
      [id, sellerId]
    );

    if (resultSelect.rows.length === 0) {
      req.flash('error', 'Numéro introuvable ou vous n’avez pas la permission.');
      return res.redirect('/ma_blacklist');
    }

    const phoneNumber = resultSelect.rows[0].phone;

    // Proceed to delete
    const resultDelete = await pool.query(
      'DELETE FROM blacklisted_phones WHERE id = $1 AND seller_id = $2',
      [id, sellerId]
    );

    if (resultDelete.rowCount > 0) {
      req.flash('success', `Le numéro ${phoneNumber} est supprimé de votre blacklist.`);
    } else {
      req.flash('error', 'Suppression échouée.');
    }

  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/ma_blacklist');

});

// LOGOUT route
router.get('/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }

    // Supprimer toute session ou cookies si besoin
    req.session.destroy(() => {
      res.clearCookie('connect.sid'); // Si tu utilises ce cookie de session
      res.render('logout',{
        title: 'Logout - TajerTrust',
        currentPath: req.path
        }
       ); // Affiche la page logout.ejs
    });
  });
});


// Show pending sellers
router.get('/pending_sellers', ensureAdmin, async (req, res) => {
 
  const isAdmin = (await pool.query('SELECT 1 FROM admins WHERE email = $1', [req.user.email])).rows.length > 0;
  const page = parseInt(req.query.page) || 1;
  const limit = 15; // You can change to 20 etc.
  const offset = (page - 1) * limit;
  
  try {
    const totalResult = await pool.query(
      `SELECT COUNT(*) FROM sellers WHERE is_validated = false`
    );
    const totalSellers = parseInt(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalSellers / limit);

    const result = await pool.query(
      `SELECT * FROM sellers WHERE is_validated = false ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
  res.render('pending_sellers', { 
    title: 'Pending Sellers - TajerTrust',
    sellers: result.rows,
    currentPage: page,
    totalPages,
    messages: {
      error: req.flash('error'),
      success: req.flash('success')
    },
    user: req.user,
    isAdmin: true,
    currentPath: req.path // check if it's an admin
    // ✅ pass this to the template
    });

  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur lors du chargement des vendeurs.');
    res.redirect('/login');
  }

});

// Show validated sellers
router.get('/validated_sellers', ensureAdmin, async (req, res) => {
    const currentPage = parseInt(req.query.page) || 1;
    const limit = 10; // You can change to 20 etc.
    const offset = (currentPage  - 1) * limit;
 try {
    const isAdmin = (await pool.query('SELECT 1 FROM admins WHERE email = $1', [req.user.email])).rows.length > 0;
    const total = await pool.query('SELECT COUNT(*) FROM sellers WHERE is_validated = true');
    const totalItems = parseInt(total.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    const result = await pool.query(
      'SELECT * FROM sellers WHERE is_validated = true ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
  res.render('validated_sellers', {
    title: 'Validated Sellers - TajerTrust',
     sellers: result.rows,
     currentPage,
     totalPages,
     messages: {
      error: req.flash('error'),
      success: req.flash('success')
    },
    user: req.user,
    isAdmin: true ,
    currentPath: req.path// check if the user is admin 
      });
    } catch (err) {
      console.error('Erreur chargement validated_sellers:', err);
      req.flash('error', 'Erreur lors du chargement.');
      res.redirect('/login');
    }

});

// Valider un vendeur
router.post('/admin/validate_seller/:id', ensureAdmin, async (req, res) => {
  const isAdmin = (await pool.query('SELECT 1 FROM admins WHERE email = $1', [req.user.email])).rows.length > 0;
  const sellerId = req.params.id;
  const currentPage = req.query.page || 1;

  if (!isAdmin) {
    return res.redirect('/login');
  }

  try {

    const sellers = await pool.query('SELECT * FROM sellers WHERE id = $1', [sellerId]);
    const seller = sellers.rows[0];

    if (!seller) {
      req.flash('error', 'Vendeur introuvable.');
      return res.redirect('/pending_sellers?page='+currentPage);
    }

    if (!seller.is_verified) {
      req.flash('error', "Ce vendeur n'a pas encore vérifié son email.");
      return res.redirect('/pending_sellers?page='+currentPage);
    }
    const result = await pool.query("UPDATE sellers SET is_validated = true WHERE id = $1 RETURNING business_name", [req.params.id]);
    const validatedName = result.rows[0]?.business_name || "Inconnu";
  //  console.log(validatedName+ " est validé");

    req.flash('success', `Le seller ${validatedName} a été validé avec succès.`);
    res.redirect('/pending_sellers?page='+currentPage);

  } catch (error) {
    console.error(error);
    req.flash('error', 'Une erreur est survenue lors de la validation.');
  }
  res.redirect('/pending_sellers?page='+currentPage);
});

// Supprimer un vendeur dans bending sellers
router.post('/admin/delete_seller', ensureAdmin, async (req, res) => {

  const { seller_id, reason} = req.body;
  const currentPage = req.query.page || req.body.currentPage || 1;

  try {
    // Get admin's email from session
    const adminEmail = req.user?.email;
    // console.log(' admin demandant suppression :', adminEmail);

    // Optional: check if seller exists first
    const check = await pool.query('SELECT * FROM sellers WHERE id = $1', [seller_id]);
    // console.log(' CHECK SELLER :', check);

    if (check.rows.length === 0) {
      req.flash('error', 'Vendeur introuvable.');
      return res.redirect('/pending_sellers?page='+currentPage);
    }
    const businessName = check.rows[0]?.business_name || 'Inconnu';
    const sellerEmail = check.rows[0]?.email;
    if (!sellerEmail) {
      req.flash('error', 'Email du vendeur introuvable.');
      return res.redirect('/pending_sellers?page='+currentPage);
    }

   // Log the deletion before actually deleting
await pool.query(
  'INSERT INTO deletion_logs (seller_email, admin_email, reason) VALUES ($1, $2, $3)',
  [sellerEmail, adminEmail, reason]
);
    // Delete the seller
    await pool.query('DELETE FROM sellers WHERE id = $1', [seller_id]);

    req.flash('success', `Le vendeur "${businessName}" a été supprimé pour la raison : "${reason}"`);
    res.redirect('/pending_sellers?page='+currentPage);
  } catch (err) {
    console.error('Erreur suppression vendeur:', err);
    req.flash('error', 'Erreur lors de la suppression du vendeur.');
    res.redirect('/pending_sellers?page='+currentPage);
  }
});

//  Devalidate ROUTE : devalidate un seller dans validtade sellers page
router.post('/admin/devalidate', ensureAdmin, async (req, res) => {
  const { seller_id, cause } = req.body;
  const adminId = req.user && req.user.role === 'admin' ? req.user.id : null;
  const currentPage = req.query.page || req.body.currentPage || 1;

  try {
    // 1. Update seller to unvalidated
    await pool.query('UPDATE sellers SET is_validated = false WHERE id = $1', [seller_id]);
   // 2. Get business name (for the flash message)
   const result = await pool.query('SELECT business_name FROM sellers WHERE id = $1', [seller_id]);
   const businessName = result.rows[0]?.business_name || 'Inconnu';

    // 2. Insert into devalidation_logs
    await pool.query(
      `INSERT INTO devalidation_logs (seller_id, cause, date, admin_id)
       VALUES ($1, $2, $3, $4)`,
      [seller_id, cause, new Date(), adminId]
    );
    // 4. Flash message
    req.flash('success', `Vendeur "${businessName}" est dévalidé pour la cause : "${cause}"`);
    res.redirect('/validated_sellers?page='+currentPage);
  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur lors de la dévalidation du vendeur.');
    res.redirect('/validated_sellers?page='+currentPage);
  }
});
// Show deleted sellers
router.get('/deleted_sellers', ensureAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM deletion_logs ORDER BY deleted_at DESC');
    res.render('deleted_sellers', {
      title: 'Deleted Sellers - TajerTrust',
      logs: result.rows,   
      messages: {
       error: req.flash('error'),
       success: req.flash('success')
     },
     isAdmin: true,
     currentPath: req.path // check if the user is admin 
    });
  } catch (err) {
    console.error('Erreur récupération des logs de suppression:', err);
    req.flash('error', 'Erreur lors du chargement des vendeurs supprimés.');
    res.redirect('/pending_sellers');
  }
});
// Display blacklist reasons
router.get('/blacklist_reasons', ensureAdmin, async (req, res) => {
  const reasons = await pool.query('SELECT * FROM blacklist_reasons ORDER BY id DESC');
  res.render('blacklist_reasons', {
    title: 'Blacklist Reasons',
    reasons: reasons.rows,
    messages: {
      success: req.flash('success'),
      error: req.flash('error')
    },
    user: req.user,
    currentPath: req.path
  });
});

// Add a new reason
router.post('/admin/blacklist_reasons/add', ensureAdmin, async (req, res) => {
  const { reason } = req.body;
  if (!reason || reason.trim() === '') {
    req.flash('error', 'La raison ne peut pas être vide.');
    return res.redirect('/blacklist_reasons');
  }

  try {
    await pool.query('INSERT INTO blacklist_reasons (reason) VALUES ($1)', [reason.trim()]);
    req.flash('success', 'Raison ajoutée avec succès.');
  } catch (err) {
    req.flash('error', 'Erreur lors de l’ajout. Peut-être existe déjà.');
  }
  res.redirect('/blacklist_reasons');
});

// Update reason
router.post('/admin/blacklist_reasons/update/:id', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  const { updatedReason } = req.body;

  try {
    await pool.query('UPDATE blacklist_reasons SET reason = $1 WHERE id = $2', [updatedReason.trim(), id]);
    req.flash('success', 'Raison mise à jour.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la mise à jour.');
  }
  res.redirect('/blacklist_reasons');
});

// Delete reason
router.post('/admin/blacklist_reasons/delete/:id', ensureAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM blacklist_reasons WHERE id = $1', [id]);
    req.flash('success', 'Raison supprimée.');
  } catch (err) {
    req.flash('error', 'Erreur lors de la suppression.');
  }
  res.redirect('/blacklist_reasons');
});


// Help Page
router.get('/help', (req, res) => {
  res.render('help', { 
    title: 'Aide - TajerTrust',
     user: req.user });
});

// FAQ PAGE - GET
router.get('/faq', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM faq ORDER BY id DESC');
    res.render('faq', {
       title: ' FAQ',
       faqs: result.rows,
       user:req.user,
       currentPath: req.path
       });
  } catch (err) {
    console.error('Erreur chargement FAQ :', err);
    res.render('faq', {
      title: ' FAQ',
       faqs: [], 
       error: 'Erreur chargement FAQ' });
  }
});

// Page admin pour gérer les FAQs
router.get('/manage_faq', ensureAdmin, async (req, res) => {
  const result = await pool.query('SELECT * FROM faq ORDER BY id DESC');
  res.render('manage_faq', { 
    title: ' Gestion FAQ',
    faqs: result.rows,
    messages: req.flash(),
    currentPath: req.path });
});

// Ajouter une FAQ
router.post('/admin/manage_faq/add', ensureAdmin, async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    req.flash('error', 'Veuillez remplir tous les champs.');
    return res.redirect('/manage_faq');
  }

  try {
    await pool.query(
      'INSERT INTO faq (question, answer) VALUES ($1, $2)',
      [question, answer]
    );
    req.flash('success', `FAQ « ${question} » ajoutée.`);
    res.redirect('/manage_faq');
  } catch (err) {
    console.error('Erreur ajout FAQ :', err);
    req.flash('error', 'Erreur lors de l’ajout de la FAQ.');
    res.redirect('/manage_faq');
  }
});

// Modifier une FAQ
router.post('/admin/manage_faq/edit/:id', ensureAdmin, async (req, res) => {
  const { question, answer } = req.body;
  const id = req.params.id;

  try {
    await pool.query(
      'UPDATE faq SET question = $1, answer = $2, updated_at = NOW() WHERE id = $3',
      [question, answer, id]
    );

    req.flash('success', `FAQ « ${question} » modifiée.`);
    res.redirect('/manage_faq');
  } catch (err) {
    console.error('Erreur modification FAQ :', err);
    req.flash('error', 'Erreur lors de la modification de la FAQ.');
    res.redirect('/manage_faq');
  }
});

// Supprimer une FAQ
router.post('/admin/manage_faq/delete/:id', ensureAdmin, async (req, res) => {
  const id = req.params.id;

  try {
    const result = await pool.query('SELECT question FROM faq WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      req.flash('error', 'FAQ introuvable.');
      return res.redirect('/manage_faq');
    }

    const question = result.rows[0].question;

    await pool.query('DELETE FROM faq WHERE id = $1', [id]);
    req.flash('success', `FAQ « ${question} » supprimée.`);
    res.redirect('/manage_faq');
  } catch (err) {
    console.error('Erreur suppression FAQ :', err);
    req.flash('error', 'Erreur lors de la suppression de la FAQ.');
    res.redirect('/manage_faq');
  }
});

// GET contact page : to contact admin 
router.get('/contact_admin', (req, res) => {
  res.render('contact_admin', {
     title: 'Contacter Admin - TajerTrust',
      user: req.user, 
      messages: req.flash(),
      currentPath: req.path });
});

// POST contact page : to contact admin 
router.post('/contact_admin', ensureAuthenticated, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) {
    req.flash('error', 'Tous les champs sont requis.');
    return res.redirect('/contact_admin');
  }
  try {
    const mailOptions = {
      from: req.user.email,
      to: 'amaldotrading@gmail.com',
      subject: `[Contact Admin] ${subject}`,
      text: `Message de : ${req.user.email}\n\n${message}`
    };

    await transporter.sendMail(mailOptions);

    req.flash('success', 'Votre message a été envoyé à l\'administrateur.');
    res.redirect('/contact_admin');
  } catch (err) {
    console.error('Erreur lors de l’envoi de l’email :', err);
    req.flash('error', 'Erreur lors de l\'envoi de l’email.');
    res.redirect('/contact_admin');
  }
});

// GET forgot password page
router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', {
     title: 'Mot de passe oublié - TajerTrust',
      messages: req.flash(),
      currentPath: req.path });
});

// POST: handle email submission
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const userResult = await pool.query('SELECT * FROM sellers WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      req.flash('error', 'Aucun compte avec cet email.');
      return res.redirect('/forgot-password');
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expire = Date.now() + 3600000; // 1 hour

    await pool.query(
      'UPDATE sellers SET reset_token = $1, reset_token_expires = to_timestamp($2 / 1000.0) WHERE email = $3',
      [token, expire, email]
    );

    const resetLink = `http://${req.headers.host}/reset-password/${token}`;
    await transporter.sendMail({
      to: email,
      from: process.env.MAIL_USER,
      subject: 'Réinitialisation du mot de passe',
      html: `<p>Cliquez sur le lien suivant pour réinitialiser votre mot de passe :</p>
             <p><a href="${resetLink}">${resetLink}</a></p>`
    });

    req.flash('success', 'Un lien de réinitialisation a été envoyé à votre adresse email.');
    res.redirect('/forgot-password');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Une erreur est survenue.');
    res.redirect('/forgot-password');
  }
});
// reset password : GET 
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const seller = await pool.query(
    'SELECT * FROM sellers WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );

  if (seller.rows.length === 0) {
    req.flash('error', 'Lien invalide ou expiré.');
    return res.render('forgot-password', {
      title: "Mot de passe oublié", 
       messages: req.flash() });

  }

  res.render('reset-password', { 
    title : "Initialiser mot de passe !",
    token, 
    messages: req.flash(),
    currentPath: req.path  });

});

// REST PASSWORD - POST 
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password, confirm_password } = req.body;

  if (password !== confirm_password) {
    req.flash('error', 'Les mots de passe ne correspondent pas.');
    return res.render('reset-password', {
       title : "INITIALISER MOT DE PASSE",
       token,
       messages: req.flash() });
  }

  const sellerRes = await pool.query(
    'SELECT * FROM sellers WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );

  if (sellerRes.rows.length === 0) {
    req.flash('error', 'Lien invalide ou expiré.');
    return res.render('forgot-password', { 
      title: "Mot de passe oublié",
      messages: req.flash() });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query(
    'UPDATE sellers SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE reset_token = $2',
    [hashedPassword, token]
  );

  req.flash('success', 'Mot de passe réinitialisé avec succès. Connectez-vous.');
  return res.render('login', {
    title: "Login : Connexion",
     messages: req.flash() });
});

// settings : account get 
router.get('/settings/account', ensureAuthenticated, async(req, res) => {

try {
    // Get user from either Passport or session
    const currentUser = req.user || req.session.user;
    
    if (!currentUser || !currentUser.id) {
      req.flash('error', 'Session utilisateur invalide.');
      return res.redirect('/login');
    }
    
    // Fetch fresh user data from database to ensure profile_image is current
    const result = await pool.query(`
      SELECT id, email, business_name, instagram_username, profile_image, registration_method 
      FROM sellers 
      WHERE id = $1
    `, [currentUser.id]);
    
    if (result.rows.length === 0) {
      req.flash('error', 'Utilisateur non trouvé.');
      return res.redirect('/login');
    }
    
    const freshUserData = result.rows[0];
    
    // Update session with fresh data (especially profile_image)
    if (req.session.user) {
      req.session.user.profile_image = freshUserData.profile_image;
    }
    
    res.render('settings/account', {
      title: "Mon Compte",
      user: freshUserData, // Use fresh data from DB
      currentUser: freshUserData, // Also provide as currentUser
      messages: {
        error: req.flash('error'),
        success: req.flash('success')
      },      
      currentPath: req.path
    });
    
  } catch (error) {
    console.error('Account page error:', error);
    req.flash('error', 'Erreur lors du chargement du compte.');
    res.redirect('/check');
  }
});
// Update_password get 
router.get('/update-password', ensureAuthenticated, (req, res) => {
 // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  res.render('update-password', { 
    title: "Modifier Mot de paase",
    user: currentUser,
    messages: req.flash(),
    currentPath: req.path});
});
// Update_password : Post
router.post('/update-password', ensureAuthenticated, async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const messages = {};
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;

  if (!current_password || !new_password || !confirm_password) {
    messages.error = 'Tous les champs sont obligatoires.';
    return res.render('update-password', {
      title: "Modifier Mot Passe",
      user: currentUser,
      messages,
      currentPath: req.path
    });
  }
  if (new_password !== confirm_password) {
    messages.error = 'Les mots de passe ne correspondent pas.';
    return res.render('update-password', {
      title: "Modifier Mot Passe",
      user: currentUser,
      messages,
      currentPath: req.path
    });
  }
  // Password length constraint
  if (new_password.length < 8) {
    messages.error = 'Le mot de passe doit contenir au moins 8 caractères.';
    return res.render('update-password', {
      title: "Modifier Mot Passe",
      user: currentUser,
      messages,
      currentPath: req.path
    });
  }

  try {
    const match = await bcrypt.compare(current_password, req.user.password);
    if (!match) {
      messages.error = 'Ancien mot de passe incorrect.';
      return res.render('update-password', {
        title: "Modifier Mot Passe",
        user: currentUser,
        messages,
        currentPath: req.path
      });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE sellers SET password = $1 WHERE id = $2', [hashed, req.user.id]);

    messages.success = 'Mot de passe mis à jour avec succès.';
    return res.render('update-password', {
      title: "Modifier Mot Passe",
      user: currentUser,
      messages,
      currentPath: req.path
    });
  } catch (err) {
    console.error(err);
    messages.error = 'Erreur interne. Veuillez réessayer.';
    return res.render('update-password', {
      title: "Modifier Mot Passe",
      user: currentUser,
      messages,
      currentPath: req.path
    });
  }
});
// update profile photo : PHOTO 
router.post('/update-profile-photo', ensureAuthenticated, (req, res, next) => {
  
  upload.single('profile')(req, res, function (err) {
    const errorMessage = err?.message || '';
   
    if (err instanceof multer.MulterError || errorMessage === 'Only images are allowed') 
      {
      req.flash('error', 'Seules les images sont autorisées.');
      return res.redirect('/settings/account');

    } else if (err) {
      console.error(err);
      req.flash('error', 'Une erreur est survenue lors du téléchargement.');
      return res.redirect('/settings/account');

    }
    // If no file selected
    if (!req.file) {
      req.flash('error', 'Veuillez sélectionner une image.');
      return res.redirect('/settings/account');
    }
    // Continue to actual profile update logic
    next();
  });
}, async (req, res) => {
    try {
      // Get user from either Passport or session
    const currentUser = req.user || req.session.user;
    const newImageName = req.file.filename;
    // 1. Get current profile image name from DB
    const result = await pool.query('SELECT profile_image FROM sellers WHERE id = $1', [currentUser.id]);
    const oldImageName = result.rows[0]?.profile_image;

    // 2. Delete old image file if it exists and is not a default placeholder
    if (oldImageName && oldImageName !== 'default.png') {
      const oldImagePath = path.join(__dirname, '../public/uploads', oldImageName);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    // 3. Update new profile image name in DB
    await pool.query('UPDATE sellers SET profile_image = $1 WHERE id = $2', 
      [newImageName, currentUser.id]);

    // Update session
    currentUser.profile_image = newImageName;
    req.flash('success', 'Photo de profil mise à jour avec succès.');
    return res.redirect('/settings/account');

  } catch (err) {
    console.error(err);
    req.flash('error', 'Erreur interne. Réessayez.');
    return res.redirect('/settings/account');

  }
});

// upload blacklist Csv file : POST
router.post('/upload-blacklist', ensureAuthenticated, uploadCsv.single('blacklist_csv'), async (req, res) => {
  const filePath = req.file.path;
  const imported = [];
  const skipped = [];

  const seenPhonesInCSV = new Set(); // Track duplicates in the CSV file

  const isValidMoroccanPhone = (phone) => /^(0?6|0?7|0?5)\d{8}$/.test(phone);
  const normalizePhone = (phone) => {
    // If phone starts without 0, prepend it
    return phone.startsWith('0') ? phone : '0' + phone;
  };

  const processRow = async (row) => {
    try {
      // Ensure values are strings before trimming
      const rawPhone = (row.telephone ?? '').toString().trim();
      const reason = (row.raison ?? '').toString().trim() || 'Raison non précisée';
  
      // Basic template validation
      if (!rawPhone) {
        skipped.push({ phone: 'Inconnu', reason: 'Le fichier ne respecte pas le modèle requis. Téléchargez et utilisez le modèle officiel.' });
        return;
      }
  
      // Normalize
      const phone = normalizePhone(rawPhone);
  
      // Validate phone format
      if (!isValidMoroccanPhone(phone)) {
        skipped.push({ phone: rawPhone, reason: 'Format invalide' });
        return;
      }
  
      // Check for duplicates in CSV
      if (seenPhonesInCSV.has(phone)) {
        skipped.push({ phone, reason: 'Doublon dans le fichier CSV' });
        return;
      }
      seenPhonesInCSV.add(phone);
      // Get user from either Passport or session
      const currentUser = req.user || req.session.user;
      // Check for existing in DB
      const existingSeller = await pool.query(
        'SELECT 1 FROM blacklisted_phones WHERE seller_id = $1 AND phone = $2',
        [currentUser.id, phone]
      );
      if (existingSeller.rowCount > 0) {
        skipped.push({ phone, reason: 'Déjà blacklisté par vous' });
        return;
      }
  
      // Insert
      await pool.query(
        'INSERT INTO blacklisted_phones (seller_id, phone, reason, date) VALUES ($1, $2, $3, NOW())',
        [currentUser.id, phone, reason]
      );
      imported.push(phone);
  
    } catch (err) {
      console.error('Erreur de traitement d’une ligne CSV/Excel :', err);
      skipped.push({ phone: 'Inconnu', reason: 'Erreur de traitement. Assurez-vous d’utiliser le modèle officiel.' });
    }
  };
  
  const promises = [];
try {
 
  const ext = path.extname(filePath).toLowerCase();
console.log("extension:"+ext);
  if (ext === '.csv') {
    // Parse CSV
  fs.createReadStream(filePath)
    .pipe(csv({ separator: ',' })) // Let it auto-detect headers from first line
    .on('data', (row) => {
      promises.push(processRow(row));
    })
    .on('end', async () => {
      await Promise.all(promises);
      // Delete temp CSV file
      fs.unlinkSync(filePath);
      
      return res.status(200).json({ 
        success: imported.length > 0 ? `${imported.length} numéros importés avec succès.` : null,
        errors: skipped,
      });
      
    })
    .on('error', (err) => {
      console.error(err);
      return res.status(400).json({ 
        errors: ['Erreur lors de la lecture du fichier CSV.']
      });
      
    });
  } else if (ext === '.xls' || ext === '.xlsx') {
    // Excel parsing
    const workbook = xlsx.readFile(filePath);
    console.log("workbook:",workbook);
    const sheetName = workbook.SheetNames[0];
    console.log("sheetName:",sheetName);

    const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }); // keep empty cells as ''
    console.log("sheetData:",sheetData);

    for (const row of sheetData) {
      // promises.push(processRow(row));
      try {
        promises.push(processRow(row));
      } catch (err) {
        console.error("Template mismatch or data format error:", err);
        fs.unlinkSync(filePath);
        return res.status(400).json({
          errors: [
            "Le fichier ne respecte pas le modèle requis. Veuillez télécharger le modèle officiel, le remplir correctement, puis réessayer."
          ]
        });
      }
    }

    await Promise.all(promises);
    fs.unlinkSync(filePath);
    return res.status(200).json({
      success: imported.length > 0 ? `${imported.length} numéros importés avec succès.` : null,
      errors: skipped,
    });
  } else {
    fs.unlinkSync(filePath);
    return res.status(400).json({ errors: ['Format de fichier non supporté.'] });
  }
  }catch(err) {
    console.error('Upload error:', err);
    return res.status(500).json({ errors: ['Erreur serveur lors du traitement du fichier.'] });
  }
});

// HOME : GET 
router.get('/',(req, res) => {
  // Get user from either Passport or session
  const currentUser = req.user || req.session.user;
  // if (req.isAuthenticated()) {
  if (currentUser && currentUser.id) {
    // User is logged in (via either method)
    res.render('check', { 
      title: 'Verifier un numéro - TajerTrust',
      user: currentUser,
      messages : {
        error: req.flash('error'),
        success: req.flash('success')
      },
      currentPath: req.path
    });
  } else {
    res.render('accueil',{
      title: 'Accueil - TajerTrust',
      layout: false, // This disables the default layout for this render
      messages : {
        error: req.flash('error'),
        success: req.flash('success')
      },
      currentPath: req.path
    });
  }
});

// Helper function to get Instagram business account (same as before)

// async function getInstagramBusinessAccountWithPages(access_token) {
//     try {
//         console.log('=== Getting Facebook Pages with Instagram Accounts (COMPREHENSIVE) ===');
        
//         const meResponse = await axios.get(`https://graph.facebook.com/v21.0/me?access_token=${access_token}`);
//         console.log('User info:', meResponse.data);
        
//         const pagesWithInstagram = [];
        
//         // Method 1: Get pages directly managed by user (not in Business Manager)
//         try {
//             const pagesResponse = await axios.get(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${access_token}`);
//             console.log('Direct pages API response:', pagesResponse.data);
            
//             if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
//                 for (const page of pagesResponse.data.data) {
//                     await checkPageForInstagram(page, pagesWithInstagram, page.access_token);
//                 }
//             }
//         } catch (error) {
//             console.log('Direct pages access failed:', error.response?.data?.error?.message);
//         }
        
//         // Method 2: Get pages through Business Manager
//         try {
//             const businessesResponse = await axios.get(`https://graph.facebook.com/v21.0/me/businesses?fields=id,name&access_token=${access_token}`);
//             console.log('Businesses response:', businessesResponse.data);
            
//             if (businessesResponse.data.data && businessesResponse.data.data.length > 0) {
//                 for (const business of businessesResponse.data.data) {
//                     try {
//                         // Get pages owned by this business
//                         const businessPagesResponse = await axios.get(`https://graph.facebook.com/v21.0/${business.id}/owned_pages?fields=id,name,access_token&access_token=${access_token}`);
                        
//                         if (businessPagesResponse.data.data) {
//                             for (const page of businessPagesResponse.data.data) {
//                                 await checkPageForInstagram(page, pagesWithInstagram, page.access_token);
//                             }
//                         }
//                     } catch (businessPageError) {
//                         console.log(`Error getting pages for business ${business.name}:`, businessPageError.response?.data?.error?.message);
//                     }
//                 }
//             }
//         } catch (businessError) {
//             console.log('Business Manager access failed:', businessError.response?.data?.error?.message);
//         }
        
//         // Method 3: Try to access pages the user has roles on (alternative approach)
//         try {
//             const rolesResponse = await axios.get(`https://graph.facebook.com/v21.0/me?fields=accounts{id,name,access_token,roles}&access_token=${access_token}`);
            
//             if (rolesResponse.data.accounts && rolesResponse.data.accounts.data) {
//                 for (const page of rolesResponse.data.accounts.data) {
//                     await checkPageForInstagram(page, pagesWithInstagram, page.access_token);
//                 }
//             }
//         } catch (rolesError) {
//             console.log('Roles-based access failed:', rolesError.response?.data?.error?.message);
//         }
        
//         // Remove duplicates based on page_id
//         const uniquePages = pagesWithInstagram.filter((page, index, self) => 
//             index === self.findIndex(p => p.page_id === page.page_id)
//         );
        
//         console.log(`📊 Total found: ${uniquePages.length} unique pages with Instagram accounts`);
//         return uniquePages;
        
//     } catch (error) {
//         console.error('Error getting pages:', error.response?.data || error.message);
//         return [];
//     }
// }

// UPDATED: Works with both Business AND Creator accounts
async function getInstagramBusinessAccountWithPages(access_token) {
    try {
        console.log('=== Getting Instagram Accounts (Business + Creator) ===');
        
        const meResponse = await axios.get(`https://graph.facebook.com/v21.0/me?access_token=${access_token}`);
        console.log('User info:', meResponse.data);
        // Debug: Check what permissions user actually granted
        const permCheck = await axios.get(
            `https://graph.facebook.com/v23.0/me/permissions?access_token=${access_token}`
        );
        console.log('🔍 Granted permissions:', permCheck.data.data.map(p => p.permission));
        
        const accountsFound = [];
        
        // METHOD 1: Get Instagram Business accounts via Facebook Pages (Traditional Business)
        console.log('\n📍 METHOD 1: Checking Facebook Pages with Instagram Business...');
        try {
            const pagesResponse = await axios.get(
                `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account{id,username,name,profile_picture_url}&access_token=${access_token}`
            );
            
            console.log('Pages found:', pagesResponse.data.data?.length || 0);
            
            if (pagesResponse.data.data && pagesResponse.data.data.length > 0) {
                for (const page of pagesResponse.data.data) {
                    if (page.instagram_business_account) {
                        const ig = page.instagram_business_account;
                        accountsFound.push({
                            page_id: page.id,
                            page_name: page.name,
                            instagram_id: ig.id,
                            instagram_username: ig.username,
                            instagram_name: ig.name || ig.username,
                            profile_picture: ig.profile_picture_url || null,
                            account_type: 'business',
                            source: 'facebook_page'
                        });
                        console.log(`✅ Found Business: @${ig.username} (via page ${page.name})`);
                    }
                }
            }
        } catch (error) {
            console.log('METHOD 1 failed:', error.response?.data?.error?.message || error.message);
        }
        
        // METHOD 2: Get Instagram accounts directly via /me/accounts (includes Creator accounts)
        console.log('\n📍 METHOD 2: Checking direct Instagram accounts (Creator)...');
        try {
            // This endpoint works for Creator accounts!
            const igAccountsResponse = await axios.get(
                `https://graph.facebook.com/v23.0/me/accounts?fields=instagram_accounts{id,username,name,profile_picture_url}&access_token=${access_token}`
            );
            
            console.log('Instagram accounts response:', igAccountsResponse.data);
            
            if (igAccountsResponse.data.data && igAccountsResponse.data.data.length > 0) {
                for (const page of igAccountsResponse.data.data) {
                    if (page.instagram_accounts && page.instagram_accounts.data) {
                        for (const ig of page.instagram_accounts.data) {
                            // Check if not already added
                            const exists = accountsFound.some(acc => acc.instagram_id === ig.id);
                            if (!exists) {
                                accountsFound.push({
                                    page_id: page.id || null,
                                    page_name: page.name || ig.username,
                                    instagram_id: ig.id,
                                    instagram_username: ig.username,
                                    instagram_name: ig.name || ig.username,
                                    profile_picture: ig.profile_picture_url || null,
                                    account_type: 'creator',
                                    source: 'instagram_direct'
                                });
                                console.log(`✅ Found Creator: @${ig.username}`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log('METHOD 2 failed:', error.response?.data?.error?.message || error.message);
        }
        
        // METHOD 3: Try the alternative endpoint structure
        console.log('\n📍 METHOD 3: Trying alternative Instagram discovery...');
        try {
            const altResponse = await axios.get(
                `https://graph.facebook.com/v23.0/me?fields=accounts{instagram_accounts{id,username,name,profile_picture_url}}&access_token=${access_token}`
            );
            
            if (altResponse.data.accounts && altResponse.data.accounts.data) {
                for (const account of altResponse.data.accounts.data) {
                    if (account.instagram_accounts && account.instagram_accounts.data) {
                        for (const ig of account.instagram_accounts.data) {
                            const exists = accountsFound.some(acc => acc.instagram_id === ig.id);
                            if (!exists) {
                                accountsFound.push({
                                    page_id: account.id || null,
                                    page_name: account.name || ig.username,
                                    instagram_id: ig.id,
                                    instagram_username: ig.username,
                                    instagram_name: ig.name || ig.username,
                                    profile_picture: ig.profile_picture_url || null,
                                    account_type: 'creator',
                                    source: 'nested_query'
                                });
                                console.log(`✅ Found via nested query: @${ig.username}`);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.log('METHOD 3 failed:', error.response?.data?.error?.message || error.message);
        }
        
        // Remove duplicates based on instagram_id
        const uniqueAccounts = accountsFound.filter(
            (account, index, self) => index === self.findIndex(a => a.instagram_id === account.instagram_id)
        );
        
        console.log(`\n✅ Total unique Instagram accounts found: ${uniqueAccounts.length}`);
        uniqueAccounts.forEach(acc => {
            console.log(`   - @${acc.instagram_username} (${acc.account_type})`);
        });
        
        return uniqueAccounts;
        
    } catch (error) {
        console.error('Fatal error getting Instagram accounts:', error.response?.data || error.message);
        return [];
    }
}

// Helper function (no longer needed but kept for backward compatibility)
async function checkPageForInstagram(page, pagesArray, accessToken) {
    try {
        console.log(`Checking page: ${page.name} (${page.id})`);
        
        const igResponse = await axios.get(
            `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account{id,username,name,profile_picture_url}&access_token=${accessToken}`
        );
        
        if (igResponse.data.instagram_business_account) {
            const ig = igResponse.data.instagram_business_account;
            
            pagesArray.push({
                page_id: page.id,
                page_name: page.name,
                instagram_id: ig.id,
                instagram_username: ig.username,
                instagram_name: ig.name || ig.username,
                profile_picture: ig.profile_picture_url || null,
                account_type: 'business',
                page_access_token: accessToken
            });
            
            console.log(`✅ Added: ${page.name} (@${ig.username})`);
        } else {
            console.log(`No Instagram account linked to page: ${page.name}`);
        }
    } catch (pageError) {
        console.log(`❌ Error checking page ${page.name}:`, pageError.response?.data?.error?.message);
    }
}
// Helper function to check if a page has Instagram and add to array
async function checkPageForInstagram(page, pagesArray, accessToken) {
    try {
        console.log(`Checking page: ${page.name} (${page.id})`);
        
        // Check for Instagram Business account
        const igResponse = await axios.get(`https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`);
        
        if (igResponse.data.instagram_business_account) {
            const igAccountId = igResponse.data.instagram_business_account.id;
            console.log(`Found Instagram account: ${igAccountId}`);
            
            // Get Instagram details
            const igDetails = await axios.get(`https://graph.facebook.com/v23.0/${igAccountId}?fields=id,username&access_token=${accessToken}`);
            
            pagesArray.push({
                page_id: page.id,
                page_name: page.name,
                instagram_id: igDetails.data.id,
                instagram_username: igDetails.data.username,
                page_access_token: accessToken
            });
            
            console.log(`✅ Added: ${page.name} (@${igDetails.data.username})`);
        } else {
            console.log(`No Instagram account linked to page: ${page.name}`);
        }
    } catch (pageError) {
        console.log(`❌ Error checking page ${page.name}:`, pageError.response?.data?.error?.message);
    }
}
router.get('/auth/instagram/login-callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!state || !state.startsWith('login_instagram_')) {
        req.flash('error', 'Session de connexion invalide.');
        return res.redirect('/login');
    }
    
    try {
        const isProduction = process.env.NODE_ENV === 'production' || req.get('host').includes('tajertrust.com');
        const redirectUri = isProduction 
            ? 'https://tajertrust.com/auth/instagram/login-callback'
            : 'http://localhost:3000/auth/instagram/login-callback';
        
        const tokenResponse = await axios.get(`https://graph.facebook.com/v23.0/oauth/access_token?client_id=${FACEBOOK_CONFIG.APP_ID}&client_secret=${FACEBOOK_CONFIG.APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
        const access_token = tokenResponse.data.access_token;
        
        console.log('Getting Instagram accounts for login...');
        
        // Use the same dynamic function for consistency
        const pagesWithInstagram = await getInstagramBusinessAccountWithPages(access_token);
        
        if (pagesWithInstagram.length === 0) {
            req.flash('error', 'Aucun compte Instagram Business trouvé. Assurez-vous que votre Instagram est connecté à une page Facebook.');
            return res.redirect('/login');
        }
        
        // Try to find existing user with any of the found Instagram accounts
        let foundUser = null;
        for (const page of pagesWithInstagram) {
            const result = await pool.query(`
                SELECT * FROM sellers 
                WHERE instagram_account_id = $1 
                AND is_social_verified = true
            `, [page.instagram_id]);
            
            if (result.rows.length > 0) {
                foundUser = result.rows[0];
                break;
            }
        }
        
        if (foundUser) {
            if (!foundUser.is_validated) {
                req.flash('error', 'Votre compte est en attente de validation par notre équipe.');
                return res.redirect('/login');
            }
            
            // Log user in
            req.session.user = {
                id: foundUser.id,
                email: foundUser.email,
                business_name: foundUser.business_name,
                instagram_username: foundUser.instagram_username,
                profile_image: foundUser.profile_image,
                registration_method: foundUser.registration_method
            };
            
            req.flash('success', `Connexion réussie via Instagram (@${foundUser.instagram_username})!`);
            res.redirect('/check');
        } else {
            req.flash('error', 'Aucun compte TajerTrust trouvé avec vos comptes Instagram. Veuillez vous inscrire d\'abord.');
            res.redirect('/register');
        }
        
    } catch (error) {
        console.error('Instagram login error:', error);
        req.flash('error', 'Erreur lors de la connexion Instagram.');
        res.redirect('/login');
    }
});

// Instagram Business Registration callback
router.get('/auth/instagram/register-callback', async (req, res) => {
    const { code, state } = req.query;
    
    if (!state || !state.startsWith('register_instagram_')) {
        req.flash('error', 'Session d\'inscription invalide.');
        return res.redirect('/register');
    }
    
    try {
        const isProduction = process.env.NODE_ENV === 'production' || req.get('host').includes('tajertrust.com');
        const redirectUri = isProduction 
            ? 'https://tajertrust.com/auth/instagram/register-callback'
            : 'http://localhost:3000/auth/instagram/register-callback';
        
        const tokenResponse = await axios.get(`https://graph.facebook.com/v23.0/oauth/access_token?client_id=${FACEBOOK_CONFIG.APP_ID}&client_secret=${FACEBOOK_CONFIG.APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`);
        const access_token = tokenResponse.data.access_token;
        
        // Get all pages with Instagram accounts
        const pagesWithInstagram = await getInstagramBusinessAccountWithPages(access_token);
        
        if (pagesWithInstagram.length === 0) {
            req.flash('error', 'Aucune page Facebook avec compte Instagram Business trouvée.');
            return res.redirect('/register');
        }
        
        // If only one page, auto-select it
        if (pagesWithInstagram.length === 1) {
            const selected = pagesWithInstagram[0];
            return createUserAndRedirect(req, res, selected);
        }
        
        // If multiple pages, show selection page
        req.session.oauth_data = {
            access_token,
            pages: pagesWithInstagram
        };
        
        res.render('select-facebook-page', {
            title: 'Sélectionner Page Facebook',
            pages: pagesWithInstagram,
            messages: req.flash()
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Erreur lors de l\'inscription.');
        res.redirect('/register');
    }
});

// Helper function to create user
async function createUserAndRedirect(req, res, selectedPage) {
    try {
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        const result = await pool.query(`
            INSERT INTO sellers (
                business_name, 
                email, 
                instagram_account_id,
                instagram_username,
                instagram_page_name,
                is_social_verified,        
                social_verified_at,        
                registration_method, 
                verification_token,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(),$7, $8, NOW())
            RETURNING id
        `, [
            selectedPage.instagram_username,
            `${selectedPage.instagram_username}@instagram-temp.com`,
            selectedPage.instagram_id,
            selectedPage.instagram_username,
            selectedPage.page_name,
            true,                         // is_social_verified = true
             'instagram',                  // registration_method
            verificationToken
        ]);
        
        req.session.pendingRegistration = {
            userId: result.rows[0].id,
            instagram_username: selectedPage.instagram_username,
            business_name: selectedPage.instagram_username,
            verificationToken
        };
        
        res.redirect('/complete-instagram-profile');
    } catch (error) {
        console.error('User creation error:', error);
        req.flash('error', 'Erreur lors de la création du compte.');
        res.redirect('/register');
    }
}

// New route: Handle page selection
router.post('/select-facebook-page', async (req, res) => {
    const { page_id, instagram_id, instagram_username } = req.body;
    const oauth_data = req.session.oauth_data;
    
    if (!oauth_data) {
        req.flash('error', 'Session expirée.');
        return res.redirect('/register');
    }
    
    try {
        // Check if Instagram account already exists
        const existingUser = await pool.query(
            'SELECT id, email, business_name FROM sellers WHERE instagram_account_id = $1',
            [instagram_id]
        );
        
        if (existingUser.rows.length > 0) {
            req.flash('error', `Ce compte Instagram (@${instagram_username}) est déjà enregistré. Veuillez vous connecter.`);
            return res.redirect('/login');
        }
        
        // Also check for duplicate email
        const email = `${instagram_username}@instagram-temp.com`;
        const existingEmail = await pool.query(
            'SELECT id FROM sellers WHERE email = $1',
            [email]
        );
        
        if (existingEmail.rows.length > 0) {
            // If email exists but different Instagram ID, generate unique email
            const uniqueEmail = `${instagram_username}_${Date.now()}@instagram-temp.com`;
            
            const result = await pool.query(`
                INSERT INTO sellers (
                    business_name, 
                    email, 
                    instagram_account_id,
                    instagram_username,
                    instagram_page_name,
                    verification_token,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id
            `, [
                instagram_username,
                uniqueEmail, // Use unique email
                instagram_id,
                instagram_username,
                req.body.page_name || instagram_username,
                crypto.randomBytes(32).toString('hex')
            ]);
            
            req.session.pendingRegistration = {
                userId: result.rows[0].id,
                instagram_username: instagram_username,
                business_name: instagram_username,
                verificationToken: crypto.randomBytes(32).toString('hex')
            };
            
            req.flash('success', `Compte créé avec @${instagram_username}`);
            return res.redirect('/complete-instagram-profile');
        }
        
        // Normal insertion if no conflicts
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        const result = await pool.query(`
            INSERT INTO sellers (
                business_name, 
                email, 
                instagram_account_id,
                instagram_username,
                instagram_page_name,
                verification_token,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
            RETURNING id
        `, [
            instagram_username,
            email,
            instagram_id,
            instagram_username,
            req.body.page_name || instagram_username,
            verificationToken
        ]);
        
        req.session.pendingRegistration = {
            userId: result.rows[0].id,
            instagram_username: instagram_username,
            business_name: instagram_username,
            verificationToken: verificationToken
        };
        
        res.redirect('/complete-instagram-profile');
        
    } catch (error) {
        console.error('Page selection error:', error);
        req.flash('error', 'Erreur lors de la création du compte.');
        res.redirect('/register');
    }
});
// Complete Instagram profile route (GET)
router.get('/complete-instagram-profile', (req, res) => {
    const pendingRegistration = req.session.pendingRegistration;
    
    if (!pendingRegistration || !pendingRegistration.userId) {
        req.flash('error', 'Session d\'inscription expirée. Veuillez recommencer.');
        return res.redirect('/register');
    }
    
    res.render('complete-instagram-profile', {
        title: 'Compléter votre profil',
        user: pendingRegistration, // Use pending registration data
        messages: {
            error: req.flash('error'),
            success: req.flash('success')
        },
        currentPath: req.path
    });
});

// Complete Instagram profile route (POST)
router.post('/complete-instagram-profile', async (req, res) => {
    const { email, website } = req.body;
    const pendingRegistration = req.session.pendingRegistration;
    
    if (!pendingRegistration || !pendingRegistration.userId) {
        req.flash('error', 'Session d\'inscription expirée. Veuillez recommencer.');
        return res.redirect('/register');
    }
    
    try {
        // Validate email
        if (!email || !email.includes('@')) {
            req.flash('error', 'Veuillez fournir un email valide.');
            return res.redirect('/complete-instagram-profile');
        }
        
        // Check if email is already used
        const existingEmail = await pool.query('SELECT id FROM sellers WHERE email = $1 AND id != $2', [email, pendingRegistration.userId]);
        if (existingEmail.rows.length > 0) {
            req.flash('error', 'Cet email est déjà utilisé.');
            return res.redirect('/complete-instagram-profile');
        }
        
        // Update user profile with real email
        await pool.query(`
            UPDATE sellers 
            SET email = $1, website = $2
            WHERE id = $3
        `, [email, website || '', pendingRegistration.userId]);
        
        // Send email verification
        const verifyLink = `${process.env.VERIFYLINK}/verify?token=${pendingRegistration.verificationToken}`;
        
        await transporter.sendMail({
            to: email,
            subject: "Confirmez votre email - TajerTrust",
            html: `
                <p>Bienvenue sur TajerTrust!</p>
                <p>Votre compte Instagram (@${pendingRegistration.instagram_username}) a été connecté avec succès.</p>
                <p>Veuillez confirmer votre email en cliquant sur le lien ci-dessous :</p>
                <a href="${verifyLink}">Confirmer mon email</a>
                <p><strong>Important:</strong> Votre compte sera également validé par notre équipe avant activation complète.</p>
            `
        });
        
        // Send notification to admin
        await transporter.sendMail({
            to: process.env.ADMIN_EMAIL || 'admin@tajertrust.com',
            subject: "Nouveau compte Instagram à valider - TajerTrust",
            html: `
                <p>Un nouveau compte Instagram vient de s'inscrire :</p>
                <ul>
                    <li><strong>Business:</strong> ${pendingRegistration.business_name}</li>
                    <li><strong>Instagram:</strong> @${pendingRegistration.instagram_username}</li>
                    <li><strong>Email:</strong> ${email}</li>
                </ul>
                <p>Veuillez valider ce compte dans le tableau de bord admin.</p>
            `
        });
        
        // Clear session data
        delete req.session.pendingRegistration;
        
        req.flash('success', `Inscription terminée! Un email de confirmation a été envoyé à ${email}. Votre compte sera validé par notre équipe sous 24-48h.`);
        res.redirect('/login');
        
    } catch (error) {
        console.error('Complete profile error:', error);
        req.flash('error', 'Erreur lors de la mise à jour du profil.');
        res.redirect('/complete-instagram-profile');
    }
});

module.exports = router;