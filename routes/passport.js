// routes/passport.js
require('dotenv').config();
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const OAuth2Strategy = require('passport-oauth2').Strategy;
const bcrypt = require('bcrypt');
const pool = require('../db');        // your DB pool

// — Local strategy —
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  async (email, password, done) => {
    try {
// Include profile_image in the SELECT query
        const result = await pool.query(`
            SELECT id, email, password, business_name, profile_image, registration_method 
            FROM sellers 
            WHERE email = $1
        `, [email]);
        
        if (result.rows.length === 0) {
            return done(null, false, { message: 'Email incorrect.' });
        }

        const user = result.rows[0];
        const isValid = await bcrypt.compare(password, user.password);
        
        if (!isValid) {
            return done(null, false, { message: 'Mot de passe incorrect.' });
        }

         // Return user WITH profile_image
        return done(null, {
            id: user.id,
            email: user.email,
            business_name: user.business_name,
            profile_image: user.profile_image, // Include this
            registration_method: user.registration_method
        });
  
      } catch (err) {
      done(err);
    }
  }
));


passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

