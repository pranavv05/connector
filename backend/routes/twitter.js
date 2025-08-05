// routes/twitter.js - NEW VERSION FOR USER LOGINS
// This line takes the URL from your .env and adds the trailing slash
const CALLBACK_URL = `${process.env.FRONTEND_URL}/`;
const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const router = express.Router();

// 1. Initialize with Client ID and Secret for OAuth 2.0
const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// Temporary store for security tokens. In production, use user sessions.
const tempStore = {};

// 2. ROUTE TO START THE LOGIN FLOW
router.get('/auth', (req, res) => {
  // Generate a unique URL for the user to log in with
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    CALLBACK_URL,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );

  // Store the codeVerifier and state to verify the callback later
  tempStore.codeVerifier = codeVerifier;
  tempStore.state = state;

  // Redirect the user to the generated Twitter login page
  res.redirect(url);
});

// 3. ROUTE TO HANDLE THE CALLBACK FROM TWITTER
router.post('/callback', async (req, res) => {
  const { state, code } = req.body;
  const { codeVerifier, state: storedState } = tempStore;

  if (!codeVerifier || !state || !storedState || !code) {
    return res.status(400).json({ error: 'You denied the app or your session expired!' });
  }
  if (state !== storedState) {
    return res.status(400).json({ error: 'Stored tokens did not match!' });
  }

  try {
    // Exchange the authorization code for an access token
    const { accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: CALLBACK_URL,
    });
    
    // IMPORTANT: Return the access token to the frontend
    res.status(200).json({ accessToken, refreshToken });

  } catch (error) {
    console.error('Error in Twitter callback:', error);
    res.status(500).json({ error: 'Failed to get access token from Twitter' });
  }
});

// 4. ROUTE TO POST A TWEET (NOW REQUIRES A USER'S ACCESS TOKEN)
router.post('/post', async (req, res) => {
  const { content, accessToken } = req.body; // Expect accessToken from frontend

  if (!accessToken) {
    return res.status(401).json({ error: 'User is not authenticated.' });
  }
  if (!content) {
    return res.status(400).json({ error: 'Tweet content cannot be empty.' });
  }

  try {
    // Create a new, temporary client using the user's accessToken
    const userClient = new TwitterApi(accessToken);

    // Post the tweet on behalf of the user
    const postResult = await userClient.v2.tweet(content);
    
    res.status(200).json({
      message: 'Tweet posted successfully!',
      data: postResult.data,
    });
  } catch (error) {
    console.error('Error posting tweet:', error);
    res.status(500).json({ error: 'Failed to post tweet.', details: error.message });
  }
});

module.exports = router;