# Overview

InfinityFree Automation is a Node.js application that automates tasks on the InfinityFree hosting platform using cookie-based authentication. The application provides a web interface for managing InfinityFree accounts without requiring email/password login, avoiding CAPTCHA challenges by leveraging existing browser session cookies.

# Recent Changes

## October 21, 2025 - Made App Portable for Render and Koyeb Deployment
- **Updated**: Dockerfile now installs Chromium via Alpine package manager instead of relying on Nix
- **Changed**: Chromium executable path now uses environment variables with fallback chain
- **Added**: `CHROMIUM_PATH` environment variable support for custom Chromium paths
- **Enhanced**: Auto-detection of Chromium location (Nix store for Replit, `/usr/bin/chromium-browser` for Docker)
- **Improved**: Docker image now includes all required fonts and libraries for headless Chromium
- **Updated**: README with deployment instructions for Render and Koyeb platforms
- **Result**: App can now be deployed to Render, Koyeb, or any Docker-compatible platform

## October 21, 2025 - Fixed Puppeteer Error & Implemented Auto-Loading
- **Fixed**: Puppeteer `waitForXPath is not a function` error by replacing deprecated method with `page.evaluate()` approach
- **Improved**: Button clicking now uses modern DOM query instead of XPath selectors for better reliability
- **Added**: Auto-loading of domain extensions on page startup in `public/app.js` 
- **Enhanced UX**: Users no longer need to manually click "Load Extensions" button - extensions load automatically when page opens
- **Performance**: Extensions cached after first load, improving subsequent registration speed
- **Result**: Faster, more streamlined domain registration workflow

## October 21, 2025 - Added Dynamic Subdomain Extension Discovery
- **Added**: `getAvailableSubdomainExtensions()` method that dynamically fetches all available subdomain extensions from InfinityFree
- **Added**: API endpoint `GET /accounts/:accountId/subdomain-extensions` to retrieve subdomain extensions programmatically
- **Updated**: Frontend now features a "Load Available Extensions" button that populates the dropdown with all 25+ available extensions
- **Improved**: Users no longer limited to hardcoded extensions; can access all current InfinityFree subdomain options
- **Result**: Dynamic discovery ensures the app stays up-to-date with InfinityFree's latest subdomain offerings

## October 19, 2025 - Added Domain and Subdomain Registration
- **Added**: Domain registration feature using Puppeteer for Livewire form automation
- **Added**: Subdomain registration feature for custom domains
- **Implemented**: Robust success detection with multiple fallback checks (URL redirect, success banners, HTTP status codes)
- **Fixed**: XPath selector implementation to replace unsupported `:has-text()` pseudo-class
- **Improved**: Promise.all pattern for proper form submission timing and AJAX response handling
- **Result**: Full automation of InfinityFree domain/subdomain registration without manual interaction

## October 19, 2025 - Refactored to Cookie-Only Authentication
- **Removed**: Email/password login functionality completely removed
- **Added**: Direct cookie parsing and authentication from browser-exported cookies
- **Updated**: Authentication now uses `INFINITYFREE_COOKIES` environment variable only
- **Note**: Puppeteer was later re-added specifically for domain registration (Livewire forms require browser automation)

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

**Hybrid Approach**:
- Cookie-based authentication for most API calls (lightweight and fast)
- Puppeteer browser automation for Livewire forms (required for domain registration)

**Pros**:
- Simple implementation for standard operations
- Bypasses CAPTCHA requirements
- No credential storage needed
- Handles complex JavaScript interactions when needed

**Cons**:
- Requires manual cookie extraction from browser
- Session expiration requires re-authentication
- Puppeteer adds overhead for specific operations

## HTTP Client Architecture

**Axios with Cookie Jar Support**
- `axios-cookiejar-support` wrapper maintains cookies across requests
- Mimics browser behavior with appropriate User-Agent headers
- `withCredentials` flag ensures cookies are sent with requests

**Rationale**: This approach provides browser-like session management without the overhead of actual browser automation, balancing simplicity with functionality.

## Web Scraping Strategy

**Cheerio for HTML Parsing**
- Lightweight jQuery-like API for parsing HTML responses
- Used for extracting CSRF tokens, form data, and success/error messages from InfinityFree pages

**Puppeteer for Browser Automation**
- Used specifically for domain and subdomain registration features
- Handles Livewire (Laravel JavaScript framework) dynamic forms
- Executes JavaScript and interacts with forms that cannot be accessed via HTTP alone
- Auto-detects Chromium location (Nix store on Replit, system packages in Docker)

**Rationale**: This hybrid approach uses lightweight Cheerio for simple HTTP parsing while leveraging Puppeteer only when JavaScript interaction is required, balancing performance with capability.

## Configuration Management

**Environment Variables via dotenv**
- `INFINITYFREE_COOKIES`: Stores browser-exported cookies
- `DEFAULT_ACCOUNT_ID`: Optional default account ID for simplified API calls
- `CHROMIUM_PATH`: Optional custom Chromium path (auto-detected if not set)
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

**HTML Parsing & Browser Automation**
- `cheerio` (v1.1.2): Server-side jQuery-like HTML parsing
- `puppeteer-core` (v23.10.4): Headless browser automation for Livewire forms

**Configuration**
- `dotenv` (v17.2.3): Environment variable management

## No Database

The application is stateless and does not use a database. All state is maintained in-memory during runtime through the cookie jar and service class instance.

**Rationale**: For automation tasks, persistence is not required. Session cookies are temporary and re-imported as needed. This keeps the application simple and deployment-friendly.