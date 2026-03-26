const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dbms_project',
  user: 'postgres',
  password: 'BARI@8114',
});

async function migrate() {
    try {
        await pool.query('ALTER TABLE FORUM_THREAD ADD COLUMN IF NOT EXISTS Is_anonymous BOOLEAN DEFAULT FALSE;');
        await pool.query('ALTER TABLE FORUM_THREAD ADD COLUMN IF NOT EXISTS Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE SET NULL;');
        await pool.query('ALTER TABLE FORUM_POSTS ADD COLUMN IF NOT EXISTS Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE SET NULL;');
        await pool.query(`CREATE TABLE IF NOT EXISTS FORUM_POST_REACTIONS (
            Reaction_id SERIAL PRIMARY KEY,
            Post_id INT REFERENCES FORUM_POSTS(Post_id) ON DELETE CASCADE,
            User_id INT REFERENCES USERS(User_id) ON DELETE CASCADE,
            Reaction_type VARCHAR(10) CHECK (Reaction_type IN ('like', 'dislike')),
            Created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(Post_id, User_id)
        );`);
        console.log('Migration successful');
    } catch (err) {
        console.error('Migration failed', err);
    } finally {
        await pool.end();
    }
}

migrate();
