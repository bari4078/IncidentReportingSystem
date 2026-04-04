require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'dbms_project',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function checkForum() {
  try {
    const threads = await pool.query('SELECT * FROM FORUM_THREAD');
    console.log('Threads:', threads.rows);
    const posts = await pool.query('SELECT * FROM FORUM_POSTS');
    console.log('Posts:', posts.rows);
  } catch (err) {
    console.error('Error checking forum:', err.message);
  } finally {
    pool.end();
  }
}

checkForum();
