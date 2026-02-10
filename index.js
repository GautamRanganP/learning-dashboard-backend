const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
require('dotenv').config();
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const scope = "all";

app.get('/oauth/callback', async (req, res) => {
  const { authCode, state } = req.query;
    console.log("running",authCode,state)
  if (!authCode || !state) {
    return res.status(400).send('Missing code or state parameter');
  }

  try {
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      `${process.env.BASE_URL}/services/api/oauth2/token`,
      {
        grantType: 'authorization_code',
        code: authCode,
        clientId: clientId,
        clientSecret: clientSecret,
        state: state,
        scope: scope
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'cache-control': 'no-cache'
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;
    console.log('Access Token:', accessToken);
    const userInfoResponse = await axios.get(
      `${process.env.BASE_URL}/services/api/oauth2/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const userInfo = userInfoResponse.data;
    console.log('User Info:', userInfo);
    res.json(userInfo);

  } catch (error) {
    console.error('Error during OAuth flow:', error.response ? error.response.data : error.message);
    res.status(500).send('OAuth token exchange or user info retrieval failed');
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});