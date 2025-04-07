const { Pool } = require('pg');
const config = require('./config');

const dbConfig = {
  user: config.DB_USER,
  host: config.HOST,
  database: config.DATABASE,
  password: config.PASSWORD,
  min: 0,
  max: 50,
  port: config.DBPORT,
  ssl: { rejectUnauthorized: false },
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
};

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const retryConnect = async (retries = 5, delay = 5000) => {
  while (retries) {
    try {
      console.log(`Attempting to connect to the database... (${retries} retries left)`);
      let client = await pool.connect();
      console.log('Connected Successfully with Postgres');
      client.release();
      return; // Exit on success
    } catch (error) {
      console.error('Error connecting to Postgres:', error.message);
      retries -= 1;
      if (!retries) {
        console.error('All retries exhausted. Could not connect to Postgres.');
        throw error; // Throw error after final retry
      }
      console.log(`Retrying connection in ${delay / 1000} seconds...`);
      await new Promise((res) => setTimeout(res, delay)); // Wait before retrying
    }
  }
};

async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('Connected Successfully with Postgres');
    client.release();
  } catch (error) {
    await retryConnect();
    console.error('Error trying to connect Postgres:', error);
  }
};

module.exports = { pool, connectDB };