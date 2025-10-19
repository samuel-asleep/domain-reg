# InfinityFree Automation

A Node.js application for automating tasks on InfinityFree using cookie-based authentication.

## Features

- Cookie-based authentication (no email/password required)
- Verify authentication status
- Domain registration (coming soon)
- CNAME record creation (coming soon)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

3. Get your cookies from InfinityFree:
   - Log in to https://dash.infinityfree.com in your browser
   - Open Developer Tools (F12)
   - Go to Application tab > Cookies > https://dash.infinityfree.com
   - Copy all cookies in the format: `name1=value1;name2=value2;name3=value3`
   - Paste them into the `.env` file as the value for `INFINITYFREE_COOKIES`

4. Run the application:
```bash
node app.js
```

5. Open your browser and navigate to:
```
http://localhost:5000
```

## How It Works

This application uses authenticated session cookies from your browser to make requests to InfinityFree on your behalf. This approach:

- Eliminates the need for email/password login
- Avoids CAPTCHA challenges
- Simplifies the authentication process
- Uses standard HTTP requests (no browser automation)

## API Endpoints

- `GET /` - Home page with UI
- `POST /verify-auth` - Verify that your cookies are valid
- `POST /register-domain` - Register a new domain (coming soon)
- `POST /create-cname` - Create a CNAME record (coming soon)

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Cookies may expire after some time - you'll need to refresh them
- The application uses the cookies to authenticate as you on InfinityFree

## Tech Stack

- Node.js
- Express.js
- Axios (with cookie jar support)
- Cheerio (for HTML parsing)
