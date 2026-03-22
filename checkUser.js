const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'incident_db',
  user: 'postgres',
  password: 'tamim783095s',
});

async function check() {
  const result = await pool.query("SELECT * FROM USERS WHERE email = 'student1@ugrad.buet.ac.bd'");
  console.log('User:', result.rows);
  const result2 = await pool.query("SELECT * FROM USERS");
  console.log('All users map:', result2.rows.map(u => ({ email: u.email, is_active: u.is_active })));
  process.exit(0);
}

check();
