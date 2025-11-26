const axios = require('axios');

class ApiClient {
  constructor() {
    this.baseUrl = process.env.DOMAIN_REG_API || 'http://localhost:5000';
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getStatus() {
    try {
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get API status: ${error.message}`);
    }
  }

  async getAccounts() {
    try {
      const response = await this.client.get('/accounts');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get accounts: ${error.message}`);
    }
  }

  async getDomains(accountId) {
    try {
      const response = await this.client.get(`/accounts/${accountId}/domains`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get domains: ${error.message}`);
    }
  }

  async getSubdomainExtensions(accountId) {
    try {
      const url = accountId 
        ? `/accounts/${accountId}/subdomain-extensions`
        : '/api/subdomain-extensions';
      const response = await this.client.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get subdomain extensions: ${error.message}`);
    }
  }

  async registerDomain(subdomain, domainExtension, accountId) {
    try {
      const response = await this.client.post('/api/register-domain', {
        subdomain,
        domainExtension,
        accountId
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to register domain: ${message}`);
    }
  }

  async deleteDomain(domain, accountId) {
    try {
      const response = await this.client.delete('/api/delete-domain', {
        data: { domain, accountId }
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete domain: ${message}`);
    }
  }

  async getDnsRecords(domain, accountId) {
    try {
      const params = { domain };
      if (accountId) params.accountId = accountId;
      const response = await this.client.get('/api/dns-records', { params });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get DNS records: ${error.message}`);
    }
  }

  async createCnameRecord(domain, host, target, accountId) {
    try {
      const response = await this.client.post('/api/create-cname', {
        domain,
        host,
        target,
        accountId
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to create CNAME record: ${message}`);
    }
  }

  async deleteDnsRecord(deleteId, accountId) {
    try {
      const response = await this.client.delete('/api/dns-records', {
        data: { deleteId, accountId }
      });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to delete DNS record: ${message}`);
    }
  }
}

module.exports = new ApiClient();
