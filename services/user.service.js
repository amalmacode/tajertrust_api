
const db = require('../db/pool');
const axios = require('axios');
const jwt = require('jsonwebtoken');

class UserService {
  /**
   * Retrieves a user profile from sellers table.
   */
  async getProfile(userId) {
    const query = `
      SELECT id, email, business_name, social_link, instagram_username,
             is_email_verified, is_social_verified, 
             is_validated,role, created_at, last_login, profile_image 
      FROM sellers 
      WHERE id = $1
    `;
    const { rows } = await db.query(query, [userId]);
    return rows[0];
  }

  /**
   * Updates seller profile fields.
   */
  async updateProfile(userId, updateData) {
    const { business_name, email, website } = updateData;
    
    const query = `
      UPDATE sellers 
      SET business_name = COALESCE($1, business_name), 
          email = COALESCE($2, email),
          website = COALESCE($3, website)
      WHERE id = $4 
      RETURNING id, email, business_name
    `;
    
    const { rows } = await db.query(query, [business_name, email, website, userId]);
    if (rows.length === 0) throw new Error('USER_NOT_FOUND');
    
    return rows[0];
  }

  /**
   * Generate Instagram OAuth URL
   */
  generateInstagramAuthUrl(user) {
    const stateToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    const redirectUri = process.env.NODE_ENV === 'production'
            ?process.env.FACEBOOK_REDIRECT_URI
           : process.env.LOCAL_REDIRECT_URI;
     console.log("RedirectURI: ", redirectUri)
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=business_management,pages_show_list,instagram_basic&response_type=code&state=${stateToken}`;
  }

  /**
   * Handle Instagram callback
   */
  async handleInstagramCallback(code, state) {
    // 1️⃣ Verify state JWT
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
      const redirectUri = process.env.NODE_ENV === 'production'
            ? process.env.FACEBOOK_REDIRECT_URI
            : process.env.LOCAL_REDIRECT_URI;
     console.log("ediectURI: ", redirectUri)
    // 2️⃣ Exchange code for access token
    const tokenResponse = await axios.get(
      `https://graph.facebook.com/v21.0/oauth/access_token`,
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          redirect_uri: redirectUri,
          code
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // 3️⃣ Get Instagram business account
    const pagesRes = await axios.get(
      `https://graph.facebook.com/v21.0/me/accounts`,
      { params: { access_token: accessToken } }
    );

    if (!pagesRes.data.data.length) {
      throw new Error('NO_FACEBOOK_PAGES_FOUND');
    }

    const pageId = pagesRes.data.data[0].id;

    const igRes = await axios.get(
      `https://graph.facebook.com/v21.0/${pageId}`,
      {
        params: {
          fields: 'instagram_business_account',
          access_token: accessToken
        }
      }
    );

    if (!igRes.data.instagram_business_account) {
      throw new Error('NO_INSTAGRAM_BUSINESS_ACCOUNT');
    }

    const igId = igRes.data.instagram_business_account.id;

    const igProfile = await axios.get(
      `https://graph.facebook.com/v21.0/${igId}`,
      {
        params: {
          fields: 'username',
          access_token: accessToken
        }
      }
    );

    const username = igProfile.data.username;

    
  // 4️⃣ Check if social_link matches the verified Instagram username
  const sellerResult = await db.query(
    `SELECT social_link FROM sellers WHERE id = $1`,
    [userId]
  );

  const seller = sellerResult.rows[0];
  const socialLink = seller?.social_link || '';

  // Normalize: extract username from URL like https://www.instagram.com/username/
  const extractUsername = (url) => {
    try {
      const clean = url.replace(/\/$/, ''); // remove trailing slash
      return clean.split('/').pop().toLowerCase();
    } catch {
      return '';
    }
  };
     
   if (extractUsername(socialLink) !== username.toLowerCase()) {
      const mismatchErr = new Error('SOCIAL_LINK_MISMATCH');
      mismatchErr.instagramUsername = username;
      throw mismatchErr;
    }

    // 4️⃣ ALL good - Update seller
    await db.query(
      `
      UPDATE sellers
      SET instagram_username = $1,
          instagram_account_id = $2,
          is_social_verified = true,
          social_verified_at = NOW()
      WHERE id = $3
      `,
      [username, igId, userId]
    );

    return { userId, username };
  }

  async updateSocial(userId, socialLink)
   {
    try {
    const result = await db.query(
      `UPDATE sellers
       SET social_link = $1
       WHERE id = $2
       AND is_social_verified = FALSE
       RETURNING id, social_link, is_social_verified`,
      [socialLink, userId]
    );

    if (result.rowCount === 0) {
      return {
        success: false,
        error: 'ALREADY_VERIFIED_OR_NOT_FOUND'
      };
    }

    return {
      success: true,
      data: result.rows[0]
    };

  } catch (error) {
    console.error('users.service.updateSocial error:', error);
    throw error; // let route handle 500
  }
}


  

}

module.exports = new UserService();
