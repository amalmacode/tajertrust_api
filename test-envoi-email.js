const bcrypt = require('bcrypt');
const pool = require('./db'); 


(async () => {
  const email = 'amaldotrading@gmail.com';
  const plainPassword = 'testo';
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  try {
    await pool.query(
      'INSERT INTO admins (email, password) VALUES ($1, $2)',
      [email, hashedPassword]
    );
    console.log('✅ Admin inserted successfully with hashed password!');
  } catch (err) {
    console.error('❌ Error inserting admin:', err.message);
  } finally {
    await pool.end();
  }
})();
