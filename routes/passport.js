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
      // …your existing local auth logic…
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

