require('dotenv').config();
const InfinityFreeAuth = require('./authService');
const cheerio = require('cheerio');

async function testDomainPage() {
  const auth = new InfinityFreeAuth();
  
  try {
    await auth.ensureAuthenticated();
    
    const accountId = 'if0_40106205';
    const domain = 'ffghhh.42web.io';
    
    const domainUrl = `${auth.baseURL}/accounts/${accountId}/domains/${domain}`;
    console.log(`Fetching: ${domainUrl}`);
    
    const response = await auth.client.get(domainUrl);
    const $ = cheerio.load(response.data);
    
    console.log('\n=== Links with "subdomain" ===');
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      if (href && (href.toLowerCase().includes('subdomain') || text.toLowerCase().includes('subdomain'))) {
        console.log(`Text: "${text}"`);
        console.log(`Href: ${href}\n`);
      }
    });
    
    console.log('\n=== All buttons/links ===');
    $('a.btn, button, a[class*="button"]').slice(0, 20).each((i, elem) => {
      const text = $(elem).text().trim();
      const href = $(elem).attr('href');
      if (text && text.length > 0 && text.length < 100) {
        console.log(`"${text}" => ${href || '(no href)'}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDomainPage();
