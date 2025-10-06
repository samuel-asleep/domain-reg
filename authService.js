const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const puppeteer = require('puppeteer-core');

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
    this.browserWSEndpoint = 'wss://browser-api.koyeb.app/';
  }

  async solveTurnstileWithPuppeteer() {
    console.log('Connecting to remote browser at:', this.browserWSEndpoint);
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: this.browserWSEndpoint
    });
    
    try {
      const page = await browser.newPage();
      
      console.log('Navigating to login page...');
      await page.goto(`${this.baseURL}/login`, { 
        waitUntil: 'domcontentloaded',
        timeout: 60000 
      });
      
      console.log('Waiting for Turnstile CAPTCHA to load...');
      await page.waitForSelector('input[name="cf-turnstile-response"]', { timeout: 15000 });
      
      console.log('Turnstile widget found. Triggering it by scrolling into view...');
      await page.evaluate(() => {
        const turnstileDiv = document.querySelector('[class*="cf-turnstile"]') || document.querySelector('div[data-sitekey]');
        if (turnstileDiv) {
          turnstileDiv.scrollIntoView();
        }
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Looking for Turnstile iframe...');
      const frames = page.frames();
      let turnstileFrame = null;
      for (const frame of frames) {
        const url = frame.url();
        if (url.includes('challenges.cloudflare.com')) {
          turnstileFrame = frame;
          console.log('Found Turnstile iframe!');
          break;
        }
      }
      
      if (turnstileFrame) {
        console.log('Checking for checkbox in Turnstile iframe...');
        try {
          const checkbox = await turnstileFrame.waitForSelector('input[type="checkbox"]', { timeout: 5000 });
          if (checkbox) {
            console.log('Found and clicking Turnstile checkbox...');
            await checkbox.click();
          }
        } catch (e) {
          console.log('No checkbox found in iframe, Turnstile might auto-solve...');
        }
      }
      
      console.log('Waiting for Turnstile to be solved (up to 45 seconds)...');
      
      try {
        await page.waitForFunction(() => {
          const input = document.querySelector('input[name="cf-turnstile-response"]');
          return input && input.value && input.value.length > 0;
        }, { timeout: 45000 });
        console.log('Turnstile solved!');
      } catch (e) {
        console.log('Turnstile auto-solve timeout, checking current state...');
        const currentValue = await page.evaluate(() => {
          const input = document.querySelector('input[name="cf-turnstile-response"]');
          return input ? input.value : null;
        });
        if (!currentValue) {
          throw new Error('Turnstile CAPTCHA was not solved within 45 seconds');
        }
      }
      
      console.log('Turnstile solved! Extracting cookies and CSRF token...');
      
      const cookies = await page.cookies();
      const userAgent = await page.evaluate(() => navigator.userAgent);
      
      const csrfToken = await page.evaluate(() => {
        const input = document.querySelector('input[name="_token"]');
        return input ? input.value : null;
      });
      
      const turnstileResponse = await page.evaluate(() => {
        const input = document.querySelector('input[name="cf-turnstile-response"]');
        return input ? input.value : null;
      });
      
      await page.close();
      
      return {
        cookies,
        userAgent,
        csrfToken,
        turnstileResponse
      };
      
    } finally {
      await browser.disconnect();
    }
  }

  async login(email, password) {
    try {
      console.log('Solving Turnstile CAPTCHA using remote browser...');
      
      const bypassResult = await this.solveTurnstileWithPuppeteer();
      
      console.log('Turnstile solved successfully!');
      console.log('User Agent:', bypassResult.userAgent);
      console.log('Cookies received:', bypassResult.cookies.length);
      console.log('CSRF token:', bypassResult.csrfToken ? 'Found' : 'Not found');
      console.log('Turnstile response:', bypassResult.turnstileResponse ? bypassResult.turnstileResponse.substring(0, 30) + '...' : 'Not found');
      
      if (bypassResult.userAgent) {
        this.client.defaults.headers['User-Agent'] = bypassResult.userAgent;
      }
      
      for (const cookie of bypassResult.cookies) {
        const cookieString = `${cookie.name}=${cookie.value}; Domain=${cookie.domain}; Path=${cookie.path}`;
        await this.jar.setCookie(cookieString, this.baseURL);
      }
      
      const loginData = {
        _token: bypassResult.csrfToken,
        email: email,
        password: password,
        'captcha-type': 'turnstile',
        'cf-turnstile-response': bypassResult.turnstileResponse
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
      
      if (loginResponse.status === 302 || loginResponse.status === 301) {
        const redirectLocation = loginResponse.headers.location;
        console.log('Redirect to:', redirectLocation);
        
        if (redirectLocation && !redirectLocation.includes('/login')) {
          this.isAuthenticated = true;
          console.log('Login successful!');
          return { success: true, message: 'Login successful', redirectTo: redirectLocation };
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
