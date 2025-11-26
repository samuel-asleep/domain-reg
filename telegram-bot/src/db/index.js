const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDatabase() {
  const client = await getPool().connect();
  
  try {
    console.log('Initializing database tables...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        domain VARCHAR(255) NOT NULL,
        subdomain VARCHAR(255),
        extension VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, domain)
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS dns_records (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
        record_type VARCHAR(20) NOT NULL,
        host VARCHAR(255),
        target VARCHAR(255),
        delete_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        chat_id BIGINT NOT NULL,
        state VARCHAR(100),
        state_data JSONB DEFAULT '{}',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, chat_id)
      )
    `);
    
    console.log('Database tables initialized successfully');
  } finally {
    client.release();
  }
}

async function query(text, params) {
  return getPool().query(text, params);
}

async function getUser(telegramId) {
  const result = await query(
    'SELECT * FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  return result.rows[0];
}

async function createUser(telegramId, username, firstName, lastName) {
  const result = await query(
    `INSERT INTO users (telegram_id, username, first_name, last_name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username = EXCLUDED.username,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [telegramId, username, firstName, lastName]
  );
  return result.rows[0];
}

async function getUserDomains(userId) {
  const result = await query(
    'SELECT * FROM domains WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

async function addDomain(userId, domain, subdomain, extension) {
  const result = await query(
    `INSERT INTO domains (user_id, domain, subdomain, extension)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, domain) DO UPDATE SET
       status = 'active'
     RETURNING *`,
    [userId, domain, subdomain, extension]
  );
  return result.rows[0];
}

async function getDomainByName(userId, domain) {
  const result = await query(
    'SELECT * FROM domains WHERE user_id = $1 AND domain = $2',
    [userId, domain]
  );
  return result.rows[0];
}

async function deleteDomain(userId, domain) {
  const result = await query(
    'DELETE FROM domains WHERE user_id = $1 AND domain = $2 RETURNING *',
    [userId, domain]
  );
  return result.rows[0];
}

async function getSession(userId, chatId) {
  const result = await query(
    'SELECT * FROM user_sessions WHERE user_id = $1 AND chat_id = $2',
    [userId, chatId]
  );
  return result.rows[0];
}

async function setSession(userId, chatId, state, stateData = {}) {
  const result = await query(
    `INSERT INTO user_sessions (user_id, chat_id, state, state_data, updated_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, chat_id) DO UPDATE SET
       state = EXCLUDED.state,
       state_data = EXCLUDED.state_data,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, chatId, state, JSON.stringify(stateData)]
  );
  return result.rows[0];
}

async function clearSession(userId, chatId) {
  await query(
    'DELETE FROM user_sessions WHERE user_id = $1 AND chat_id = $2',
    [userId, chatId]
  );
}

module.exports = {
  initDatabase,
  query,
  getUser,
  createUser,
  getUserDomains,
  addDomain,
  getDomainByName,
  deleteDomain,
  getSession,
  setSession,
  clearSession
};
