const puppeteer = require('puppeteer-core');

async function testBrowserless() {
  console.log('Launching local Chromium browser...');
  
  const browser = await puppeteer.launch({
    executablePath: '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled'
    ]
  });
  
  try {
    const page = await browser.newPage();
    
    console.log('Navigating to InfinityFree login...');
    await page.goto('https://dash.infinityfree.com/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    console.log('Page loaded! Taking screenshot...');
    await page.screenshot({ path: 'login-page.png' });
    
    console.log('Getting page content...');
    const html = await page.content();
    console.log('Page HTML (first 1000 chars):\n', html.substring(0, 1000));
    
    console.log('\nLooking for Turnstile elements...');
    const turnstileIframe = await page.$('iframe[src*="challenges.cloudflare.com"]');
    const turnstileDiv = await page.$('div[class*="cf-turnstile"]');
    const turnstileInput = await page.$('input[name="cf-turnstile-response"]');
    
    console.log('Turnstile iframe found:', !!turnstileIframe);
    console.log('Turnstile div found:', !!turnstileDiv);
    console.log('Turnstile input found:', !!turnstileInput);
    
    if (turnstileInput) {
      const value = await page.evaluate(el => el.value, turnstileInput);
      console.log('Turnstile input value:', value || '(empty)');
    }
    
    console.log('\nWaiting 10 seconds for Turnstile to auto-solve...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const turnstileInputAfter = await page.$('input[name="cf-turnstile-response"]');
    if (turnstileInputAfter) {
      const valueAfter = await page.evaluate(el => el.value, turnstileInputAfter);
      console.log('Turnstile input value after wait:', valueAfter || '(empty)');
    }
    
    await page.close();
    console.log('Test complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testBrowserless();
