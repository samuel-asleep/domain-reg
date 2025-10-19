require('dotenv').config();
const InfinityFreeAuth = require('./authService');

async function testLivewire() {
  const auth = new InfinityFreeAuth();
  await auth.ensureAuthenticated();
  
  const accountId = 'if0_40106205';
  
  // Try posting to the domains endpoint directly
  const postUrl = `${auth.baseURL}/accounts/${accountId}/domains`;
  
  console.log('Testing direct POST to:', postUrl);
  
  try {
    // Test with subdomain data
    const formData = {
      subdomain: 'testsite123',
      domain_extension: 'wuaze.co',
      _token: 'test'
    };
    
    const response = await auth.client.post(postUrl, new URLSearchParams(formData).toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 500
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.data) {
      const cheerio = require('cheerio');
      const $ = cheerio.load(response.data);
      const error = $('.alert-danger').text().trim();
      const success = $('.alert-success').text().trim();
      
      if (error) console.log('Error message:', error);
      if (success) console.log('Success message:', success);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    }
  }
}

testLivewire().catch(console.error);
