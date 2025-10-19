# InfinityFree Automation

A Node.js application for automating tasks on InfinityFree using cookie-based authentication.

## Features

- Cookie-based authentication (no email/password required)
- Verify authentication status
- Register free InfinityFree subdomains (e.g., mysite.wuaze.co)
- Register custom subdomains (e.g., blog.yourdomain.com)
- Create CNAME DNS records
- Create MX DNS records
- Create TXT DNS records
- View accounts and domains
- View DNS records for domains

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

This application uses authenticated session cookies from your browser to interact with InfinityFree on your behalf. 

**For most features:**
- Uses standard HTTP requests with your authenticated cookies
- Fast and lightweight - no browser overhead

**For domain/subdomain registration:**
- Uses Puppeteer (headless browser) to interact with Livewire JavaScript forms
- Automatically fills forms and submits them
- Required because these features use dynamic JavaScript that can't be accessed via simple HTTP requests

This hybrid approach:
- Eliminates the need for email/password login
- Avoids CAPTCHA challenges
- Handles both simple API calls and complex JavaScript interactions

## API Endpoints

- `GET /` - Home page with UI
- `POST /verify-auth` - Verify that your cookies are valid
- `GET /accounts` - List all hosting accounts
- `GET /accounts/:accountId/domains` - List domains for an account
- `GET /accounts/:accountId/domains/:domain/dns` - List DNS records
- `POST /register-domain` - Register a free InfinityFree subdomain
- `POST /register-subdomain` - Register a custom subdomain
- `POST /create-cname` - Create a CNAME DNS record

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Cookies may expire after some time - you'll need to refresh them
- The application uses the cookies to authenticate as you on InfinityFree

## Tech Stack

- Node.js
- Express.js
- Axios (with cookie jar support)
- Cheerio (for HTML parsing)
- Puppeteer-core (for browser automation)
