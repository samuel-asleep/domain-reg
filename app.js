require('dotenv').config();
const express = require('express');
const InfinityFreeAuth = require('./src/authService');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/favicon.ico', (req, res) => res.status(204).end());

const authService = new InfinityFreeAuth();

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>InfinityFree Automation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          border-bottom: 3px solid #007bff;
          padding-bottom: 10px;
        }
        .test-section {
          margin: 20px 0;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        button {
          background-color: #007bff;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        button:hover {
          background-color: #0056b3;
        }
        .result {
          margin-top: 20px;
          padding: 15px;
          border-radius: 4px;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        .error {
          background-color: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        input, select {
          width: 100%;
          padding: 8px;
          margin: 10px 0;
          box-sizing: border-box;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>InfinityFree Automation</h1>
        
        <div class="test-section">
          <h2>Verify Authentication</h2>
          <p>Click the button below to verify that your cookies are working:</p>
          <form action="/verify-auth" method="POST">
            <button type="submit">Verify Authentication</button>
          </form>
        </div>

        <div class="test-section">
          <h2>View Accounts & Domains</h2>
          <p>Get a list of your hosting accounts and domains:</p>
          <a href="/accounts" target="_blank"><button type="button">View Accounts (JSON)</button></a>
        </div>

        <div class="test-section">
          <h2>Register Free InfinityFree Subdomain</h2>
          <form action="/register-domain" method="POST">
            <label for="domain_accountId">Account ID:</label><br>
            <input type="text" id="domain_accountId" name="accountId" placeholder="if0_40106205" required><br>
            
            <label for="subdomain">Subdomain Name:</label><br>
            <input type="text" id="subdomain" name="subdomain" placeholder="mysite" required><br>
            
            <label for="domainExtension">Domain Extension:</label><br>
            <select id="domainExtension" name="domainExtension" required>
              <option value="">Loading extensions...</option>
            </select><br>
            <button type="button" onclick="loadExtensions()" id="loadExtBtn">Load Available Extensions</button>
            <span id="extStatus" style="margin-left: 10px;"></span><br><br>
            
            <button type="submit">Register Domain</button>
          </form>
        </div>

        <div class="test-section">
          <h2>Register Custom Subdomain</h2>
          <p><small>Note: For subdomains of your own custom domain that you've already added to InfinityFree</small></p>
          <form action="/register-subdomain" method="POST">
            <label for="sub_accountId">Account ID:</label><br>
            <input type="text" id="sub_accountId" name="accountId" placeholder="if0_40106205" required><br>
            
            <label for="parentDomain">Parent Domain:</label><br>
            <input type="text" id="parentDomain" name="parentDomain" placeholder="example.com" required><br>
            
            <label for="subdomainName">Subdomain Name:</label><br>
            <input type="text" id="subdomainName" name="subdomain" placeholder="blog" required><br>
            
            <button type="submit">Register Subdomain</button>
          </form>
        </div>

        <div class="test-section">
          <h2>Create CNAME Record</h2>
          <form action="/create-cname" method="POST">
            <label for="accountId">Account ID:</label><br>
            <input type="text" id="accountId" name="accountId" placeholder="if0_40106205" required><br>
            
            <label for="cname_domain">Domain:</label><br>
            <input type="text" id="cname_domain" name="domain" placeholder="scrapes.xo.je" required><br>
            
            <label for="host">Host/Name (subdomain):</label><br>
            <input type="text" id="host" name="host" placeholder="www" required><br>
            
            <label for="target">Target/Value:</label><br>
            <input type="text" id="target" name="target" placeholder="target.example.com" required><br>
            
            <button type="submit">Create CNAME Record</button>
          </form>
        </div>

        <div class="test-section">
          <h2>API Endpoints</h2>
          <p>Available API endpoints for programmatic access:</p>
          <ul>
            <li><code>GET /accounts</code> - List all hosting accounts</li>
            <li><code>GET /accounts/:accountId/domains</code> - List domains for an account</li>
            <li><code>GET /accounts/:accountId/domains/:domain/dns</code> - List DNS records</li>
            <li><code>GET /accounts/:accountId/subdomain-extensions</code> - Get available subdomain extensions</li>
            <li><code>POST /register-domain</code> - Register a free InfinityFree subdomain</li>
            <li><code>POST /register-subdomain</code> - Register a custom subdomain</li>
            <li><code>POST /create-cname</code> - Create a CNAME record</li>
          </ul>
        </div>
      </div>
      
      <script>
        async function loadExtensions() {
          const accountId = document.getElementById('domain_accountId').value;
          const select = document.getElementById('domainExtension');
          const btn = document.getElementById('loadExtBtn');
          const status = document.getElementById('extStatus');
          
          if (!accountId) {
            status.textContent = '⚠ Please enter Account ID first';
            status.style.color = 'orange';
            return;
          }
          
          btn.disabled = true;
          btn.textContent = 'Loading...';
          status.textContent = '⏳ Fetching extensions...';
          status.style.color = 'blue';
          select.innerHTML = '<option value="">Loading...</option>';
          
          try {
            const response = await fetch(\`/accounts/\${accountId}/subdomain-extensions\`);
            const data = await response.json();
            
            if (data.success && data.extensions && data.extensions.length > 0) {
              select.innerHTML = '';
              data.extensions.forEach(ext => {
                const option = document.createElement('option');
                option.value = ext.value;
                option.textContent = ext.label || ext.value;
                select.appendChild(option);
              });
              status.textContent = \`✓ Loaded \${data.extensions.length} extensions\`;
              status.style.color = 'green';
            } else {
              select.innerHTML = '<option value="">No extensions found</option>';
              status.textContent = '⚠ No extensions found';
              status.style.color = 'orange';
            }
          } catch (error) {
            console.error('Error loading extensions:', error);
            select.innerHTML = '<option value="">Error loading</option>';
            status.textContent = '✗ Error: ' + error.message;
            status.style.color = 'red';
          } finally {
            btn.disabled = false;
            btn.textContent = 'Load Available Extensions';
          }
        }
      </script>
    </body>
    </html>
  `);
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

app.get('/accounts/:accountId/subdomain-extensions', async (req, res) => {
  try {
    console.log(`Getting available subdomain extensions for account ${req.params.accountId}...`);
    const result = await authService.getAvailableSubdomainExtensions(req.params.accountId);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('InfinityFree Automation App Ready');
  console.log('Using cookie-based authentication');
});
