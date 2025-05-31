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


// Step 2: Handle callback and exchange code for access token
router.get('/instagram/callback', async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await axios.post(`https://api.instagram.com/oauth/access_token`, null, {
      params: {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      },
    });

    const accessToken = tokenResponse.data.access_token;
    const userId = tokenResponse.data.user_id;

    // Step 3: Use token to get profile info
    const userResponse = await axios.get(`https://graph.instagram.com/${userId}`, {
      params: {
        fields: 'id,username,account_type,biography,profile_picture_url',
        access_token: accessToken,
      },
    });

    const userData = userResponse.data;

    // Store to DB or session if needed
    res.send(`<h2>Welcome ${userData.username}</h2><p>Bio: ${userData.biography}</p>`);
  } catch (err) {
    console.error('Error fetching Instagram data:', err.response?.data || err.message);
    res.status(500).send('Instagram login failed.');
  }
});

module.exports = router;
