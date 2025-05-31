const express = require('express');
const axios = require('axios');
const router = express.Router();

const clientId = process.env.INSTAGRAM_CLIENT_ID;
const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
const redirectUri = process.env.INSTA_REDIRECT_URI; // e.g. https://yourapp.onrender.com/profile/instagram/callback

// Step 1: Redirect to Instagram login
// router.get('/instagram/login', (req, res) => {
//   const igAuthUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile&response_type=code`;
//   res.redirect(igAuthUrl);
// });
router.get('/instagram/login', (req, res) => {
  const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${process.env.INSTAGRAM_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.INSTAGRAM_REDIRECT_URI)}` +
    `&scope=instagram_basic,instagram_graph_user_profile,pages_show_list` +
    `&response_type=code` +
    `&state=trustcart123`;

  res.redirect(authUrl);
});


// Step 2: Callback to exchange code for access token
router.get('/instagram/callback', async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange code for access token
    const tokenResponse = await axios.get(`https://graph.facebook.com/v19.0/oauth/access_token`, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      },
    });

    const accessToken = tokenResponse.data.access_token;

    // Get user ID
    const meResponse = await axios.get(`https://graph.facebook.com/v19.0/me`, {
      params: {
        fields: 'id,name',
        access_token: accessToken,
      },
    });

    const fbUserId = meResponse.data.id;

    // Get pages connected to user
    const pagesResponse = await axios.get(`https://graph.facebook.com/v19.0/${fbUserId}/accounts`, {
      params: { access_token: accessToken },
    });

    const page = pagesResponse.data.data[0]; // Assuming 1st page
    const pageAccessToken = page.access_token;

    // Get Instagram business account ID from the page
    const igAccountResponse = await axios.get(`https://graph.facebook.com/v19.0/${page.id}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: pageAccessToken,
      },
    });

    const igUserId = igAccountResponse.data.instagram_business_account.id;

    // Get Instagram user profile
    const igProfile = await axios.get(`https://graph.facebook.com/v19.0/${igUserId}`, {
      params: {
        fields: 'username,biography,profile_picture_url',
        access_token: pageAccessToken,
      },
    });

    const igData = igProfile.data;
    res.send(`<h2>Welcome ${igData.username}</h2><p>Bio: ${igData.biography}</p><img src="${igData.profile_picture_url}" width="100" />`);

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).send('Instagram login failed.');
  }
});

module.exports = router;
