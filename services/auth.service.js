
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
const crypto = require('crypto');
require('dotenv').config();
const emailService = require('../services/email.service');


// Add SendGrid instead:
// const sgMail = require('@sendgrid/mail');

// // Configure SendGrid with your API key
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

class AuthService {
  /**
   * Validates credentials and generates a stateless JWT.
   */
  async login(email, password) {
    const query = 'SELECT * FROM sellers WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    const user = rows[0];
    if (!user) throw new Error('USER_NOT_FOUND');
    
    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw new Error('INVALID_CREDENTIALS');
    
    // Status Checks
    if (!user.is_email_verified) 
      throw new Error('ACCOUNT_PENDING_EMAIL_VERIFICATION');
    // {
    //     return res.status(403).json({
    //       success: false,
    //       error: {
    //         code: 'EMAIL_NOT_VERIFIED',
    //         message: 'Veuillez vérifier votre email avant de vous connecter.'
    //       }
    //     });
    //   }
    // if (!user.is_validated) throw new Error('ACCOUNT_PENDING_ADMIN_VALIDATION');
    
    // Update last login
    await db.query('UPDATE sellers SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate JWT for stateless mobile clients
    const token = jwt.sign(
      { id: user.id, 
        email: user.email,
         is_email_verified :user.is_email_verified ,
         is_validated :user.is_validated,
         is_social_verified:user.is_social_verified, 
         social_link: user.social_link, 
         role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { 
     user,
     token };
  }

  /**
   * Registers a new seller into sellers.
   */
 
async register(userData) {
  const { email, password, business_name, social_link} = userData;

  const hashedPassword = await bcrypt.hash(password, 10);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const query = `
    INSERT INTO sellers
    (email, password, business_name, social_link,
     verification_token, created_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id, email
  `;

  const { rows } = await db.query(query, [
    email,
    hashedPassword,
    business_name,
    social_link,
    verificationToken
  ]);

  // Send verification email
    const verifyLink = `${process.env.VERIFYLINK}/api/v1/auth/verify-email?token=${verificationToken}`;
    console.log('verifyLink : ',verifyLink);
  
    await emailService.sendVerificationEmail({
    email,
    verifyLink,
    business_name
  });
    
    return rows[0];
}

async verifyEmailToken(token) {
  if (!token) {
    throw new Error('INVALID_TOKEN');
  }

  const result = await db.query(
    `UPDATE sellers
     SET is_email_verified = TRUE,
         verification_token = NULL
     WHERE verification_token = $1
     RETURNING id`,
    [token]
  );

  if (result.rowCount === 0) {
    throw new Error('INVALID_OR_EXPIRED_TOKEN');
  }

  return result.rows[0];
}


// forgot Password 

async forgotPassword(email) {
  const { rows } = await db.query(
    `SELECT id, email FROM sellers WHERE email = $1`, [email]
  );
  
  // Always return success to prevent email enumeration
  if (!rows[0]) return { success: true };

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.query(
    `UPDATE sellers 
     SET reset_token = $1, reset_token_expires = $2 
     WHERE id = $3`,
    [token, expires, rows[0].id]
  );

  const resetLink = `${process.env.VERIFYLINK}/api/v1/auth/reset-password?token=${token}`;
  
  await emailService.sendPasswordResetEmail({
    email: rows[0].email,
    resetLink
  });

  return { success: true };
}

//  Reset Password 
async resetPassword(token, newPassword) {
  const { rows } = await db.query(
    `SELECT id FROM sellers 
     WHERE reset_token = $1 
     AND reset_token_expires > NOW()`,
    [token]
  );

  if (!rows[0]) throw new Error('INVALID_OR_EXPIRED_TOKEN');

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.query(
    `UPDATE sellers 
     SET password = $1, reset_token = NULL, reset_token_expires = NULL 
     WHERE id = $2`,
    [hashed, rows[0].id]
  );

  return { success: true };
}


}

module.exports = new AuthService();
