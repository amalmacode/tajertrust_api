
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');

const app = express();
// That tells Express "I'm behind Nginx, trust the X-Forwarded-For header it passes." Without it, express-rate-limit gets confused because it sees the header but Express says to ignore it.
app.set('trust proxy', 1); 


// 1. Security & Global Middleware
app.use(helmet());
// app.use(cors({ origin: 
//   process.env.ALLOWED_ORIGINS?.split(',') || '*' }));
app.use(cors({
  // origin: [
  //   'http://localhost:3001', // mobile app dev
  //   'http://localhost:5173', // if Vite
  //   'https://tajertrust.com', // production later
  //   'capacitor://localhost',// ← Capacitor Android
  //   'ionic://localhost', // ← just in case
  //   null,              // ← some mobile builds send no origin
    
  // ],
  

  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:3001',
      'http://localhost:5173',
      'https://tajertrust.com',
      'capacitor://localhost',  // ← Capacitor Android
      'https://localhost',
      'ionic://localhost',       // ← just in case
      null,                      // ← some mobile builds send no origin
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Web Session Configuration (Preserving Compatibility)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// 3. API Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
  validate: {
    xForwardedForHeader: false,
    trustProxy: false,
  }
});

// 4. View Engine for Web App
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 5. Route Mounting
// Web Routes (Sessions + EJS)
// app.use('/auth', require('./routes/auth'));
// app.use('/users', require('./routes/users'));

// API health check
app.get("/", (req, res) => {
  res.send("TajerTrust API V1");
});
// API V1 Routes (Stateless + JSON)
const apiRouter = express.Router();
apiRouter.use(apiLimiter);
apiRouter.use('/auth', require('./routes/api/v1/auth.api'));
apiRouter.use('/users', require('./routes/api/v1/users.api'));
apiRouter.use('/blacklist', require('./routes/api/v1/blacklist.api'));
apiRouter.use('/admin', require('./routes/api/v1/admin.api'));
apiRouter.use('/keys', require('./routes/api/v1/keys.api'));

app.use('/api/v1', apiRouter);

// 6. Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    data: null,
    error: { code: 'SERVER_ERROR', message: err.message }
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`TajerTrust API V1 running on port ${PORT}`));

module.exports = app;
