# Overview

InfinityFree Automation is a Node.js application that automates tasks on the InfinityFree hosting platform using cookie-based authentication. The application provides a web interface for managing InfinityFree accounts without requiring email/password login, avoiding CAPTCHA challenges by leveraging existing browser session cookies.

# Recent Changes

## October 19, 2025 - Refactored to Cookie-Only Authentication
- **Removed**: Email/password login functionality completely removed
- **Removed**: Puppeteer and all browser automation code eliminated
- **Removed**: Dependencies: `puppeteer-core` and `turnstile-bypass` uninstalled
- **Added**: Direct cookie parsing and authentication from browser-exported cookies
- **Updated**: Authentication now uses `INFINITYFREE_COOKIES` environment variable only
- **Improved**: Simpler, faster authentication without browser overhead
- **Result**: 130 fewer npm packages, cleaner codebase, no browser dependencies

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Application Structure

The application follows a simple modular architecture with clear separation of concerns:

**Server Layer (app.js)**
- Express.js HTTP server handling routing and request processing
- Serves a simple HTML interface for user interaction
- Acts as the entry point and controller layer
- Runs on port 5000 by default

**Service Layer (authService.js)**
- `InfinityFreeAuth` class encapsulates all InfinityFree API interactions
- Manages cookie-based authentication state
- Uses Axios HTTP client with cookie jar support for maintaining sessions
- Handles cookie parsing from browser-exported cookie strings

**Rationale**: This layered approach separates presentation logic from business logic, making the codebase maintainable and testable. The service class can be easily reused or extended for additional InfinityFree operations.

## Authentication Strategy

**Cookie-Based Authentication**
- Uses pre-authenticated session cookies copied from user's browser
- Avoids programmatic login flows that trigger CAPTCHAs
- Maintains session state using `tough-cookie` CookieJar

**Alternatives Considered**:
- Email/password authentication: Rejected due to CAPTCHA challenges
- Browser automation (Puppeteer/Playwright): Rejected for being heavyweight and resource-intensive

**Pros**:
- Simple implementation
- Bypasses CAPTCHA requirements
- No credential storage needed

**Cons**:
- Requires manual cookie extraction from browser
- Session expiration requires re-authentication
- Less automated than programmatic login

## HTTP Client Architecture

**Axios with Cookie Jar Support**
- `axios-cookiejar-support` wrapper maintains cookies across requests
- Mimics browser behavior with appropriate User-Agent headers
- `withCredentials` flag ensures cookies are sent with requests

**Rationale**: This approach provides browser-like session management without the overhead of actual browser automation, balancing simplicity with functionality.

## Web Scraping Strategy

**Cheerio for HTML Parsing**
- Lightweight jQuery-like API for parsing HTML responses
- Used for extracting CSRF tokens and form data from InfinityFree pages

**Rationale**: Cheerio is fast and familiar for developers who know jQuery, making it easy to extract data from HTML responses without DOM overhead.

## Configuration Management

**Environment Variables via dotenv**
- `INFINITYFREE_COOKIES`: Stores browser-exported cookies
- Separates configuration from code
- `.env.example` provides template for users

**Rationale**: Standard Node.js pattern for managing sensitive configuration, prevents hardcoding credentials.

# External Dependencies

## Third-Party Services

**InfinityFree Dashboard API**
- Base URL: `https://dash.infinityfree.com`
- Cookie-based session authentication
- HTML responses parsed for data extraction

## NPM Packages

**Core Framework**
- `express` (v5.1.0): Web server framework

**HTTP & Cookie Management**
- `axios` (v1.12.2): HTTP client for API requests
- `axios-cookiejar-support` (v6.0.4): Adds cookie jar support to Axios
- `tough-cookie` (v5.1.2): Cookie parsing and storage

**HTML Parsing**
- `cheerio` (v1.1.2): Server-side jQuery-like HTML parsing

**Configuration**
- `dotenv` (v17.2.3): Environment variable management

## No Database

The application is stateless and does not use a database. All state is maintained in-memory during runtime through the cookie jar and service class instance.

**Rationale**: For automation tasks, persistence is not required. Session cookies are temporary and re-imported as needed. This keeps the application simple and deployment-friendly.