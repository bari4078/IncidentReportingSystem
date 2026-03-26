const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dbms_project',
  user: 'postgres',
  password: 'BARI@8114'
});

pool.query('SELECT user_id, name, email, role, is_active FROM USERS ORDER BY role')
  .then(r => {
    console.log('Users in DB:');
    r.rows.forEach(u => console.log(`  [${u.role}] ${u.name} (${u.email}) active=${u.is_active}`));
    pool.end();
  })
  .catch(e => {
    console.error('DB Error:', e.message);
    pool.end();
  });
