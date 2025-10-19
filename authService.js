const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

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
  }

  parseCookieString(cookieString) {
    const cookies = [];
    const cookiePairs = cookieString.split(';');
    
    for (const pair of cookiePairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex === -1) continue;
      
      const name = trimmed.substring(0, equalIndex);
      const value = trimmed.substring(equalIndex + 1);
      
      cookies.push({ name, value });
    }
    
    return cookies;
  }

  async setCookiesFromString(cookieString) {
    try {
      console.log('Setting cookies from provided cookie string...');
      
      const cookies = this.parseCookieString(cookieString);
      
      for (const cookie of cookies) {
        const cookieStr = `${cookie.name}=${cookie.value}; Domain=.infinityfree.com; Path=/`;
        await this.jar.setCookie(cookieStr, this.baseURL);
      }
      
      console.log(`Successfully set ${cookies.length} cookies`);
      this.isAuthenticated = true;
      
      return { success: true, message: `Loaded ${cookies.length} cookies` };
    } catch (error) {
      console.error('Error setting cookies:', error.message);
      throw error;
    }
  }

  async initializeFromEnv() {
    const cookieString = process.env.INFINITYFREE_COOKIES;
    
    if (!cookieString) {
      throw new Error('INFINITYFREE_COOKIES environment variable is required');
    }
    
    return await this.setCookiesFromString(cookieString);
  }

  async verifyAuthentication() {
    try {
      console.log('Verifying authentication status...');
      
      const response = await this.client.get(`${this.baseURL}/accounts`, {
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.status === 302 && response.headers.location?.includes('/login')) {
        this.isAuthenticated = false;
        throw new Error('Cookies expired or invalid - redirected to login');
      }
      
      if (response.status === 200) {
        const $ = cheerio.load(response.data);
        const title = $('title').text();
        
        const hasLoginForm = $('form[action*="login"]').length > 0 || $('#email').length > 0;
        const hasAccountData = $('[class*="account"]').length > 0 || 
                              response.data.toLowerCase().includes('dashboard') ||
                              response.data.toLowerCase().includes('hosting accounts') ||
                              title.toLowerCase().includes('accounts');
        
        if (hasLoginForm && !hasAccountData) {
          this.isAuthenticated = false;
          throw new Error('Cookies expired or invalid - got login page');
        }
        
        if (hasAccountData) {
          this.isAuthenticated = true;
          console.log('✓ Authentication verified successfully');
          return { success: true, message: 'Authenticated' };
        }
      }
      
      this.isAuthenticated = false;
      throw new Error('Could not verify authentication');
      
    } catch (error) {
      console.error('Authentication verification failed:', error.message);
      
      if (error.response?.status === 302 && error.response.headers.location?.includes('/login')) {
        this.isAuthenticated = false;
        throw new Error('Cookies expired or invalid - redirected to login');
      }
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.isAuthenticated) {
      await this.initializeFromEnv();
      await this.verifyAuthentication();
    }
    return this.isAuthenticated;
  }

  async makeAuthenticatedRequest(url, options = {}) {
    await this.ensureAuthenticated();
    return this.client.request({ url, ...options });
  }
}

module.exports = InfinityFreeAuth;
