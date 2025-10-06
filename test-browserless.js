const puppeteer = require('puppeteer-core');

async function testBrowserless() {
  console.log('Connecting to browserless...');
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: 'wss://browser-api.koyeb.app/'
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
    await page.waitForTimeout(10000);
    
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
    await browser.disconnect();
  }
}

testBrowserless();
