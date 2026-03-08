
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
    // console.log('sgMail : ',sgMail);
//     sgMail.send({
//       to: email,
//       from: {
//         email: process.env.SENDGRID_FROM_EMAIL,
//         name: process.env.SENDGRID_FROM_NAME || 'TajerTrust'
//       },
//       subject: "Confirmez votre email - TajerTrust",
//       html: `
//         <h2>Bienvenue sur TajerTrust 👋</h2>
//         <p>Bonjour ${business_name},</p>
//         <p>Veuillez confirmer votre email :</p>
//         <a href="${verifyLink}" 
//           style="padding:12px 25px;background:#4F46E5;color:white;text-decoration:none;border-radius:6px;">
//           Confirmer mon email
//         </a>
//       `
//     }).catch(err =>
//   console.error('Email error:', err.response?.body || err.message)
// );;
    
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


}

module.exports = new AuthService();
