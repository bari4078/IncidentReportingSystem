const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'incident_db',
  user: 'postgres',
  password: 'tamim783095s',
});

async function runSeed() {
  try {
    const seedSql = fs.readFileSync(path.join(__dirname, 'database', 'seed.sql'), 'utf8');
    await pool.query(seedSql);
    console.log('Seed executed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error executing seed:', err);
    process.exit(1);
  }
}

runSeed();
