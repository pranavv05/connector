# Social Media Connector - Backend

This is the backend service for the Social Media Connector application, which allows users to post content to both LinkedIn and Twitter simultaneously or individually.

## Features

- OAuth 2.0 authentication with LinkedIn and Twitter APIs
- Post content to LinkedIn
- Post content to Twitter
- Combined posting to both platforms
- Secure token handling
- Rate limiting and security middleware
- Comprehensive error handling

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher) or yarn
- LinkedIn API credentials
- Twitter API credentials

## Setup

1. Clone the repository
2. Navigate to the backend directory:
   ```bash
   cd backend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the backend directory and copy the contents from `.env.example`:
   ```bash
   cp .env.example .env
   ```
5. Update the `.env` file with your API credentials and configuration.

## Environment Variables

See [.env.example](./.env.example) for a list of all required environment variables.

## Running the Server

### Development

```bash
npm run dev
```

This will start the server with nodemon, which will automatically restart when files change.

### Production

```bash
npm start
```

## API Endpoints

### LinkedIn

- `GET /api/linkedin/auth` - Start LinkedIn OAuth flow
- `GET /api/linkedin/callback` - LinkedIn OAuth callback
- `POST /api/linkedin/post` - Post content to LinkedIn
- `GET /api/linkedin/profile` - Get current user's LinkedIn profile

### Twitter

- `GET /api/twitter/auth` - Start Twitter OAuth flow
- `GET /api/twitter/callback` - Twitter OAuth callback
- `POST /api/twitter/post` - Post content to Twitter
- `GET /api/twitter/profile` - Get current user's Twitter profile

### Combined

- `POST /api/combined/post` - Post content to both LinkedIn and Twitter
- `GET /api/combined/profile` - Get profiles from both LinkedIn and Twitter

### Health Check

- `GET /api/health` - Check if the API is running

## Error Handling

The API returns JSON responses with the following structure for errors:

```json
{
  "status": "error",
  "message": "Error message",
  "details": "Additional error details"
}
```

## Security

- All API routes are protected with rate limiting
- Helmet.js is used to secure HTTP headers
- CORS is configured to only allow requests from the frontend URL
- Sensitive information is stored in environment variables

## Testing

To run tests (when implemented):

```bash
npm test
```

## Deployment

1. Set `NODE_ENV=production` in your environment variables
2. Make sure all required environment variables are set
3. Run `npm install --production`
4. Start the server with `npm start`

## License

ISC
