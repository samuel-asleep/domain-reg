require('dotenv').config();
const express = require('express');
const InfinityFreeAuth = require('./authService');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
            <li><code>POST /create-cname</code> - Create a CNAME record</li>
          </ul>
        </div>
      </div>
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
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Register Domain</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .info { background-color: #cce5ff; color: #004085; padding: 20px; border-radius: 4px; border: 1px solid #b8daff; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="info">
        <h2>Domain Registration</h2>
        <p>This feature is coming next! Domain: ${req.body.domain}</p>
        <p><a href="/">← Back to Home</a></p>
      </div>
    </body>
    </html>
  `);
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
