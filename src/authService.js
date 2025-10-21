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

  async getAccounts() {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.client.get(`${this.baseURL}/accounts`);
      const $ = cheerio.load(response.data);
      
      const accounts = [];
      $('a[href*="/accounts/if0_"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const match = href.match(/\/accounts\/(if0_\d+)/);
        if (match) {
          const accountId = match[1];
          const text = $(elem).text().trim();
          if (!accounts.find(a => a.id === accountId)) {
            accounts.push({ id: accountId, name: text || accountId });
          }
        }
      });
      
      return accounts;
    } catch (error) {
      console.error('Error getting accounts:', error.message);
      throw error;
    }
  }

  async getDomains(accountId) {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.client.get(`${this.baseURL}/accounts/${accountId}`);
      const $ = cheerio.load(response.data);
      
      const domains = [];
      $('a[href*="/domains/"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const match = href.match(/\/domains\/([^\/]+)$/);
        if (match && !match[1].includes('create')) {
          const domain = match[1];
          if (!domains.includes(domain)) {
            domains.push(domain);
          }
        }
      });
      
      return domains;
    } catch (error) {
      console.error('Error getting domains:', error.message);
      throw error;
    }
  }

  async getDNSRecords(accountId, domain) {
    await this.ensureAuthenticated();
    
    try {
      const url = `${this.baseURL}/accounts/${accountId}/domains/${domain}/dnsRecords`;
      const response = await this.client.get(url);
      const $ = cheerio.load(response.data);
      
      const records = [];
      $('table tbody tr').each((i, row) => {
        const cells = [];
        $(row).find('td').each((j, cell) => {
          cells.push($(cell).text().trim());
        });
        
        if (cells.length >= 3) {
          records.push({
            domain: cells[0],
            type: cells[1],
            target: cells[2]
          });
        }
      });
      
      return records;
    } catch (error) {
      console.error('Error getting DNS records:', error.message);
      throw error;
    }
  }

  async createCNAMERecord(accountId, domain, name, target) {
    await this.ensureAuthenticated();
    
    try {
      const createUrl = `${this.baseURL}/accounts/${accountId}/domains/${domain}/cnameRecords/create`;
      const createResponse = await this.client.get(createUrl);
      const $ = cheerio.load(createResponse.data);
      
      const csrfToken = $('input[name="_token"]').first().attr('value');
      
      if (!csrfToken) {
        throw new Error('Could not find CSRF token');
      }
      
      const postUrl = `${this.baseURL}/accounts/${accountId}/domains/${domain}/cnameRecords`;
      const formData = {
        name: name,
        target: target,
        _token: csrfToken
      };
      
      console.log(`Creating CNAME record: ${name} -> ${target}`);
      
      const response = await this.client.post(postUrl, new URLSearchParams(formData).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': createUrl,
          'Origin': this.baseURL
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.status === 302 || response.status === 303) {
        const redirectLocation = response.headers.location;
        if (redirectLocation && redirectLocation.includes('dnsRecords')) {
          console.log('✓ CNAME record created successfully');
          return { success: true, message: `CNAME record ${name} created successfully` };
        }
      }
      
      if (response.status === 200) {
        const $response = cheerio.load(response.data);
        const successMessage = $response('.alert-success').text().trim();
        const errorMessage = $response('.alert-danger').text().trim() ||
                            $response('.error').text().trim();
        
        if (errorMessage) {
          throw new Error(`Failed to create CNAME record: ${errorMessage}`);
        }
        
        if (successMessage || response.data.includes('record') || response.data.includes('success')) {
          console.log('✓ CNAME record created successfully');
          return { success: true, message: successMessage || `CNAME record ${name} created successfully` };
        }
      }
      
      throw new Error('CNAME record creation failed - unexpected response');
      
    } catch (error) {
      console.error('Error creating CNAME record:', error.message);
      if (error.response && error.response.data) {
        const $ = cheerio.load(error.response.data);
        const errorMessage = $('.alert-danger').text().trim();
        if (errorMessage) {
          throw new Error(`Failed to create CNAME record: ${errorMessage}`);
        }
      }
      throw error;
    }
  }

  async createMXRecord(accountId, domain, priority, target) {
    await this.ensureAuthenticated();
    
    try {
      const createUrl = `${this.baseURL}/accounts/${accountId}/domains/${domain}/mxRecords/create`;
      const createResponse = await this.client.get(createUrl);
      const $ = cheerio.load(createResponse.data);
      
      const csrfToken = $('input[name="_token"]').first().attr('value');
      
      if (!csrfToken) {
        throw new Error('Could not find CSRF token');
      }
      
      const postUrl = `${this.baseURL}/accounts/${accountId}/domains/${domain}/mxRecords`;
      const formData = {
        priority: priority,
        target: target,
        _token: csrfToken
      };
      
      console.log(`Creating MX record: priority ${priority} -> ${target}`);
      
      const response = await this.client.post(postUrl, new URLSearchParams(formData).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': createUrl,
          'Origin': this.baseURL
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.status === 302 || response.status === 303) {
        console.log('✓ MX record created successfully');
        return { success: true, message: `MX record created successfully` };
      }
      
      if (response.status === 200) {
        console.log('✓ MX record created successfully');
        return { success: true, message: `MX record created successfully` };
      }
      
      throw new Error('MX record creation failed');
      
    } catch (error) {
      console.error('Error creating MX record:', error.message);
      throw error;
    }
  }

  async createTXTRecord(accountId, domain, name, content) {
    await this.ensureAuthenticated();
    
    try {
      const createUrl = `${this.baseURL}/accounts/${accountId}/domains/${domain}/txtRecords/create`;
      const createResponse = await this.client.get(createUrl);
      const $ = cheerio.load(createResponse.data);
      
      const csrfToken = $('input[name="_token"]').first().attr('value');
      
      if (!csrfToken) {
        throw new Error('Could not find CSRF token');
      }
      
      const postUrl = `${this.baseURL}/accounts/${accountId}/domains/${domain}/txtRecords`;
      const formData = {
        name: name,
        content: content,
        _token: csrfToken
      };
      
      console.log(`Creating TXT record: ${name}`);
      
      const response = await this.client.post(postUrl, new URLSearchParams(formData).toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': createUrl,
          'Origin': this.baseURL
        },
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      });
      
      if (response.status === 302 || response.status === 303) {
        console.log('✓ TXT record created successfully');
        return { success: true, message: `TXT record created successfully` };
      }
      
      if (response.status === 200) {
        console.log('✓ TXT record created successfully');
        return { success: true, message: `TXT record created successfully` };
      }
      
      throw new Error('TXT record creation failed');
      
    } catch (error) {
      console.error('Error creating TXT record:', error.message);
      throw error;
    }
  }

  async getAvailableSubdomainExtensions(accountId) {
    await this.ensureAuthenticated();
    
    const puppeteer = require('puppeteer-core');
    let browser;
    
    try {
      console.log('Fetching available subdomain extensions...');
      
      browser = await puppeteer.launch({
        executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      const cookies = await this.jar.getCookies(this.baseURL);
      const puppeteerCookies = cookies.map(cookie => ({
        name: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires === 'Infinity' ? -1 : Math.floor(new Date(cookie.expires).getTime() / 1000),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure
      }));
      
      await page.setCookie(...puppeteerCookies);
      
      const createUrl = `${this.baseURL}/accounts/${accountId}/domains/create`;
      console.log(`Navigating to: ${createUrl}`);
      await page.goto(createUrl, { waitUntil: 'networkidle0' });
      
      console.log('Checking for privacy popup...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const popupDismissed = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmButton = buttons.find(btn => 
          btn.textContent.toUpperCase().includes('CONFIRM')
        );
        if (confirmButton) {
          confirmButton.click();
          return true;
        }
        return false;
      });
      
      if (popupDismissed) {
        console.log('Privacy popup dismissed');
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        console.log('No privacy popup found');
      }
      
      console.log('Clicking subdomain button...');
      await page.waitForSelector('button[wire\\:click="selectDomainType(\'subdomain\')"]', { timeout: 10000 });
      
      await Promise.all([
        page.click('button[wire\\:click="selectDomainType(\'subdomain\')"]'),
        page.waitForResponse(response => response.url().includes('/livewire/message/'), { timeout: 15000 }).catch(() => null)
      ]);
      
      console.log('Waiting for form to load...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Extracting available extensions...');
      const extensions = await page.evaluate(() => {
        const selectElement = document.querySelector('select');
        if (!selectElement) return [];
        
        const options = Array.from(selectElement.options);
        return options
          .filter(option => option.value && option.value.trim() !== '')
          .map(option => ({
            value: option.value,
            label: option.textContent.trim()
          }));
      });
      
      console.log(`✓ Found ${extensions.length} available subdomain extensions`);
      return { success: true, extensions };
      
    } catch (error) {
      console.error('Error fetching subdomain extensions:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async registerDomain(accountId, subdomain, domainExtension) {
    await this.ensureAuthenticated();
    
    const puppeteer = require('puppeteer-core');
    let browser;
    
    try {
      console.log(`Registering free subdomain: ${subdomain}.${domainExtension}`);
      
      browser = await puppeteer.launch({
        executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      const cookies = await this.jar.getCookies(this.baseURL);
      const puppeteerCookies = cookies.map(cookie => ({
        name: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires === 'Infinity' ? -1 : Math.floor(new Date(cookie.expires).getTime() / 1000),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure
      }));
      
      await page.setCookie(...puppeteerCookies);
      
      const createUrl = `${this.baseURL}/accounts/${accountId}/domains/create`;
      console.log(`Navigating to: ${createUrl}`);
      await page.goto(createUrl, { waitUntil: 'networkidle0' });
      
      console.log('Checking for privacy popup...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const popupDismissed = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmButton = buttons.find(btn => 
          btn.textContent.toUpperCase().includes('CONFIRM')
        );
        if (confirmButton) {
          confirmButton.click();
          return true;
        }
        return false;
      });
      
      if (popupDismissed) {
        console.log('Privacy popup dismissed');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('Clicking subdomain button...');
      await page.waitForSelector('button[wire\\:click="selectDomainType(\'subdomain\')"]', { timeout: 10000 });
      await page.click('button[wire\\:click="selectDomainType(\'subdomain\')"]');
      
      console.log('Waiting for form to load...');
      await page.waitForSelector('input[placeholder="your-name"]', { timeout: 10000 });
      
      console.log('Filling in subdomain name...');
      await page.type('input[placeholder="your-name"]', subdomain);
      
      console.log(`Selecting domain extension: ${domainExtension}`);
      await page.select('select', domainExtension);
      
      console.log('Submitting form...');
      
      let livewireResponse;
      await Promise.all([
        page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const createButton = buttons.find(btn => btn.textContent.includes('Create Domain'));
          if (createButton) createButton.click();
        }),
        page.waitForResponse(response => {
          if (response.url().includes('/livewire/message/')) {
            livewireResponse = response;
            return true;
          }
          return response.url().includes('/domains');
        }, { timeout: 30000 })
      ]);
      
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log('Current URL after submission:', currentUrl);
      
      const pageContent = await page.content();
      const $ = cheerio.load(pageContent);
      
      const errorMessage = $('.alert-danger').text().trim() || $('.error').text().trim();
      
      if (errorMessage) {
        throw new Error(`Failed to register domain: ${errorMessage}`);
      }
      
      if (currentUrl.includes('/domains/') && !currentUrl.includes('/create')) {
        console.log('✓ Free subdomain registered successfully (redirected to domain page)');
        return { success: true, message: `Subdomain ${subdomain}.${domainExtension} registered successfully` };
      }
      
      const successMessage = $('.alert-success').text().trim();
      if (successMessage) {
        console.log('✓ Free subdomain registered successfully (success message found)');
        return { success: true, message: successMessage };
      }
      
      if (livewireResponse && (livewireResponse.status() === 200 || livewireResponse.status() === 204)) {
        console.log('✓ Free subdomain registered successfully (Livewire returned success)');
        return { success: true, message: `Subdomain ${subdomain}.${domainExtension} registered successfully` };
      }
      
      throw new Error('Domain registration failed - unexpected response');
      
    } catch (error) {
      console.error('Error registering domain:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async registerSubdomain(accountId, parentDomain, subdomain) {
    await this.ensureAuthenticated();
    
    const puppeteer = require('puppeteer-core');
    let browser;
    
    try {
      console.log(`Registering subdomain: ${subdomain}.${parentDomain}`);
      
      browser = await puppeteer.launch({
        executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      
      const page = await browser.newPage();
      
      const cookies = await this.jar.getCookies(this.baseURL);
      const puppeteerCookies = cookies.map(cookie => ({
        name: cookie.key,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires === 'Infinity' ? -1 : Math.floor(new Date(cookie.expires).getTime() / 1000),
        httpOnly: cookie.httpOnly,
        secure: cookie.secure
      }));
      
      await page.setCookie(...puppeteerCookies);
      
      const createUrl = `${this.baseURL}/accounts/${accountId}/domains/create`;
      console.log(`Navigating to: ${createUrl}`);
      await page.goto(createUrl, { waitUntil: 'networkidle0' });
      
      console.log('Checking for privacy popup...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const popupDismissed = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const confirmButton = buttons.find(btn => 
          btn.textContent.toUpperCase().includes('CONFIRM')
        );
        if (confirmButton) {
          confirmButton.click();
          return true;
        }
        return false;
      });
      
      if (popupDismissed) {
        console.log('Privacy popup dismissed');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log('Clicking custom domain button...');
      await page.waitForSelector('button[wire\\:click="selectDomainType(\'customDomain\')"]', { timeout: 10000 });
      await page.click('button[wire\\:click="selectDomainType(\'customDomain\')"]');
      
      console.log('Waiting for domain input form to load...');
      await page.waitForSelector('input[type="text"]', { timeout: 10000 });
      
      const fullDomain = `${subdomain}.${parentDomain}`;
      console.log(`Entering domain: ${fullDomain}`);
      await page.type('input[type="text"]', fullDomain);
      
      console.log('Submitting form...');
      
      let livewireResponse;
      await Promise.all([
        page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const createButton = buttons.find(btn => btn.textContent.includes('Create Domain'));
          if (createButton) createButton.click();
        }),
        page.waitForResponse(response => {
          if (response.url().includes('/livewire/message/')) {
            livewireResponse = response;
            return true;
          }
          return response.url().includes('/domains');
        }, { timeout: 30000 })
      ]);
      
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      console.log('Current URL after submission:', currentUrl);
      
      const pageContent = await page.content();
      const $ = cheerio.load(pageContent);
      
      const errorMessage = $('.alert-danger').text().trim() || $('.error').text().trim();
      
      if (errorMessage) {
        throw new Error(`Failed to register subdomain: ${errorMessage}`);
      }
      
      if (currentUrl.includes('/domains/') && !currentUrl.includes('/create')) {
        console.log('✓ Subdomain registered successfully (redirected to domain page)');
        return { success: true, message: `Subdomain ${subdomain}.${parentDomain} registered successfully` };
      }
      
      const successMessage = $('.alert-success').text().trim();
      if (successMessage) {
        console.log('✓ Subdomain registered successfully (success message found)');
        return { success: true, message: successMessage };
      }
      
      if (livewireResponse && (livewireResponse.status() === 200 || livewireResponse.status() === 204)) {
        console.log('✓ Subdomain registered successfully (Livewire returned success)');
        return { success: true, message: `Subdomain ${subdomain}.${parentDomain} registered successfully` };
      }
      
      throw new Error('Subdomain registration failed - unexpected response');
      
    } catch (error) {
      console.error('Error registering subdomain:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = InfinityFreeAuth;
