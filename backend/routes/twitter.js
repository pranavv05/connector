// File: backend/routes/twitter.js
// Developer: Gemini (Experienced Developer)
// Version: 3.0 - With Manual Thread Handling

const express = require('express');
const { TwitterApi } = require('twitter-api-v2');
const router = express.Router();
const multer = require('multer');

// --- Multer Configuration (Unchanged) ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Twitter Client & Config (Unchanged) ---
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

// --- UPDATED Route to handle single tweets, media, and now MANUAL threads ---
router.post('/post', upload.single('media'), async (req, res) => {
  // --- UPDATED: Look for `tweets` array for threads ---
  const { content, accessToken, tweets } = req.body;
  const file = req.file; 

  if (!accessToken) {
    return res.status(401).json({ details: 'User is not authenticated.' });
  }

  // Check if any form of content exists
  const hasThreadContent = tweets && JSON.parse(tweets).length > 0;
  const hasSingleTweetContent = content && content.trim();
  if (!hasThreadContent && !hasSingleTweetContent && !file) {
    return res.status(400).json({ details: 'Post content or a media file is required.' });
  }

  try {
    const userClient = new TwitterApi(accessToken);
    let finalResult;

    // --- NEW LOGIC: Handle manual thread from frontend `tweets` array ---
    if (hasThreadContent) {
      const tweetChunks = JSON.parse(tweets);
      if (!Array.isArray(tweetChunks) || tweetChunks.length === 0) {
        return res.status(400).json({ details: 'Invalid thread format received.' });
      }
      
      let lastTweetID = null;

      // Use a for...of loop to post sequentially, as each tweet depends on the previous one
      for (const chunk of tweetChunks) {
        const tweetOptions = {};
        if (lastTweetID) {
          tweetOptions.reply = { in_reply_to_tweet_id: lastTweetID };
        }
        
        const result = await userClient.v2.tweet(chunk, tweetOptions);
        lastTweetID = result.data.id;
        finalResult = result; // Store the last tweet's result to send back
      }
    
    // --- EXISTING LOGIC FOR MEDIA TWEETS (Unchanged) ---
    } else if (file) {
      // Step 1: Upload the media. The `uploadMedia` method needs the raw file buffer.
      const mediaId = await userClient.v1.uploadMedia(file.buffer, { mimeType: file.mimetype });

      // Step 2: Post the tweet and attach the `media_id` obtained in Step 1.
      finalResult = await userClient.v2.tweet(content || '', {
        media: { media_ids: [mediaId] }
      });
    
    // --- EXISTING LOGIC FOR TEXT-ONLY TWEETS (Unchanged) ---
    } else {
      finalResult = await userClient.v2.tweet(content);
    }
    
    res.status(200).json({
      message: 'Post successful!',
      data: finalResult.data,
    });
  } catch (error) {
    // Provide more specific error details from the Twitter API if available
    const errorDetails = error.data?.detail || error.message || 'An unknown error occurred.';
    console.error('Error posting to Twitter:', errorDetails);
    res.status(500).json({ error: 'Failed to post to Twitter.', details: errorDetails });
  }
});

module.exports = router;