require('dotenv').config();
const express = require('express');
const path = require('path');
const InfinityFreeAuth = require('./src/authService');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/favicon.ico', (req, res) => res.status(204).end());

const authService = new InfinityFreeAuth();
const DEFAULT_ACCOUNT_ID = process.env.DEFAULT_ACCOUNT_ID;

function getAccountId(requestAccountId) {
  if (requestAccountId) {
    return requestAccountId;
  }
  
  if (!DEFAULT_ACCOUNT_ID) {
    throw new Error('Account ID not provided and DEFAULT_ACCOUNT_ID not set in environment');
  }
  
  return DEFAULT_ACCOUNT_ID;
}

app.post('/api/verify-auth', async (req, res) => {
  try {
    console.log('Verifying authentication...');
    await authService.initializeFromEnv();
    const result = await authService.verifyAuthentication();
    
    res.json({ 
      success: true, 
      message: result.message || 'Authentication successful'
    });
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/accounts', async (req, res) => {
  try {
    console.log('Getting accounts...');
    const accounts = await authService.getAccounts();
    
    res.json({ success: true, accounts });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/accounts/:accountId/domains', async (req, res) => {
  try {
    console.log(`Getting domains for account ${req.params.accountId}...`);
    const domains = await authService.getDomains(req.params.accountId);
    
    res.json({ success: true, domains });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/accounts/:accountId/domains/:domain/dns', async (req, res) => {
  try {
    console.log(`Getting DNS records for ${req.params.domain}...`);
    const records = await authService.getDNSRecords(req.params.accountId, req.params.domain);
    
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/subdomain-extensions', async (req, res) => {
  try {
    const accountId = getAccountId(req.query.accountId);
    console.log(`Getting available subdomain extensions for account ${accountId}...`);
    const result = await authService.getAvailableSubdomainExtensions(accountId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/accounts/:accountId/subdomain-extensions', async (req, res) => {
  try {
    console.log(`Getting available subdomain extensions for account ${req.params.accountId}...`);
    const result = await authService.getAvailableSubdomainExtensions(req.params.accountId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/register-domain', async (req, res) => {
  try {
    const accountId = getAccountId(req.body.accountId);
    const { subdomain, domainExtension } = req.body;
    
    if (!subdomain || !domainExtension) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: subdomain, domainExtension' 
      });
    }
    
    console.log(`Registering domain ${subdomain}.${domainExtension} for account ${accountId}...`);
    const result = await authService.registerDomain(accountId, subdomain, domainExtension);
    
    res.json({ 
      success: true, 
      message: result.message,
      domain: `${subdomain}.${domainExtension}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.post('/api/register-subdomain', async (req, res) => {
  try {
    const accountId = getAccountId(req.body.accountId);
    const { parentDomain, subdomain } = req.body;
    
    if (!parentDomain || !subdomain) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: parentDomain, subdomain' 
      });
    }
    
    console.log(`Registering subdomain ${subdomain}.${parentDomain} for account ${accountId}...`);
    const result = await authService.registerSubdomain(accountId, parentDomain, subdomain);
    
    res.json({ 
      success: true, 
      message: result.message,
      domain: `${subdomain}.${parentDomain}`
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.post('/api/create-cname', async (req, res) => {
  try {
    const accountId = getAccountId(req.body.accountId);
    const { domain, host, target } = req.body;
    
    if (!domain || !host || !target) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: domain, host, target' 
      });
    }
    
    console.log(`Creating CNAME record for ${host}.${domain} -> ${target}...`);
    const result = await authService.createCNAMERecord(accountId, domain, host, target);
    
    res.json({ 
      success: true, 
      message: result.message
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

app.get('/api/dns-records', async (req, res) => {
  try {
    const accountId = getAccountId(req.query.accountId);
    const { domain } = req.query;
    
    if (!domain) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: domain' 
      });
    }
    
    console.log(`Getting DNS records for ${domain} in account ${accountId}...`);
    const records = await authService.getDNSRecords(accountId, domain);
    
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.post('/verify-auth', async (req, res) => {
  try {
    console.log('Verifying authentication...');
    await authService.initializeFromEnv();
    const result = await authService.verifyAuthentication();
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Verification Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background-color: #d4edda; color: #155724; padding: 20px; border-radius: 4px; border: 1px solid #c3e6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✓ Authentication Successful!</h2>
          <p>${result.message}</p>
          <p>Your cookies are valid and working correctly.</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Verification Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 4px; border: 1px solid #f5c6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>✗ Authentication Failed</h2>
          <p>${error.message}</p>
          <p>Please check your INFINITYFREE_COOKIES environment variable.</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

app.post('/register-domain', async (req, res) => {
  try {
    console.log('Registering free InfinityFree subdomain...');
    const { accountId, subdomain, domainExtension } = req.body;
    
    if (!accountId || !subdomain || !domainExtension) {
      throw new Error('Missing required fields: accountId, subdomain, domainExtension');
    }
    
    const result = await authService.registerDomain(accountId, subdomain, domainExtension);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Domain Registration Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background-color: #d4edda; color: #155724; padding: 20px; border-radius: 4px; border: 1px solid #c3e6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✓ Domain Registered!</h2>
          <p>${result.message}</p>
          <p>Domain: ${subdomain}.${domainExtension}</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Domain Registration Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 4px; border: 1px solid #f5c6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>✗ Domain Registration Failed</h2>
          <p>${error.message}</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

app.post('/register-subdomain', async (req, res) => {
  try {
    console.log('Registering custom subdomain...');
    const { accountId, parentDomain, subdomain } = req.body;
    
    if (!accountId || !parentDomain || !subdomain) {
      throw new Error('Missing required fields: accountId, parentDomain, subdomain');
    }
    
    const result = await authService.registerSubdomain(accountId, parentDomain, subdomain);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Subdomain Registration Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background-color: #d4edda; color: #155724; padding: 20px; border-radius: 4px; border: 1px solid #c3e6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✓ Subdomain Registered!</h2>
          <p>${result.message}</p>
          <p>Domain: ${subdomain}.${parentDomain}</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Subdomain Registration Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 4px; border: 1px solid #f5c6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>✗ Subdomain Registration Failed</h2>
          <p>${error.message}</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

app.post('/create-cname', async (req, res) => {
  try {
    console.log('Creating CNAME record...');
    const { accountId, domain, host, target } = req.body;
    
    if (!accountId || !domain || !host || !target) {
      throw new Error('Missing required fields: accountId, domain, host, target');
    }
    
    const result = await authService.createCNAMERecord(accountId, domain, host, target);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CNAME Creation Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background-color: #d4edda; color: #155724; padding: 20px; border-radius: 4px; border: 1px solid #c3e6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✓ CNAME Record Created!</h2>
          <p>${result.message}</p>
          <p>Domain: ${domain}</p>
          <p>Host: ${host}</p>
          <p>Target: ${target}</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CNAME Creation Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 4px; border: 1px solid #f5c6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>✗ CNAME Creation Failed</h2>
          <p>${error.message}</p>
          <p><a href="/">← Back to Home</a></p>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/test-forms', async (req, res) => {
  try {
    const accounts = await authService.getAccounts();
    
    if (accounts.length === 0) {
      return res.send('No accounts found');
    }
    
    const accountId = accounts[0].id;
    const cheerio = require('cheerio');
    let output = '<html><head><title>Form Test</title><style>body{font-family:monospace;padding:20px;}pre{background:#f4f4f4;padding:10px;border:1px solid #ddd;max-height:400px;overflow:auto;}</style></head><body>';
    output += `<h1>Testing Forms for Account: ${accountId}</h1>`;
    
    output += '<h2>Domain Registration Page</h2>';
    try {
      const domainCreateUrl = `${authService.baseURL}/accounts/${accountId}/domains/create`;
      output += `<p>URL: ${domainCreateUrl}</p>`;
      const domainResponse = await authService.client.get(domainCreateUrl);
      const $ = cheerio.load(domainResponse.data);
      
      const pageTitle = $('title').text();
      output += `<p>Page Title: ${pageTitle}</p>`;
      
      output += '<h3>All Form Elements:</h3><pre>';
      let formCount = 0;
      $('form').each((i, form) => {
        formCount++;
        const action = $(form).attr('action');
        const method = $(form).attr('method');
        output += `\nFORM #${formCount}:\n`;
        output += `  Action: ${action || 'none'}\n`;
        output += `  Method: ${method || 'POST'}\n`;
        output += `  Inputs:\n`;
        
        $(form).find('input, select, textarea').each((j, elem) => {
          const name = $(elem).attr('name');
          const type = $(elem).attr('type');
          const placeholder = $(elem).attr('placeholder');
          const id = $(elem).attr('id');
          const value = $(elem).attr('value');
          output += `    - Name: ${name || 'none'}, Type: ${type || elem.tagName}, ID: ${id || 'none'}`;
          if (placeholder) output += `, Placeholder: ${placeholder}`;
          if (value) output += `, Value: ${value}`;
          output += '\n';
        });
      });
      
      if (formCount === 0) {
        output += 'No forms found on page. Showing page content snippet:\n\n';
        output += $('body').text().substring(0, 500);
      }
      output += '</pre>';
      
    } catch (error) {
      output += `<p>Error: ${error.message}</p>`;
      if (error.response) {
        output += `<p>Status: ${error.response.status}</p>`;
      }
    }
    
    const domains = await authService.getDomains(accountId);
    output += `<p>Found ${domains.length} domains</p>`;
    
    if (domains.length > 0) {
      const testDomain = domains[0];
      output += `<h2>Subdomain Registration Page (for ${testDomain})</h2>`;
      try {
        const subdomainCreateUrl = `${authService.baseURL}/accounts/${accountId}/domains/${testDomain}/subdomains/create`;
        output += `<p>URL: ${subdomainCreateUrl}</p>`;
        const subdomainResponse = await authService.client.get(subdomainCreateUrl);
        const $ = cheerio.load(subdomainResponse.data);
        
        const pageTitle = $('title').text();
        output += `<p>Page Title: ${pageTitle}</p>`;
        
        output += '<h3>All Form Elements:</h3><pre>';
        let formCount = 0;
        $('form').each((i, form) => {
          formCount++;
          const action = $(form).attr('action');
          const method = $(form).attr('method');
          output += `\nFORM #${formCount}:\n`;
          output += `  Action: ${action || 'none'}\n`;
          output += `  Method: ${method || 'POST'}\n`;
          output += `  Inputs:\n`;
          
          $(form).find('input, select, textarea').each((j, elem) => {
            const name = $(elem).attr('name');
            const type = $(elem).attr('type');
            const placeholder = $(elem).attr('placeholder');
            const id = $(elem).attr('id');
            const value = $(elem).attr('value');
            output += `    - Name: ${name || 'none'}, Type: ${type || elem.tagName}, ID: ${id || 'none'}`;
            if (placeholder) output += `, Placeholder: ${placeholder}`;
            if (value) output += `, Value: ${value}`;
            output += '\n';
          });
        });
        
        if (formCount === 0) {
          output += 'No forms found on page. Showing page content snippet:\n\n';
          output += $('body').text().substring(0, 500);
        }
        output += '</pre>';
        
      } catch (error) {
        output += `<p>Error: ${error.message}</p>`;
        if (error.response) {
          output += `<p>Status: ${error.response.status}</p>`;
        }
      }
    }
    
    output += '</body></html>';
    res.send(output);
  } catch (error) {
    res.send(`Error: ${error.message}<br><pre>${error.stack}</pre>`);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('InfinityFree Automation App Ready');
  console.log('Using cookie-based authentication');
  if (DEFAULT_ACCOUNT_ID) {
    console.log(`Default Account ID configured: ${DEFAULT_ACCOUNT_ID}`);
  }
});
