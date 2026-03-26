const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dbms_project',
  user: 'postgres',
  password: 'BARI@8114',
});

async function checkLocations() {
  try {
    const res = await pool.query('SELECT * FROM Locations ORDER BY Location_id ASC');
    console.log(`Found ${res.rows.length} locations:`);
    res.rows.forEach(row => {
      console.log(`ID: ${row.location_id}, Name: ${row.location_name}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

checkLocations();
