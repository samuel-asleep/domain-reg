const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const TurnstileBypass = require('turnstile-bypass');

class InfinityFreeAuth {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }));
    this.isAuthenticated = false;
    this.baseURL = 'https://dash.infinityfree.com';
    this.turnstileSolver = new TurnstileBypass();
  }

  async login(email, password) {
    try {
      console.log('Solving Turnstile CAPTCHA using turnstile-bypass...');
      
      const bypassResult = await this.turnstileSolver.solve(`${this.baseURL}/login`);
      
      console.log('Turnstile solved successfully!');
      console.log('User Agent:', bypassResult.userAgent);
      console.log('Cookies received:', bypassResult.cookies ? 'Yes' : 'No');
      
      if (bypassResult.userAgent) {
        this.client.defaults.headers['User-Agent'] = bypassResult.userAgent;
      }
      
      if (bypassResult.cookies) {
        for (const cookie of bypassResult.cookies) {
          await this.jar.setCookie(cookie, this.baseURL);
        }
      }
      
      console.log('Fetching login page with bypass cookies...');
      
      const loginPageResponse = await this.client.get(`${this.baseURL}/login`);
      const $ = cheerio.load(loginPageResponse.data);
      
      console.log('Parsing login page for CSRF token and form fields...');
      
      const csrfToken = $('input[name="_token"]').val() || 
                        $('meta[name="csrf-token"]').attr('content');
      
      if (!csrfToken) {
        console.log('Login page HTML (first 500 chars):', loginPageResponse.data.substring(0, 500));
        throw new Error('CSRF token not found on login page');
      }
      
      console.log('CSRF token found:', csrfToken.substring(0, 20) + '...');
      
      const captchaType = $('input[name="captcha-type"]').val() || 'turnstile';
      const turnstileResponse = $('input[name="cf-turnstile-response"]').val() || '';
      
      console.log('Captcha type:', captchaType);
      console.log('Turnstile response from page:', turnstileResponse ? 'Found' : 'Not found');
      
      const loginData = {
        _token: csrfToken,
        email: email,
        password: password,
        'captcha-type': captchaType,
        'cf-turnstile-response': turnstileResponse
      };
      
      console.log('Attempting login with credentials...');
      
      const loginResponse = await this.client.post(
        `${this.baseURL}/login`,
        new URLSearchParams(loginData).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': `${this.baseURL}/login`,
            'Origin': this.baseURL
          },
          maxRedirects: 0,
          validateStatus: (status) => status >= 200 && status < 400
        }
      );
      
      console.log('Login response status:', loginResponse.status);
      console.log('Login response headers:', loginResponse.headers);
      
      if (loginResponse.status === 302 || loginResponse.status === 301) {
        const redirectLocation = loginResponse.headers.location;
        console.log('Redirect to:', redirectLocation);
        
        if (redirectLocation && !redirectLocation.includes('/login')) {
          this.isAuthenticated = true;
          console.log('Login successful!');
          return { success: true, message: 'Login successful' };
        }
      }
      
      if (loginResponse.status === 200) {
        const $response = cheerio.load(loginResponse.data);
        const errorMessage = $response('.alert-danger').text().trim() ||
                           $response('.error').text().trim();
        
        if (errorMessage) {
          throw new Error(`Login failed: ${errorMessage}`);
        }
        
        if (loginResponse.data.includes('dashboard') || loginResponse.data.includes('account')) {
          this.isAuthenticated = true;
          console.log('Login successful (no redirect)!');
          return { success: true, message: 'Login successful' };
        }
      }
      
      throw new Error('Login failed - unexpected response');
      
    } catch (error) {
      console.error('Login error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data (first 500 chars):', 
          typeof error.response.data === 'string' 
            ? error.response.data.substring(0, 500) 
            : JSON.stringify(error.response.data).substring(0, 500)
        );
      }
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.isAuthenticated) {
      const email = process.env.INFINITYFREE_EMAIL;
      const password = process.env.INFINITYFREE_PASSWORD;
      
      if (!email || !password) {
        throw new Error('INFINITYFREE_EMAIL and INFINITYFREE_PASSWORD environment variables are required');
      }
      
      await this.login(email, password);
    }
    return this.isAuthenticated;
  }

  async makeAuthenticatedRequest(url, options = {}) {
    await this.ensureAuthenticated();
    return this.client.request({ url, ...options });
  }
}

module.exports = InfinityFreeAuth;
