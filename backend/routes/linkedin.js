// File: backend/routes/linkedin.js

const express = require('express');
const axios = require('axios');
const router = express.Router();

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

const linkedinClientId = process.env.LINKEDIN_CLIENT_ID;
const linkedinClientSecret = process.env.LINKEDIN_CLIENT_SECRET;

// The callback URI is now a fixed backend route.
// It MUST match the URL you register in the LinkedIn Developer Portal.
const redirectUri = `${process.env.BACKEND_URL}/api/linkedin/callback`;

// --- Route to start the authentication flow ---
router.get('/auth', (req, res) => {
  // Use the OpenID scopes to match your LinkedIn App Product
  const scope = 'openid profile w_member_social';
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: linkedinClientId,
    redirect_uri: redirectUri, // This now correctly points to our backend callback
    scope: scope, 
    state: 'random_state_string_for_linkedin' // Use a unique state
  });

  // Redirect the user to LinkedIn's authorization page
  res.redirect(`${LINKEDIN_AUTH_URL}?${params.toString()}`);
});

// --- Callback route that LinkedIn redirects to ---
// This endpoint is now hit by LinkedIn directly.
router.get('/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
        console.error("LinkedIn callback is missing authorization code.", req.query);
        // Redirect to frontend with an error message
        return res.redirect(`${process.env.FRONTEND_URL}?error=linkedin_auth_failed`);
    }
    
    // Exchange the authorization code for an access token
    const tokenResponse = await axios.post(
      LINKEDIN_TOKEN_URL,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri, // This must match the URI used in the /auth route
        client_id: linkedinClientId,
        client_secret: linkedinClientSecret
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, expires_in } = tokenResponse.data;
    
    // THE FINAL STEP: Redirect the user back to the frontend with the token.
    res.redirect(`${process.env.FRONTEND_URL}?linkedin_token=${access_token}&expires_in=${expires_in}`);
    
  } catch (error) {
    console.error('LinkedIn OAuth error:', error.response?.data || error.message);
    // If something goes wrong, redirect to frontend with a generic error
    res.redirect(`${process.env.FRONTEND_URL}?error=linkedin_token_failed`);
  }
});

// --- Helper function to get User ID ---
// This is the single, correct function for the OpenID Connect flow
async function getLinkedInUserId(accessToken) {
    try {
        // Use the /userinfo endpoint which is authorized by the 'openid' and 'profile' scopes
        const response = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        // The user's ID is in the 'sub' (subject) field for OpenID responses
        return response.data.sub;
      } catch (error) {
        console.error('Error getting LinkedIn user ID from /userinfo:', error.response?.data || error.message);
        throw new Error('Failed to get LinkedIn user ID');
      }
}

// --- Route to post content to LinkedIn ---
router.post('/post', async (req, res) => {
  try {
    const { content, accessToken } = req.body;
    
    if (!content || !accessToken) {
      return res.status(400).json({ error: 'Content and access token are required' });
    }

    // This will now call the single, correct getLinkedInUserId function
    const userId = await getLinkedInUserId(accessToken);

    const postResponse = await axios.post(
      `${LINKEDIN_API_URL}/ugcPosts`,
      {
        author: `urn:li:person:${userId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': { shareCommentary: { text: content }, shareMediaCategory: 'NONE' }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      },
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'X-Restli-Protocol-Version': '2.0.0' } }
    );

    res.json({ success: true, message: 'Successfully posted to LinkedIn', data: postResponse.data });

  } catch (error) {
    // Now this will catch the error from the correct helper function
    console.error('LinkedIn posting error:', error.message);
    res.status(500).json({ error: 'Failed to post to LinkedIn', details: error.message });
  }
});

module.exports = router;