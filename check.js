const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'incident_db',
  user: 'postgres',
  password: 'tamim783095s',
});

async function check() {
  const result = await pool.query('SELECT * FROM USERS');
  console.log('USERS count:', result.rows.length);
  process.exit(0);
}

check();
