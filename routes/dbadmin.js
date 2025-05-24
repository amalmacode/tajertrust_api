// routes/dbadmin.js
const express = require('express');
const router = express.Router();
const pool = require('../db'); // correct path to db.js

router.get('/dbadmin', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sellers LIMIT 10'); // change table name
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;
