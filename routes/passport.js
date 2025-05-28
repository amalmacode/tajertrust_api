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

// — TikTok OAuth strategy —
passport.use('tiktok', new OAuth2Strategy({
    authorizationURL:  'https://www.tiktok.com/v2/auth/authorize/',
    tokenURL:          'https://open.tiktokapis.com/v2/oauth/token/',
    clientID:          process.env.TIKTOK_CLIENT_ID,
    clientSecret:      process.env.TIKTOK_CLIENT_SECRET,
    callbackURL:       process.env.TIKTOK_CALLBACK_URL,
    scope:             ['user.info.basic'],
    state:             true
  },
  async (accessToken, refreshToken, params, done) => {
    try {
      // fetch profile from TikTok API…
      const res = await fetch('https://open.tiktokapis.com/v2/user/info/', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const json = await res.json();
      return done(null, { username: json.data.user.username });
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

