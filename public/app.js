document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });

  // Auto-load domain extensions on startup for better UX
  console.log('Auto-loading domain extensions...');
  loadExtensions();
});

function setStatus(elementId, message, type = 'info') {
  const element = document.getElementById(elementId);
  element.textContent = message;
  element.className = `status-message ${type}`;
}

async function verifyAuth() {
  setStatus('authStatus', 'Verifying...', 'info');
  
  try {
    const response = await fetch('/api/verify-auth', {
      method: 'POST'
    });
    
    const data = await response.json();
    
    if (data.success) {
      setStatus('authStatus', '✓ Authentication successful!', 'success');
    } else {
      setStatus('authStatus', '✗ Authentication failed: ' + data.message, 'error');
    }
  } catch (error) {
    setStatus('authStatus', '✗ Error: ' + error.message, 'error');
  }
}

async function getAccounts() {
  const container = document.getElementById('accountsList');
  container.innerHTML = '<p style="color: #666;">Loading accounts...</p>';
  
  try {
    const response = await fetch('/accounts');
    const data = await response.json();
    
    if (data.success && data.accounts.length > 0) {
      let html = '<div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0;">';
      html += '<h3 style="margin-bottom: 15px; color: #333;">Your Accounts:</h3>';
      html += '<ul style="list-style: none;">';
      
      data.accounts.forEach(account => {
        html += `<li style="padding: 10px; margin: 5px 0; background: #f8f9fa; border-radius: 4px;">
          <strong>${account.name || account.id}</strong>
          <code style="margin-left: 10px; background: #e9ecef; padding: 4px 8px; border-radius: 3px;">${account.id}</code>
        </li>`;
      });
      
      html += '</ul></div>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p style="color: #856404;">No accounts found.</p>';
    }
  } catch (error) {
    container.innerHTML = `<p style="color: #dc3545;">Error: ${error.message}</p>`;
  }
}

async function loadExtensions() {
  const select = document.getElementById('domain_extension');
  const accountId = document.getElementById('domain_accountId').value.trim();
  
  setStatus('domainStatus', 'Loading extensions...', 'info');
  select.innerHTML = '<option value="">Loading...</option>';
  
  try {
    const url = accountId 
      ? `/api/subdomain-extensions?accountId=${encodeURIComponent(accountId)}`
      : '/api/subdomain-extensions';
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.extensions && data.extensions.length > 0) {
      select.innerHTML = '';
      data.extensions.forEach(ext => {
        const option = document.createElement('option');
        option.value = ext.value;
        option.textContent = ext.label || ext.value;
        select.appendChild(option);
      });
      setStatus('domainStatus', `✓ Loaded ${data.extensions.length} extensions`, 'success');
    } else {
      select.innerHTML = '<option value="">No extensions found</option>';
      setStatus('domainStatus', '⚠ No extensions available', 'error');
    }
  } catch (error) {
    select.innerHTML = '<option value="">Error loading</option>';
    setStatus('domainStatus', '✗ Error: ' + error.message, 'error');
  }
}

async function registerDomain() {
  const accountId = document.getElementById('domain_accountId').value.trim();
  const subdomain = document.getElementById('domain_subdomain').value.trim();
  const extension = document.getElementById('domain_extension').value;
  
  if (!subdomain || !extension) {
    setStatus('domainStatus', '⚠ Please fill all fields and load extensions', 'error');
    return;
  }
  
  setStatus('domainStatus', 'Registering domain...', 'info');
  
  try {
    const requestBody = {
      subdomain,
      domainExtension: extension
    };
    
    if (accountId) {
      requestBody.accountId = accountId;
    }
    
    const response = await fetch('/api/register-domain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.success) {
      setStatus('domainStatus', `✓ Domain registered: ${subdomain}.${extension}`, 'success');
      document.getElementById('domain_subdomain').value = '';
    } else {
      setStatus('domainStatus', '✗ ' + data.message, 'error');
    }
  } catch (error) {
    setStatus('domainStatus', '✗ Error: ' + error.message, 'error');
  }
}

