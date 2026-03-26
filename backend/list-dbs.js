const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dbms_project',
  password: 'BARI@8114',
  port: 5432,
});

async function listTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public';");
    console.log("Tables:");
    res.rows.forEach(r => console.log(r.table_name));
  } catch(e) {
    console.error("Error:", e.message);
  } finally {
    pool.end();
  }
}
listTables();
