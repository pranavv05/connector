# Social Media Connector - Backend Setup Guide

This guide will help you set up a backend server to handle LinkedIn and Twitter API integrations for your Social Media Connector frontend.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- LinkedIn Developer Account
- Twitter Developer Account

## 🚀 Quick Start

### 1. Create Backend Directory

```bash
# Create a new directory for your backend
mkdir social-connector-backend
cd social-connector-backend

# Initialize npm project
npm init -y
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install express cors dotenv axios

# Development dependencies
npm install -D nodemon
```

### 3. Project Structure

Create the following structure:

```
social-connector-backend/
├── .env
├── .gitignore
├── package.json
├── server.js
├── routes/
│   ├── linkedin.js
│   └── twitter.js
└── utils/
    └── auth.js
```

### 4. Environment Variables

Create a `.env` file in your backend root:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# LinkedIn API Credentials
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_REDIRECT_URI=http://localhost:3001/auth/linkedin/callback

# Twitter API Credentials (API v2)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
TWITTER_ACCESS_TOKEN=your_twitter_access_token
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret

# Frontend URL for CORS
FRONTEND_URL=http://localhost:8080
```

### 5. Create `.gitignore`

```gitignore
node_modules/
.env
.DS_Store
*.log
```

## 📝 Server Implementation

### Main Server File (`server.js`)

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const linkedinRoutes = require('./routes/linkedin');
const twitterRoutes = require('./routes/twitter');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/twitter', twitterRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Social Connector Backend is running!' });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
});
```

### LinkedIn Routes (`routes/linkedin.js`)

```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST to LinkedIn
router.post('/post', async (req, res) => {
    try {
        const { content, accessToken } = req.body;

        if (!content || !accessToken) {
            return res.status(400).json({ 
                error: 'Content and access token are required' 
            });
        }

        // LinkedIn API v2 - Create post
        const linkedinResponse = await axios.post(
            'https://api.linkedin.com/v2/ugcPosts',
            {
                author: `urn:li:person:${await getLinkedInUserId(accessToken)}`,
                lifecycleState: 'PUBLISHED',
                specificContent: {
                    'com.linkedin.ugc.ShareContent': {
                        shareCommentary: {
                            text: content
                        },
                        shareMediaCategory: 'NONE'
                    }
                },
                visibility: {
                    'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            }
        );

        res.json({ 
            success: true, 
            message: 'Posted to LinkedIn successfully!',
            data: linkedinResponse.data 
        });

    } catch (error) {
        console.error('LinkedIn posting error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to post to LinkedIn',
            details: error.response?.data || error.message 
        });
    }
});

// Get LinkedIn user ID
async function getLinkedInUserId(accessToken) {
    try {
        const response = await axios.get('https://api.linkedin.com/v2/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.data.id;
    } catch (error) {
        throw new Error('Failed to get LinkedIn user ID');
    }
}

module.exports = router;
```

### Twitter Routes (`routes/twitter.js`)

```javascript
const express = require('express');
const axios = require('axios');
const router = express.Router();

// POST to Twitter
router.post('/post', async (req, res) => {
    try {
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ 
                error: 'Content is required' 
            });
        }

        if (content.length > 280) {
            return res.status(400).json({ 
                error: 'Content exceeds Twitter character limit (280 characters)' 
            });
        }

        // Twitter API v2 - Create tweet
        const twitterResponse = await axios.post(
            'https://api.twitter.com/2/tweets',
            {
                text: content
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ 
            success: true, 
            message: 'Posted to Twitter successfully!',
            data: twitterResponse.data 
        });

    } catch (error) {
        console.error('Twitter posting error:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to post to Twitter',
            details: error.response?.data || error.message 
        });
    }
});

module.exports = router;
```

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "echo \"No tests specified\" && exit 0"
  }
}
```

## 🔑 API Setup Instructions

### LinkedIn API Setup

1. **Create LinkedIn App:**
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Click "Create App"
   - Fill in app details and verify your company page

2. **Configure OAuth:**
   - Add redirect URI: `http://localhost:3001/auth/linkedin/callback`
   - Request permissions: `r_liteprofile`, `r_emailaddress`, `w_member_social`

3. **Get Credentials:**
   - Copy Client ID and Client Secret to your `.env` file

### Twitter API Setup

1. **Create Twitter App:**
   - Go to [Twitter Developer Portal](https://developer.twitter.com/)
   - Create a new project and app
   - Generate API keys and tokens

2. **Configure Permissions:**
   - Set app permissions to "Read and Write"
   - Generate Access Token and Secret

3. **Get Credentials:**
   - Copy all tokens to your `.env` file

## 🔄 Frontend Integration

Update your frontend to call your backend API. In your `SocialConnector.tsx`, replace the mock API calls:

```javascript
// Replace the mock handlePost function with actual API calls
const handlePost = async (platform = 'both') => {
  // ... validation code ...

  try {
    const promises = [];
    
    if (platform === 'linkedin' || platform === 'both') {
      promises.push(
        fetch('http://localhost:3001/api/linkedin/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content, 
            accessToken: 'YOUR_LINKEDIN_ACCESS_TOKEN' 
          })
        })
      );
    }
    
    if (platform === 'twitter' || platform === 'both') {
      promises.push(
        fetch('http://localhost:3001/api/twitter/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })
      );
    }

    await Promise.all(promises);
    
    // Success handling...
  } catch (error) {
    // Error handling...
  }
};
```

## 🚀 Running the Backend

1. **Install dependencies:**
   ```bash
   cd social-connector-backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your API credentials
   ```

3. **Start the server:**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

4. **Test the connection:**
   ```bash
   curl http://localhost:3001/health
   ```

## 🔒 Security Considerations

1. **Environment Variables:** Never commit `.env` file to version control
2. **CORS:** Configure CORS properly for production
3. **Rate Limiting:** Implement rate limiting for API endpoints
4. **Input Validation:** Validate all input data
5. **Error Handling:** Don't expose sensitive error details to frontend

## 📚 Additional Resources

- [LinkedIn API Documentation](https://docs.microsoft.com/en-us/linkedin/)
- [Twitter API Documentation](https://developer.twitter.com/en/docs/twitter-api)
- [Express.js Documentation](https://expressjs.com/)
- [OAuth 2.0 Flow](https://oauth.net/2/)

## 🐛 Troubleshooting

### Common Issues:

1. **CORS Errors:**
   ```javascript
   // Make sure CORS is configured correctly
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

2. **LinkedIn API Errors:**
   - Check if your app has the correct permissions
   - Verify the access token is valid
   - Ensure your LinkedIn app is approved

3. **Twitter API Errors:**
   - Verify your API keys are correct
   - Check if your app has write permissions
   - Ensure you're using the correct API version

4. **Port Conflicts:**
   ```bash
   # Kill process on port 3001
   lsof -ti:3001 | xargs kill -9
   ```

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify your API credentials are correct
3. Ensure your backend server is running
4. Test API endpoints with tools like Postman or curl

---

**Happy coding! 🎉**