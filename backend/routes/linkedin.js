// File: backend/routes/linkedin.js

const express = require('express');
const axios = require('axios');
const router = express.Router();
const multer = require('multer');

// --- Multer Configuration ---
// Use memoryStorage to hold the file buffer temporarily before uploading
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- LinkedIn API Constants & Config ---
const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';
const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;
const redirectUri = `${process.env.BACKEND_URL}/api/linkedin/callback`;

// --- Authentication & Callback Routes (Unchanged) ---
router.get('/auth', (req, res) => {
  const scope = 'openid profile w_member_social';
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linkedinClientId,
    redirect_uri: redirectUri,
    scope: scope, 
    state: 'random_state_string_for_linkedin'
  });
  res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
});

router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=linkedin_auth_failed`);
    }
    const tokenResponse = await axios.post(
      LINKEDIN_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: linkedinClientId,
        client_secret: linkedinClientSecret
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token } = tokenResponse.data;
    res.redirect(`${process.env.FRONTEND_URL}?linkedin_token=${access_token}`);
  } catch (error) {
    console.error('LinkedIn OAuth error:', error.response?.data || error.message);
    res.redirect(`${process.env.FRONTEND_URL}?error=linkedin_token_failed`);
  }
});

// --- Helper function to get User ID (Unchanged) ---
async function getLinkedInUserId(accessToken) {
    try {
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        return response.data.sub;
    } catch (error) {
        console.error('Error getting LinkedIn user ID:', error.response?.data || error.message);
        throw new Error('Failed to get LinkedIn user ID. Token may be expired.');
    }
}

// --- UPDATED Route to post content (with media handling) ---
// We add the `upload.single('media')` middleware to process the file
router.post('/post', upload.single('media'), async (req, res) => {
  try {
    const { content, accessToken } = req.body;
    const file = req.file; // The file object from multer

    if ((!content || !content.trim()) && !file) {
      return res.status(400).json({ details: 'Content or a media file is required.' });
    }
    if (!accessToken) {
      return res.status(400).json({ details: 'Access token is required.' });
    }

    const userId = await getLinkedInUserId(accessToken);
    const authorUrn = `urn:li:person:${userId}`;
    let postBody = {};

    // --- LOGIC FOR MEDIA POSTS ---
    if (file) {
      // STEP A: Register the upload to get an upload URL
      const registerUploadResponse = await axios.post(
        `${LINKEDIN_API_URL}/assets?action=registerUpload`,
        {
          registerUploadRequest: {
            recipes: [file.mimetype.startsWith('image/') ? "urn:li:digitalmediaRecipe:feedshare-image" : "urn:li:digitalmediaRecipe:feedshare-video"],
            owner: authorUrn,
            serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }]
          }
        },
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      const uploadUrl = registerUploadResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const assetUrn = registerUploadResponse.data.value.asset;

      // STEP B: Upload the file's raw data (buffer) to the URL from Step A
      await axios.put(uploadUrl, file.buffer, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': file.mimetype }
      });

      // STEP C: Construct the final post body, referencing the uploaded asset
      postBody = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content || "" },
            shareMediaCategory: file.mimetype.startsWith('image/') ? "IMAGE" : "VIDEO",
            media: [{ status: 'READY', media: assetUrn }]
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };
    
    // --- LOGIC FOR TEXT-ONLY POSTS ---
    } else {
      postBody = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };
    }

    // --- Execute the final post creation API call ---
    const postResponse = await axios.post(`${LINKEDIN_API_URL}/ugcPosts`, postBody, {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' }
    });

    res.json({ success: true, message: 'Successfully posted to LinkedIn', data: postResponse.data });

  } catch (error) {
    const errorDetails = error.response?.data?.message || error.message || 'An internal error occurred.';
    console.error('LinkedIn posting error:', errorDetails);
    res.status(500).json({ error: 'Failed to post to LinkedIn', details: errorDetails });
  }
});

module.exports = router;