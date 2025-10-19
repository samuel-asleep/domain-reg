require('dotenv').config();
const InfinityFreeAuth = require('./authService');

async function testRegistrationForms() {
  const auth = new InfinityFreeAuth();
  
  try {
    console.log('Initializing authentication...');
    await auth.initializeFromEnv();
    await auth.verifyAuthentication();
    
    console.log('\n=== Getting accounts ===');
    const accounts = await auth.getAccounts();
    console.log('Accounts:', accounts);
    
    if (accounts.length === 0) {
      console.log('No accounts found. Please create an account first.');
      return;
    }
    
    const accountId = accounts[0].id;
    console.log(`\nUsing account: ${accountId}`);
    
    console.log('\n=== Testing Domain Registration Form ===');
    try {
      const domainCreateUrl = `${auth.baseURL}/accounts/${accountId}/domains/create`;
      console.log(`Fetching: ${domainCreateUrl}`);
      const domainResponse = await auth.client.get(domainCreateUrl);
      
      const cheerio = require('cheerio');
      const $ = cheerio.load(domainResponse.data);
      
      console.log('\nForm fields found:');
      $('form input, form select, form textarea').each((i, elem) => {
        const name = $(elem).attr('name');
        const type = $(elem).attr('type');
        const placeholder = $(elem).attr('placeholder');
        const value = $(elem).attr('value');
        const id = $(elem).attr('id');
        
        if (name) {
          console.log(`  - Name: ${name}, Type: ${type || 'text'}, ID: ${id || 'none'}, Placeholder: ${placeholder || 'none'}, Value: ${value || 'none'}`);
        }
      });
      
      console.log('\nForm action:');
      $('form').each((i, elem) => {
        const action = $(elem).attr('action');
        const method = $(elem).attr('method');
        console.log(`  - Action: ${action}, Method: ${method}`);
      });
      
      console.log('\nLabels found:');
      $('label').each((i, elem) => {
        const forAttr = $(elem).attr('for');
        const text = $(elem).text().trim();
        if (text) {
          console.log(`  - For: ${forAttr || 'none'}, Text: ${text}`);
        }
      });
      
    } catch (error) {
      console.error('Error testing domain form:', error.message);
    }
    
    console.log('\n=== Getting existing domains ===');
    const domains = await auth.getDomains(accountId);
    console.log('Domains:', domains);
    
    if (domains.length > 0) {
      const testDomain = domains[0];
      console.log(`\n=== Testing Subdomain Registration Form for ${testDomain} ===`);
      
      try {
        const subdomainCreateUrl = `${auth.baseURL}/accounts/${accountId}/domains/${testDomain}/subdomains/create`;
        console.log(`Fetching: ${subdomainCreateUrl}`);
        const subdomainResponse = await auth.client.get(subdomainCreateUrl);
        
        const cheerio = require('cheerio');
        const $ = cheerio.load(subdomainResponse.data);
        
        console.log('\nForm fields found:');
        $('form input, form select, form textarea').each((i, elem) => {
          const name = $(elem).attr('name');
          const type = $(elem).attr('type');
          const placeholder = $(elem).attr('placeholder');
          const value = $(elem).attr('value');
          const id = $(elem).attr('id');
          
          if (name) {
            console.log(`  - Name: ${name}, Type: ${type || 'text'}, ID: ${id || 'none'}, Placeholder: ${placeholder || 'none'}, Value: ${value || 'none'}`);
          }
        });
        
        console.log('\nForm action:');
        $('form').each((i, elem) => {
          const action = $(elem).attr('action');
          const method = $(elem).attr('method');
          console.log(`  - Action: ${action}, Method: ${method}`);
        });
        
        console.log('\nLabels found:');
        $('label').each((i, elem) => {
          const forAttr = $(elem).attr('for');
          const text = $(elem).text().trim();
          if (text) {
            console.log(`  - For: ${forAttr || 'none'}, Text: ${text}`);
          }
        });
        
      } catch (error) {
        console.error('Error testing subdomain form:', error.message);
      }
    } else {
      console.log('No domains found to test subdomain registration.');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error);
  }
}

testRegistrationForms();
