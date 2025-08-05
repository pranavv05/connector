// File: backend/routes/twitter.js

const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const router = express.Router();
const multer = require('multer');

// --- Multer Configuration ---
// Use memoryStorage to hold the file buffer before uploading to Twitter
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Twitter Client & Config ---
const client = new TwitterApi({
  clientId: process.env.TWITTER_CLIENT_ID,
  clientSecret: process.env.TWITTER_CLIENT_SECRET,
});
const callbackURL = `${process.env.BACKEND_URL}/api/twitter/callback`;
const tempStore = {};

// --- Authentication & Callback Routes (Unchanged) ---
router.get('/auth', (req, res) => {
  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    callbackURL,
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );
  tempStore.codeVerifier = codeVerifier;
  tempStore.state = state;
  res.redirect(url);
});

router.get('/callback', async (req, res) => {
  try {
    const { state, code } = req.query;
    const { codeVerifier, state: storedState } = tempStore;
    if (!state || !code || !storedState || !codeVerifier || state !== storedState) {
      throw new Error('You denied the app or your session expired!');
    }
    const { accessToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackURL,
    });
    res.redirect(`${process.env.FRONTEND_URL}?twitter_token=${accessToken}`);
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=twitter_failed`);
  }
});

// --- UPDATED Route to post a tweet (with media handling) ---
// Add the `upload.single('media')` middleware to handle file uploads
router.post('/post', upload.single('media'), async (req, res) => {
  const { content, accessToken } = req.body;
  const file = req.file; // The file object from multer

  if (!accessToken) {
    return res.status(401).json({ details: 'User is not authenticated.' });
  }
  if ((!content || !content.trim()) && !file) {
    return res.status(400).json({ details: 'Tweet content or a media file is required.' });
  }

  try {
    const userClient = new TwitterApi(accessToken);
    let postResult;

    // --- LOGIC FOR MEDIA TWEETS ---
    if (file) {
      // Step 1: Upload the media. The `uploadMedia` method needs the raw file buffer.
      const mediaId = await userClient.v1.uploadMedia(file.buffer, { mimeType: file.mimetype });

      // Step 2: Post the tweet and attach the `media_id` obtained in Step 1.
      postResult = await userClient.v2.tweet(content || '', {
        media: { media_ids: [mediaId] }
      });
    
    // --- LOGIC FOR TEXT-ONLY TWEETS ---
    } else {
      postResult = await userClient.v2.tweet(content);
    }
    
    res.status(200).json({
      message: 'Tweet posted successfully!',
      data: postResult.data,
    });
  } catch (error) {
    // Provide more specific error details from the Twitter API if available
    const errorDetails = error.data?.detail || error.message || 'An unknown error occurred.';
    console.error('Error posting tweet:', errorDetails);
    res.status(500).json({ error: 'Failed to post tweet.', details: errorDetails });
  }
});

module.exports = router;