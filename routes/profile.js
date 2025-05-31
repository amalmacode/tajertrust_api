const express = require('express');
const axios = require('axios');
const router = express.Router();

const clientId = process.env.INSTAGRAM_CLIENT_ID;
const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
const redirectUri = process.env.INSTAGRAM_REDIRECT_URI; // e.g. https://yourapp.onrender.com/profile/instagram/callback

// Step 1: Redirect to Instagram login
// router.get('/instagram/login', (req, res) => {
//   const igAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile&response_type=code`;
//   res.redirect(igAuthUrl);
// });
router.get('/instagram/login', (req, res) => {
  // const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
  //   `client_id=${process.env.INSTAGRAM_CLIENT_ID}` +
  //   `&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI)}` +
  //   `&scope=instagram_basic,user_profile,user_media,pages_show_list` +
  //   `&response_type=code` +
  //   `&state=trustcart123`;

  const authUrl = `https://api.instagram.com/oauth/authorize?` +
    `client_id=${process.env.INSTAGRAM_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI)}` +
    `&scope=user_profile,user_media` +
    `&response_type=code` +
    `&state=trustcart123`;

  res.redirect(authUrl);
});


// Step 2: Callback to exchange code for access token
router.get('/instagram/callback', async (req, res) => {
  const code = req.query.code;

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await axios.post(`https://graph.facebook.com/v19.0/oauth/access_token`, null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      },
    });

    const accessToken = tokenRes.data.access_token;

    // Step 2: Get Page connected to user
    const pagesRes = await axios.get(`https://graph.facebook.com/me/accounts`, {
      params: {
        access_token: accessToken,
      },
    });

    const page = pagesRes.data.data[0];
    const pageAccessToken = page.access_token;
    const pageId = page.id;

    // Step 3: Get Instagram Business Account ID
    const igRes = await axios.get(`https://graph.facebook.com/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken,
      },
    });

    const igUserId = igRes.data.instagram_business_account.id;

    // Step 4: Fetch Instagram Profile Data
    const profileRes = await axios.get(`https://graph.facebook.com/${igUserId}`, {
      params: {
        fields: 'username,biography,profile_picture_url',
        access_token: pageAccessToken,
      },
    });

    const profile = profileRes.data;

    // Render simple profile view
    res.send(`
      <h2>Welcome ${profile.username}</h2>
      <p><strong>Bio:</strong> ${profile.biography || 'No bio set'}</p>
      <img src="${profile.profile_picture_url}" alt="Profile Picture" width="150" />
    `);
  } catch (error) {
    console.error('Instagram login error:', error.response?.data || error.message);
    res.status(500).send('Instagram login failed.');
  }
});
module.exports = router;
