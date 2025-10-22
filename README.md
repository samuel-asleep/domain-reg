# InfinityFree Automation API

A professional Node.js application for automating tasks on InfinityFree using cookie-based authentication. Features a modern, responsive web interface and comprehensive REST API.

## Features

- **Modern Web Interface** - Professional, responsive dashboard with tabbed navigation
- **Cookie-based Authentication** - No email/password required
- **Verify Authentication** - Test cookie validity
- **Domain Management** - Register and delete free InfinityFree subdomains and custom subdomains
- **DNS Management** - Create and delete CNAME, MX, and TXT DNS records
- **Account & Domain Listing** - View all accounts, domains, and DNS records
- **Comprehensive API Documentation** - Built-in API reference with examples
- **Docker Support** - Production-ready containerization

## Quick Start

### Option 1: Local Development

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

4. (Optional) Set default account ID:
   - Add your default account ID to `.env` file as `DEFAULT_ACCOUNT_ID`
   - This allows API calls without specifying account ID each time

5. Run the application:
```bash
node app.js
```

6. Open your browser and navigate to:
```
http://localhost:5000
```

### Option 2: Docker Deployment

1. Create your `.env` file:
```bash
cp .env.example .env
# Edit .env and add your INFINITYFREE_COOKIES
```

2. Build and run with Docker Compose:
```bash
docker-compose up -d
```

3. Or build and run manually:
```bash
docker build -t infinityfree-automation .
docker run -p 5000:5000 --env-file .env infinityfree-automation
```

4. Access the application:
```
http://localhost:5000
```

## How It Works

This application uses authenticated session cookies from your browser to interact with InfinityFree on your behalf. 

**For most features:**
- Uses standard HTTP requests with your authenticated cookies
- Fast and lightweight - no browser overhead

**For domain/subdomain registration and deletion:**
- Uses Puppeteer (headless browser) to interact with Livewire JavaScript forms
- Automatically fills forms, clicks buttons, and handles confirmations
- Required because these features use dynamic JavaScript that can't be accessed via simple HTTP requests

**Note on Domain Deletion:**
- The automation will find and click the delete button on InfinityFree
- InfinityFree may prevent deletion if:
  - The domain was recently created (minimum lifetime requirement)
  - There are active services that need to be removed first
  - Other validation rules are not met
- The API will return InfinityFree's error message if deletion is blocked

This hybrid approach:
- Eliminates the need for email/password login
- Avoids CAPTCHA challenges
- Handles both simple API calls and complex JavaScript interactions

## API Endpoints

### Web Interface
- `GET /` - Modern web interface with dashboard, API docs, and tools

### JSON API Endpoints

#### Authentication
- `POST /api/verify-auth` - Verify that your cookies are valid

#### Account & Domain Listing
- `GET /accounts` - List all hosting accounts
- `GET /accounts/:accountId/domains` - List domains for an account
- `GET /accounts/:accountId/domains/:domain/dns` - List DNS records for a domain

#### Domain Registration
- `GET /api/subdomain-extensions` - Get available subdomain extensions (uses DEFAULT_ACCOUNT_ID)
- `GET /accounts/:accountId/subdomain-extensions` - Get subdomain extensions for specific account
- `POST /api/register-domain` - Register a free InfinityFree subdomain
- `POST /api/register-subdomain` - Register a custom subdomain

#### Domain Deletion
- `DELETE /api/delete-domain` - Delete a domain from your account

#### DNS Record Management
- `GET /api/dns-records?domain=example.com` - Get DNS records for a domain (uses DEFAULT_ACCOUNT_ID)
- `POST /api/create-cname` - Create a CNAME DNS record
- `DELETE /api/dns-records` - Delete a DNS record

### Legacy Form Endpoints (HTML responses)
- `POST /verify-auth` - Verify authentication (returns HTML)
- `POST /register-domain` - Register domain (returns HTML)
- `POST /register-subdomain` - Register subdomain (returns HTML)
- `POST /delete-domain` - Delete domain (returns HTML)
- `POST /create-cname` - Create CNAME record (returns HTML)

For complete API documentation with request/response examples, visit the **API Documentation** tab in the web interface.

## Environment Variables

- `INFINITYFREE_COOKIES` (Required) - Your InfinityFree session cookies
- `DEFAULT_ACCOUNT_ID` (Optional) - Default account ID to use when not specified in API requests
  - Format: `if0_12345678`
  - Never exposed to the frontend for security
  - Used internally by the API for simplified requests
- `CHROMIUM_PATH` (Optional) - Custom path to Chromium executable
  - Automatically set in Docker to `/usr/bin/chromium-browser`
  - On Replit, set to the Nix store path
  - Usually not needed - the app auto-detects the correct path

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- Cookies may expire after some time - you'll need to refresh them
- The application uses the cookies to authenticate as you on InfinityFree
- The `DEFAULT_ACCOUNT_ID` is never sent to the frontend or exposed in API responses
- Docker images exclude `.env` files via `.dockerignore` for security

## Production Deployment

The Dockerfile is optimized for production:
- Multi-stage build for smaller image size
- Runs as non-root user for security
- Uses Node.js 20 Alpine for minimal footprint
- Includes Chromium for Puppeteer browser automation
- Includes health checks in docker-compose.yml
- Automatic restart on failure

### Deploying to Render

1. Create a new **Web Service** on Render
2. Connect your Git repository
3. Configure the service:
   - **Environment**: Docker
   - **Dockerfile**: Use the Dockerfile in the repository
   - **Port**: 5000
4. Add environment variables:
   - `INFINITYFREE_COOKIES`: Your InfinityFree session cookies
   - `DEFAULT_ACCOUNT_ID`: (Optional) Your default account ID
5. Deploy!

### Deploying to Koyeb

1. Push your Docker image to a registry (Docker Hub, GitHub Container Registry, etc.):
```bash
docker build -t your-username/infinityfree-automation .
docker push your-username/infinityfree-automation
```

2. Create a new **Web Service** on Koyeb
3. Select **Docker** as deployment method
4. Enter your Docker image: `your-username/infinityfree-automation`
5. Set **Exposed port** to `5000`
6. Add environment variables:
   - `INFINITYFREE_COOKIES`: Your InfinityFree session cookies
   - `DEFAULT_ACCOUNT_ID`: (Optional) Your default account ID
7. Deploy!

**Alternative**: Koyeb also supports direct Git deployment with Dockerfile detection.

## Tech Stack

- **Backend**: Node.js, Express.js
- **HTTP Client**: Axios (with cookie jar support)
- **HTML Parsing**: Cheerio
- **Browser Automation**: Puppeteer-core (for complex forms)
- **Frontend**: Vanilla JavaScript, Modern CSS with gradients
- **Deployment**: Docker, Docker Compose
