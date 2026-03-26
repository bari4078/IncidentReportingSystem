const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dbms_project',
  user: 'postgres',
  password: 'BARI@8114',
});

const sql = fs.readFileSync(path.join(__dirname, 'add_responders.sql'), 'utf8');

async function run() {
  try {
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