async function registerSubdomain() {
  const accountId = document.getElementById('subdomain_accountId').value.trim();
  const parentDomain = document.getElementById('parent_domain').value.trim();
  const subdomain = document.getElementById('custom_subdomain').value.trim();
  
  if (!parentDomain || !subdomain) {
    setStatus('subdomainStatus', '⚠ Please fill all fields', 'error');
    return;
  }
  
  setStatus('subdomainStatus', 'Registering subdomain...', 'info');
  
  try {
    const requestBody = {
      parentDomain,
      subdomain
    };
    
    if (accountId) {
      requestBody.accountId = accountId;
    }
    
    const response = await fetch('/api/register-subdomain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.success) {
      setStatus('subdomainStatus', `✓ Subdomain registered: ${subdomain}.${parentDomain}`, 'success');
      document.getElementById('parent_domain').value = '';
      document.getElementById('custom_subdomain').value = '';
    } else {
      setStatus('subdomainStatus', '✗ ' + data.message, 'error');
    }
  } catch (error) {
    setStatus('subdomainStatus', '✗ Error: ' + error.message, 'error');
  }
}

async function createCNAME() {
  const accountId = document.getElementById('cname_accountId').value.trim();
  const domain = document.getElementById('cname_domain').value.trim();
  const host = document.getElementById('cname_host').value.trim();
  const target = document.getElementById('cname_target').value.trim();
  
  if (!domain || !host || !target) {
    setStatus('cnameStatus', '⚠ Please fill all fields', 'error');
    return;
  }
  
  setStatus('cnameStatus', 'Creating CNAME record...', 'info');
  
  try {
    const requestBody = {
      domain,
      host,
      target
    };
    
    if (accountId) {
      requestBody.accountId = accountId;
    }
    
    const response = await fetch('/api/create-cname', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    const data = await response.json();
    
    if (data.success) {
      setStatus('cnameStatus', `✓ CNAME record created for ${host}.${domain}`, 'success');
      document.getElementById('cname_domain').value = '';
      document.getElementById('cname_host').value = '';
      document.getElementById('cname_target').value = '';
    } else {
      setStatus('cnameStatus', '✗ ' + data.message, 'error');
    }
  } catch (error) {
    setStatus('cnameStatus', '✗ Error: ' + error.message, 'error');
  }
}

async function getDNSRecords() {
  const accountId = document.getElementById('dns_accountId').value.trim();
  const domain = document.getElementById('dns_domain').value.trim();
  const container = document.getElementById('dnsRecords');
  
  if (!domain) {
    container.innerHTML = '<p style="color: #dc3545;">Please enter a domain name</p>';
    return;
  }
  
  container.innerHTML = '<p style="color: #666;">Loading DNS records...</p>';
  
  try {
    const url = accountId
      ? `/api/dns-records?domain=${encodeURIComponent(domain)}&accountId=${encodeURIComponent(accountId)}`
      : `/api/dns-records?domain=${encodeURIComponent(domain)}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.records && data.records.length > 0) {
      let html = '<div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e0e0e0; overflow-x: auto;">';
      html += '<h3 style="margin-bottom: 15px; color: #333;">DNS Records:</h3>';
      html += '<table style="width: 100%; border-collapse: collapse;">';
      html += '<thead><tr style="background: #f8f9fa;">';
      html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Domain</th>';
      html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Type</th>';
      html += '<th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Target</th>';
      html += '</tr></thead><tbody>';
      
      data.records.forEach(record => {
        html += `<tr style="border-bottom: 1px solid #dee2e6;">
          <td style="padding: 10px;"><code>${record.domain}</code></td>
          <td style="padding: 10px;"><span style="background: #e7f5ff; color: #0066cc; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${record.type}</span></td>
          <td style="padding: 10px;"><code>${record.target}</code></td>
        </tr>`;
      });
      
      html += '</tbody></table></div>';
      container.innerHTML = html;
    } else {
      container.innerHTML = '<p style="color: #856404;">No DNS records found for this domain.</p>';
    }
  } catch (error) {
    container.innerHTML = `<p style="color: #dc3545;">Error: ${error.message}</p>`;
  }
}
