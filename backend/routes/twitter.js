// File: backend/routes/twitter.js

const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const router = express.Router();

// Initialize the client with your app's credentials
const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});

// The callback URL is now a fixed backend route.
// It MUST match the URL you register in the Twitter Developer Portal.
const callbackURL = `${process.env.BACKEND_URL}/api/twitter/callback`;

// Temporary store for security tokens. In a real production app, use a database or Redis.
const tempStore = {};

// --- Route to start the authentication flow ---
router.get('/auth', (req, res) => {
  // Generate the OAuth 2.0 Authorization URL
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    callbackURL,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );

  // Store the security tokens to be used in the callback
  tempStore.codeVerifier = codeVerifier;
  tempStore.state = state;

  // Redirect the user to Twitter's authorization page
  res.redirect(url);
});

// --- Callback route that Twitter redirects to ---
// This endpoint is now hit by Twitter directly.
router.get('/callback', async (req, res) => {
  try {
    const { state, code } = req.query;
    const { codeVerifier, state: storedState } = tempStore;

    // Verify that the state matches to prevent CSRF attacks
    if (!state || !code || !storedState || !codeVerifier || state !== storedState) {
      throw new Error('You denied the app or your session expired!');
    }

    // Exchange the authorization code for an access token
    const { accessToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackURL,
    });
    
    // THE FINAL STEP: Redirect the user back to the frontend with the token.
    res.redirect(`${process.env.FRONTEND_URL}?twitter_token=${accessToken}`);

  } catch (error) {
    console.error('Twitter OAuth error:', error);
    // If something goes wrong, redirect to frontend with a generic error
    res.redirect(`${process.env.FRONTEND_URL}?error=twitter_failed`);
  }
});

// --- Route to post a tweet (This remains the same) ---
router.post('/post', async (req, res) => {
  const { content, accessToken } = req.body;

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