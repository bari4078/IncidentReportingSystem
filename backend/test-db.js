const { Pool } = require('pg');

const passwordsToTry = [
  'postgres',
  'root',
  'admin',
  'password',
  '1234',
  '123456',
  'abidb',
  ''
];

async function tryPasswords() {
  for (const pwd of passwordsToTry) {
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'IncidentReporting',
      password: pwd,
      port: 5432,
    });

    try {
      const client = await pool.connect();
      console.log(`SUCCESS: ${pwd}`);
      client.release();
      await pool.end();
      return process.exit(0);
    } catch (err) {
      console.log(`FAILED: ${pwd}`);
      await pool.end();
    }
  }
  
  // also try default database 'postgres' if 'IncidentReporting' fails
  for (const pwd of passwordsToTry) {
    const pool = new Pool({
      user: 'postgres',
      host: 'localhost',
      database: 'postgres',
      password: pwd,
      port: 5432,
    });

    try {
      const client = await pool.connect();
      console.log(`SUCCESS_DB_POSTGRES: ${pwd}`);
      client.release();
      await pool.end();
      return process.exit(0);
    } catch (err) {
      await pool.end();
    }
  }
  
  console.log('ALL FAILED');
  process.exit(1);
}

tryPasswords();
