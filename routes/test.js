const express = require('express');
const router = express.Router();
const pool = require('../db'); // or correct path to db.js

router.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.send(`Database connected: ${result.rows[0].now}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).send('Database connection failed');
  }
});
// router.get('/db-tables', async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT table_name 
//       FROM information_schema.tables 
//       WHERE table_schema = 'public'
//     `);
//     res.json(result.rows);
//   } catch (error) {
//     console.error('Error listing tables:', error);
//     res.status(500).send('Error listing tables');
//   }
// });


module.exports = router;
