const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'dbms_project',
  user: 'postgres',
  password: 'BARI@8114',
});

const locations = [
  ['Main Gate', 'Main Entrance', 'Ground', 'Entry Point'],
  ['Shahid Abrar Fahad Library (Central Library)', 'Library Building', 'Ground', 'Main Hall'],
  ['Registrar Building', 'Administration', 'Ground', 'Main Office'],
  ['Rector\'s Office', 'Admin Block', '1', 'Office'],
  ['ECE Building (Electrical & Computer Engineering)', 'ECE Block', '2', 'Lab'],
  ['EME Building (Mechanical Engineering)', 'ME Block', '2', 'Lab'],
  ['Civil Engineering Building', 'CE Block', '1', 'Classroom'],
  ['Chemistry Department', 'Science Block', '2', 'Lab'],
  ['Physics Department', 'Science Block', '2', 'Lab'],
  ['Architecture Building', 'Arch Block', '3', 'Studio'],
  ['Chemical Engineering Building', 'ChE Block', '2', 'Lab'],
  ['Ahsanullah Hall', 'Boys Dormitory', '3', 'Common Room'],
  ['Titumir Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['Suhrawardy Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['Sher-e-Bangla Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['Dr. M.A. Rashid Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['Sabekun Nahar Sony Hall', 'Girls Dormitory', '2', 'Common Room'],
  ['Shahid Smrity Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['Swadhinata Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['Kazi Nazrul Islam Hall', 'Boys Dormitory', '2', 'Common Room'],
  ['BUET Masjid (Main Mosque)', 'Mosque', 'Ground', 'Prayer Hall'],
  ['Central Cafeteria', 'Food Court', 'Ground', 'Dining Area'],
  ['BUET Stadium & Playground', 'Sports Complex', 'Ground', 'Field'],
  ['Gymnasium', 'Sports Facility', 'Ground', 'Main Hall'],
  ['Medical Center', 'Healthcare', 'Ground', 'Reception'],
  ['Bus Terminus', 'Transport', 'Ground', 'Platform'],
  ['Machine Shop & Manufacturing Lab', 'Workshop', 'Ground', 'Main Area'],
  ['IT Center (ICT Academy)', 'Tech Hub', '1', 'Computer Lab'],
  ['Student Center', 'Community Space', 'Ground', 'Main Area'],
  ['Water Treatment Plant', 'Infrastructure', 'Ground', 'Plant'],
  ['Shaheed Minar (Monument)', 'Memorial', 'Ground', 'Monument']
];

async function restoreLocations() {
  try {
    console.log('Restoring BUET locations...');
    await pool.query('BEGIN');
    // Truncate locations table and reset identity - this might break existing reports IF any exist using ID 1 or 2
    // But since there are only 2 locations now, it's safer to reset to the standard state.
    await pool.query('TRUNCATE TABLE Locations RESTART IDENTITY CASCADE');
    
    for (const loc of locations) {
      await pool.query(
        'INSERT INTO Locations (Location_name, Building, Floor, Room) VALUES ($1, $2, $3, $4)',
        loc
      );
    }
    
    await pool.query('COMMIT');
    console.log('Successfully restored all 31 BUET locations.');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

restoreLocations();
