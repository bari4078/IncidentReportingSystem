const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dbms_project',
  user: 'postgres',
  password: 'BARI@8114'
});

async function seedTestUsers() {
  try {
    // Update existing admin user to use a valid BUET domain
    console.log('Updating Admin user email to valid domain...');
    await pool.query(
      "UPDATE USERS SET email = 'admin@buet.ac.bd', name = 'Admin User' WHERE role = 'Admin'"
    );

    // Check if Analyst user already exists
    const analystCheck = await pool.query("SELECT user_id FROM USERS WHERE role = 'Analyst'");
    
    if (analystCheck.rows.length === 0) {
      console.log('Creating Analyst user...');
      await pool.query(
        `INSERT INTO USERS (Name, Email, Phone, password_hash, Role, is_active)
         VALUES ('Analyst User', 'analyst@buet.ac.bd', '01700000002', 'password@123', 'Analyst', true)`
      );
    } else {
      console.log('Analyst user already exists, updating email to valid domain...');
      await pool.query(
        "UPDATE USERS SET email = 'analyst@buet.ac.bd' WHERE role = 'Analyst'"
      );
    }

    // Also ensure the test user with non-buet domain is updated
    await pool.query(
      "UPDATE USERS SET email = 'john@buet.ac.bd' WHERE email = 'john@example.com'"
    );

    // Verify final state
    const result = await pool.query('SELECT user_id, name, email, role, is_active FROM USERS ORDER BY role');
    console.log('\nFinal user list:');
    result.rows.forEach(u => {
      console.log(`  [${u.role}] ${u.name} | ${u.email} | active=${u.is_active}`);
    });

    console.log('\nTest credentials:');
    console.log('  Admin:   admin@buet.ac.bd   / password@123');
    console.log('  Analyst: analyst@buet.ac.bd / password@123');
    console.log('  User:    test@buet.ac.bd    / password@123');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    pool.end();
  }
}

seedTestUsers();
