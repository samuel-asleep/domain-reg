require('dotenv').config();
const InfinityFreeAuth = require('./authService');
const fs = require('fs');

async function checkForm() {
  const auth = new InfinityFreeAuth();
  await auth.ensureAuthenticated();
  
  const accountId = 'if0_40106205';
  const url = `${auth.baseURL}/accounts/${accountId}/domains/create`;
  
  console.log('Fetching:', url);
  const response = await auth.client.get(url);
  
  fs.writeFileSync('/tmp/domain-create-page.html', response.data);
  console.log('Saved to /tmp/domain-create-page.html');
  console.log('Status:', response.status);
  console.log('Content length:', response.data.length);
  
  const cheerio = require('cheerio');
  const $ = cheerio.load(response.data);
  
  console.log('\n=== SELECT elements ===');
  $('select').each((i, elem) => {
    console.log('Select name:', $(elem).attr('name'));
    console.log('Options:');
    $(elem).find('option').each((j, opt) => {
      console.log(`  - ${$(opt).attr('value')}: ${$(opt).text()}`);
    });
  });
  
  console.log('\n=== INPUT elements ===');
  $('input').each((i, elem) => {
    const name = $(elem).attr('name');
    const type = $(elem).attr('type');
    const id = $(elem).attr('id');
    console.log(`Input: name=${name}, type=${type}, id=${id}`);
  });
}

checkForm().catch(console.error);
