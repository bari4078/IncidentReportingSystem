const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const adminPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'BARI@8114',
});

async function setupDatabase() {
  try {
    console.log('🔍 Checking if dbms_project database exists...');
    const dbCheck = await adminPool.query(
      "SELECT datname FROM pg_database WHERE datname = 'dbms_project';"
    );

    if (dbCheck.rows.length === 0) {
      console.log('📦 Creating dbms_project database...');
      await adminPool.query('CREATE DATABASE dbms_project;');
      console.log('✅ Database created successfully!');
    } else {
      console.log('✅ Database already exists. Clearing it...');
      await adminPool.query('DROP DATABASE IF EXISTS dbms_project;');
      await adminPool.query('CREATE DATABASE dbms_project;');
      console.log('✅ Database recreated successfully!');
    }

    await adminPool.end();

    // Connect to the new database and run migrations
    console.log('\n📝 Running database schema setup...');
    const projectPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'dbms_project',
      user: 'postgres',
      password: 'BARI@8114',
    });

    // Run main schema
    const mainSql = fs.readFileSync(
      path.join(__dirname, 'main.sql'),
      'utf8'
    );
    await projectPool.query(mainSql);
    console.log('✅ Main schema created!');

    // Run seed data
    const seedSql = fs.readFileSync(
      path.join(__dirname, 'seed.sql'),
      'utf8'
    );
    await projectPool.query(seedSql);
    console.log('✅ Seed data inserted!');

    // Run database logic
    const logicSql = fs.readFileSync(
      path.join(__dirname, 'database_logic.sql'),
      'utf8'
    );
    await projectPool.query(logicSql);
    console.log('✅ Database logic/functions created!');

    // Responders migration handled directly if needed

    await projectPool.end();
    console.log('\n✨ Database setup completed successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

setupDatabase();
