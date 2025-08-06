// File: backend/routes/twitter.js
// Developer: Gemini (Experienced Developer)
// Version: 2.0 - With Thread Handling

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

// --- NEW: Helper function to split text for threads ---
const splitTextIntoChunks = (text, limit = 280) => {
  const words = text.split(' ');
  const chunks = [];
  let currentChunk = '';

  words.forEach(word => {
    if ((currentChunk + ' ' + word).trim().length > limit) {
      chunks.push(currentChunk.trim());
      currentChunk = word;
    } else {
      currentChunk = (currentChunk + ' ' + word).trim();
    }
  });

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  // Add numbering (e.g., 1/n) to each chunk
  const totalChunks = chunks.length;
  if (totalChunks > 1) {
    return chunks.map((chunk, index) => {
      const number = `(${index + 1}/${totalChunks})`;
      const remainingSpace = limit - (number.length + 1);
      if (chunk.length > remainingSpace) {
        return chunk.substring(0, remainingSpace - 3) + '... ' + number;
      }
      return `${chunk} ${number}`;
    });
  }

  return chunks;
};


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

// --- UPDATED Route to post a tweet (with media and thread handling) ---
router.post('/post', upload.single('media'), async (req, res) => {
  const { content, accessToken, isThread } = req.body;
  const file = req.file; // The file object from multer

  if (!accessToken) {
    return res.status(401).json({ details: 'User is not authenticated.' });
  }
  if ((!content || !content.trim()) && !file) {
    return res.status(400).json({ details: 'Post content or a media file is required.' });
  }

  try {
    const userClient = new TwitterApi(accessToken);
    let finalResult;

    // --- NEW: LOGIC FOR THREADS ---
    if (isThread === 'true') {
      if (!content) {
        return res.status(400).json({ details: 'Cannot post an empty thread.' });
      }
      const tweetChunks = splitTextIntoChunks(content);
      let lastTweetID = null;

      // Use a for...of loop to post sequentially, as each tweet depends on the previous one
      for (const chunk of tweetChunks) {
        const tweetOptions = {};
        if (lastTweetID) {
          tweetOptions.reply = { in_reply_to_tweet_id: lastTweetID };
        }
        
        const result = await userClient.v2.tweet(chunk, tweetOptions);
        lastTweetID = result.data.id;
        finalResult = result; // Store the last tweet's result
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