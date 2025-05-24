const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const pool = require('./db'); // adjust this to your db file
const path = require('path');
// const MongoStore = require('connect-mongo');
const { setAdminFlag } = require('./middlewares/auth');

require('dotenv').config();

const authRoutes = require('./routes/auth');

// Test Connection Route : test.js / dbadmin
// const testRoutes = require('./routes/test'); // adjust path
// const dbAdminRoutes = require('./routes/dbadmin');

const app = express();
// app.use('/', testRoutes); // test database connection
// app.use('/', dbAdminRoutes); // test dbadmin
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

app.use(expressLayouts);
app.set('layout', 'layout'); // default layout

// Add this to make links blue when clicked 
app.locals.isActive = function (currentPath, linkPath) {
  return currentPath === linkPath ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500';
};
// make sure the uploads folder is public 
app.use('/uploads', express.static('public/uploads'));
// make sure the csv file is public 
app.use(express.static('public'));


//use session before passport
app.use(session({
  secret: process.env.SESSION_SECRET, // change to strong secret in production
  resave: false,
  saveUninitialized: false ,
  cookie: {
    // ⚠️ Ne pas fixer maxAge ici directement si tu le changes dynamiquement dans /login
    secure: false, // true si HTTPS (en production)
    httpOnly: true,
  }
  // store: MongoStore.create({ mongoUrl: 'mongodb://localhost/session-db' })
  
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());
// Make isAdmin available to all views
app.use(setAdminFlag);

// use passport 
passport.use(new LocalStrategy(
  {
    usernameField: 'email', // this matches the name of your form input
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
            // First, try to authenticate as seller
      let result = await pool.query('SELECT * FROM sellers WHERE email = $1', [username]);
      let user = result.rows[0];

      if (user) {
        if (!user.is_verified) {
          return done(null, false, {
            message: 'Veuillez confirmer votre Email.'
          });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          return done(null, false, { message: 'Email ou password est incorrect' });
        }

        if (!user.is_validated) {
          return done(null, false, {
            message: "Votre compte est en attente de validation ou a été dévalidé. contacter notre support par email pour plus d'informations"
          });
        }
        user.role = 'seller'; // 👈 Add role

        return done(null, user);
      }
     // If not seller, try admin
     result = await pool.query('SELECT * FROM admins WHERE email = $1', [username]);
     user = result.rows[0];

     if (!user) {
       return done(null, false, {
         message: 'Incorrect email or password.'
       });
     }

     const match = await bcrypt.compare(password, user.password);
     if (!match) {
       return done(null, false, { message: 'Incorrect email or password.' });
     }
     user.role = 'admin'; // 👈 Add role

     return done(null, user);
    
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  // Save both role and ID to session
  done(null, { id: user.id, role: user.role });
});

passport.deserializeUser(async (userSession, done) => {
  try {
    const { id, role } = userSession;

    if (role === 'admin') {
      const result = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
      const admin = result.rows[0];
      if (admin) {
        admin.role = 'admin';
        return done(null, admin);
      }
    } else {
      const result = await pool.query('SELECT * FROM sellers WHERE id = $1', [id]);
      const seller = result.rows[0];
      if (seller) {
        seller.role = 'seller';
        return done(null, seller);
      }
    }

    done(null, false);
  } catch (err) {
    done(err, null);
  }
});

// we could write the code above in a separate file passport-config.js , w'll do it later

app.use(flash()); // chnages to make notification in register page
// takes care of messages above the pages
// app.use((req, res, next) => {
//   res.locals.messages = req.flash();
//   next();
// });

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// add this middleware to log every incoming request:
app.use((req, res, next) => {
  console.log(`📩 ${req.method} ${req.url}`);
  next();
});

app.use('/', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
