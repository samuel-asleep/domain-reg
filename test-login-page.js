const axios = require('axios');
const cheerio = require('cheerio');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

async function investigateLoginPage() {
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    jar: jar,
    withCredentials: true,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  }));

  try {
    console.log('Fetching login page...\n');
    const response = await client.get('https://dash.infinityfree.com/login');
    
    const $ = cheerio.load(response.data);
    
    console.log('=== FORM ANALYSIS ===\n');
    
    const form = $('form').first();
    console.log('Form action:', form.attr('action'));
    console.log('Form method:', form.attr('method'));
    
    console.log('\n=== ALL INPUT FIELDS ===\n');
    form.find('input').each((i, elem) => {
      const $input = $(elem);
      console.log(`Field ${i + 1}:`);
      console.log('  Name:', $input.attr('name'));
      console.log('  Type:', $input.attr('type'));
      console.log('  Value:', $input.attr('value'));
      console.log('  ID:', $input.attr('id'));
      console.log('  Class:', $input.attr('class'));
      console.log('');
    });
    
    console.log('\n=== CAPTCHA RELATED ===\n');
    $('[class*="captcha"], [id*="captcha"], [name*="captcha"]').each((i, elem) => {
      console.log('Captcha element found:');
      console.log('  Tag:', elem.tagName);
      console.log('  HTML:', $(elem).toString());
      console.log('');
    });
    
    console.log('\n=== SCRIPTS RELATED TO CAPTCHA ===\n');
    $('script').each((i, elem) => {
      const scriptContent = $(elem).html();
      if (scriptContent && (scriptContent.includes('captcha') || scriptContent.includes('recaptcha') || scriptContent.includes('hcaptcha'))) {
        console.log(`Script ${i + 1} (contains captcha):`, scriptContent.substring(0, 300));
        console.log('...\n');
      }
    });
    
    console.log('\n=== ALL COOKIES ===\n');
    const cookies = await jar.getCookies('https://dash.infinityfree.com');
    cookies.forEach(cookie => {
      console.log(`${cookie.key}: ${cookie.value.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

investigateLoginPage();
