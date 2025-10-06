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
      </style>
    </head>
    <body>
      <div class="container">
        <h1>InfinityFree Automation</h1>
        
        <div class="test-section">
          <h2>Test Login</h2>
          <p>Click the button below to test the login functionality:</p>
          <form action="/test-login" method="POST">
            <button type="submit">Test Login</button>
          </form>
        </div>

        <div class="test-section">
          <h2>Register Domain</h2>
          <form action="/register-domain" method="POST">
            <label for="domain">Domain Name:</label><br>
            <input type="text" id="domain" name="domain" placeholder="example.com" required style="width: 100%; padding: 8px; margin: 10px 0;"><br>
            <button type="submit">Register Domain</button>
          </form>
        </div>

        <div class="test-section">
          <h2>Create CNAME Record</h2>
          <form action="/create-cname" method="POST">
            <label for="cname_domain">Domain:</label><br>
            <input type="text" id="cname_domain" name="domain" placeholder="example.com" required style="width: 100%; padding: 8px; margin: 10px 0;"><br>
            
            <label for="host">Host/Name:</label><br>
            <input type="text" id="host" name="host" placeholder="www" required style="width: 100%; padding: 8px; margin: 10px 0;"><br>
            
            <label for="target">Target/Value:</label><br>
            <input type="text" id="target" name="target" placeholder="target.example.com" required style="width: 100%; padding: 8px; margin: 10px 0;"><br>
            
            <button type="submit">Create CNAME</button>
          </form>
        </div>
      </div>
    </body>
    </html>
  `);
});

app.post('/test-login', async (req, res) => {
  try {
    console.log('Testing login...');
    const result = await authService.login(
      process.env.INFINITYFREE_EMAIL,
      process.env.INFINITYFREE_PASSWORD
    );
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Test Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .success { background-color: #d4edda; color: #155724; padding: 20px; border-radius: 4px; border: 1px solid #c3e6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✓ Login Successful!</h2>
          <p>${result.message}</p>
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
        <title>Login Test Result</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          .error { background-color: #f8d7da; color: #721c24; padding: 20px; border-radius: 4px; border: 1px solid #f5c6cb; }
          a { color: #007bff; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="error">
          <h2>✗ Login Failed</h2>
          <p>${error.message}</p>
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

app.post('/create-cname', async (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Create CNAME</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .info { background-color: #cce5ff; color: #004085; padding: 20px; border-radius: 4px; border: 1px solid #b8daff; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="info">
        <h2>CNAME Creation</h2>
        <p>This feature is coming next!</p>
        <p>Domain: ${req.body.domain}</p>
        <p>Host: ${req.body.host}</p>
        <p>Target: ${req.body.target}</p>
        <p><a href="/">← Back to Home</a></p>
      </div>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('InfinityFree Automation App Ready');
});
