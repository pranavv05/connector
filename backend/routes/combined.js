const express = require('express');
const axios = require('axios');
const router = express.Router();

// Import the individual platform routes
const linkedinRouter = require('./linkedin');
const twitterRouter = require('./twitter');

// Combined post to both platforms
router.post('/post', async (req, res) => {
  try {
    const { content, linkedinAccessToken, twitterAccessToken, twitterAccessTokenSecret } = req.body;

    if (!content) {
      return res.status(400).json({ 
        error: 'Content is required' 
      });
    }

    // Array to store results from each platform
    const results = {
      linkedin: null,
      twitter: null,
      errors: []
    };

    // Post to LinkedIn if access token is provided
    if (linkedinAccessToken) {
      try {
        const linkedinResponse = await axios.post(
          'http://localhost:3001/api/linkedin/post',
          { content, accessToken: linkedinAccessToken },
          { headers: { 'Content-Type': 'application/json' }}
        );
        results.linkedin = {
          success: true,
          data: linkedinResponse.data
        };
      } catch (error) {
        console.error('Error posting to LinkedIn:', error.response?.data || error.message);
        results.errors.push({
          platform: 'linkedin',
          error: error.response?.data || error.message
        });
      }
    }

    // Post to Twitter if access token is provided
    if (twitterAccessToken && twitterAccessTokenSecret) {
      try {
        const twitterResponse = await axios.post(
          'http://localhost:3001/api/twitter/post',
          { 
            content,
            accessToken: twitterAccessToken,
            accessTokenSecret: twitterAccessTokenSecret
          },
          { headers: { 'Content-Type': 'application/json' }}
        );
        results.twitter = {
          success: true,
          data: twitterResponse.data
        };
      } catch (error) {
        console.error('Error posting to Twitter:', error.response?.data || error.message);
        results.errors.push({
          platform: 'twitter',
          error: error.response?.data || error.message
        });
      }
    }

    // Check if any platform was successfully posted to
    const hasSuccess = results.linkedin?.success || results.twitter?.success;
    const statusCode = hasSuccess ? 
      (results.errors.length > 0 ? 207 : 200) : // Partial success
      500; // Complete failure

    res.status(statusCode).json({
      success: hasSuccess,
      message: hasSuccess ? 
        (results.errors.length > 0 ? 'Partial success' : 'Successfully posted to all selected platforms') :
        'Failed to post to any platform',
      results
    });

  } catch (error) {
    console.error('Error in combined post:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      details: error.message
    });
  }
});

// Get combined profile information
router.get('/profile', async (req, res) => {
  try {
    const { linkedinAccessToken, twitterAccessToken } = req.query;
    const results = {
      linkedin: null,
      twitter: null,
      errors: []
    };

    // Get LinkedIn profile if token is provided
    if (linkedinAccessToken) {
      try {
        const response = await axios.get(
          'http://localhost:3001/api/linkedin/profile',
          { params: { accessToken: linkedinAccessToken }}
        );
        results.linkedin = response.data;
      } catch (error) {
        console.error('Error fetching LinkedIn profile:', error.response?.data || error.message);
        results.errors.push({
          platform: 'linkedin',
          error: error.response?.data || error.message
        });
      }
    }

    // Get Twitter profile if token is provided
    if (twitterAccessToken) {
      try {
        const response = await axios.get(
          'http://localhost:3001/api/twitter/profile',
          { params: { accessToken: twitterAccessToken }}
        );
        results.twitter = response.data;
      } catch (error) {
        console.error('Error fetching Twitter profile:', error.response?.data || error.message);
        results.errors.push({
          platform: 'twitter',
          error: error.response?.data || error.message
        });
      }
    }

    // Determine status code
    const hasData = results.linkedin || results.twitter;
    const statusCode = hasData ? 
      (results.errors.length > 0 ? 207 : 200) : // Partial success
      500; // Complete failure

    res.status(statusCode).json({
      success: hasData,
      message: hasData ? 
        (results.errors.length > 0 ? 'Partial success' : 'Successfully retrieved all profiles') :
        'Failed to retrieve any profile data',
      data: results
    });

  } catch (error) {
    console.error('Error in combined profile fetch:', error);
    res.status(500).json({
      success: false,
      error: 'An unexpected error occurred',
      details: error.message
    });
  }
});

module.exports = router;
