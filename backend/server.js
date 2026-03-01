const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3000;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'demo_db',
  user: 'postgres',
  password: 'BARI@8114',
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }


    const validDomains = ['@buet.ac.bd', '@ugrad.buet.ac.bd', '@dmp.bd'];
    const isValidDomain = validDomains.some(domain => email.endsWith(domain));

    if (!isValidDomain) {
      return res.status(401).json({ error: 'Invalid email domain' });
    }

    const result = await pool.query(
      'SELECT user_id, name, email, role, is_active FROM USERS WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];


    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    if (password !== 'password@123') {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');

    res.json({
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {

  res.json({ success: true });
});

app.get('/api/auth/user', async (req, res) => {
  try {

    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = Buffer.from(token, 'base64').toString('ascii');
    const [email] = decoded.split(':');
    if (!email) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'SELECT user_id, name, email, role FROM USERS WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});


app.get('/api/incidents', async (req, res) => {
  let { status_id, type_id, severity_id, location_id, assigned_to } = req.query;
  try {

    status_id = status_id ? parseInt(status_id, 10) : undefined;
    type_id = type_id ? parseInt(type_id, 10) : undefined;
    severity_id = severity_id ? parseInt(severity_id, 10) : undefined;
    location_id = location_id ? parseInt(location_id, 10) : undefined;
    assigned_to = assigned_to ? parseInt(assigned_to, 10) : undefined;

    let query = `
      SELECT i.*, 
             it.Type_name, 
             s.Severity_name, 
             ist.Status_name,
             l.Location_name,
             u.Name as Reported_by_name
      FROM INCIDENTS i
      LEFT JOIN INCIDENT_TYPES it ON i.Type_id = it.Type_id
      LEFT JOIN SEVERITY_LEVEL s ON i.Severity_id = s.Severity_id
      LEFT JOIN INCIDENT_STATUS ist ON i.Current_status_id = ist.Status_id
      LEFT JOIN Locations l ON i.Location_id = l.Location_id
      LEFT JOIN USERS u ON i.Reported_by = u.User_id
      WHERE 1=1
    `;
    const params = [];
    if (status_id !== undefined) {
      query += ` AND i.Current_status_id = $${params.length + 1}`;
      params.push(status_id);
    }
    if (type_id !== undefined) {
      query += ` AND i.Type_id = $${params.length + 1}`;
      params.push(type_id);
    }
    if (severity_id !== undefined) {
      query += ` AND i.Severity_id = $${params.length + 1}`;
      params.push(severity_id);
    }
    if (location_id !== undefined) {
      query += ` AND i.Location_id = $${params.length + 1}`;
      params.push(location_id);
    }
    if (assigned_to !== undefined) {
      query += ` AND EXISTS (
                 SELECT 1 FROM INCIDENT_ASSIGNMENTS a
                 WHERE a.Incident_id = i.Incident_id
                   AND a.Assigned_to = $${params.length + 1}
                   AND a.Is_active = TRUE
               )`;
      params.push(assigned_to);
    }
    query += ' ORDER BY i.Incident_id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/incidents/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT i.*, 
             it.Type_name, 
             s.Severity_name, 
             ist.Status_name,
             l.Location_name,
             u.Name as Reported_by_name
      FROM INCIDENTS i
      LEFT JOIN INCIDENT_TYPES it ON i.Type_id = it.Type_id
      LEFT JOIN SEVERITY_LEVEL s ON i.Severity_id = s.Severity_id
      LEFT JOIN INCIDENT_STATUS ist ON i.Current_status_id = ist.Status_id
      LEFT JOIN Locations l ON i.Location_id = l.Location_id
      LEFT JOIN USERS u ON i.Reported_by = u.User_id
      WHERE i.Incident_id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.post('/api/incidents', async (req, res) => {
  const { reported_by, type_id, location_id, severity_id, description, is_public } = req.body;
  try {
    if (!reported_by || !type_id || !location_id || !description) {
      return res.status(400).json({ error: 'required fields missing' });
    }


    let final_severity = null;
    if (severity_id) {
      final_severity = severity_id;
    } else {

      const typeRes = await pool.query('SELECT Default_severity_level FROM INCIDENT_TYPES WHERE Type_id = $1', [type_id]);
      final_severity = typeRes.rows[0]?.default_severity_level || null;
    }


    if (parseInt(type_id, 10) === 4) {
      final_severity = 4;
    }

    const publicFlag = typeof is_public === 'boolean' ? is_public : false;

    const result = await pool.query(
      `INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [reported_by, type_id, location_id, final_severity, 1, description, publicFlag]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.put('/api/incidents/:id', async (req, res) => {
  const { description, is_public } = req.body;
  try {
    const result = await pool.query(
      `UPDATE INCIDENTS 
       SET Description = COALESCE($1, Description),
           is_public = COALESCE($2, is_public),
           Last_updated_time = CURRENT_TIMESTAMP
       WHERE Incident_id = $3 RETURNING *`,
      [description || null, is_public !== undefined ? is_public : null, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.post('/api/incidents/:id/status', async (req, res) => {
  const { new_status_id, changed_by } = req.body;
  try {

    const currentResult = await pool.query(
      'SELECT Current_status_id FROM INCIDENTS WHERE Incident_id = $1',
      [req.params.id]
    );
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    const old_status_id = currentResult.rows[0].current_status_id;


    await pool.query(
      'UPDATE INCIDENTS SET Current_status_id = $1, Last_updated_time = CURRENT_TIMESTAMP WHERE Incident_id = $2',
      [new_status_id, req.params.id]
    );


    await pool.query(
      `INSERT INTO INCIDENT_STATUS_HISTORY (Incident_id, Old_status_id, New_status_id, Changed_by) 
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, old_status_id, new_status_id, changed_by]
    );

    res.json({ success: true, message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/incidents/:id/history', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT h.*, 
             os.Status_name as Old_status_name,
             ns.Status_name as New_status_name,
             u.Name as Changed_by_name
      FROM INCIDENT_STATUS_HISTORY h
      LEFT JOIN INCIDENT_STATUS os ON h.Old_status_id = os.Status_id
      LEFT JOIN INCIDENT_STATUS ns ON h.New_status_id = ns.Status_id
      LEFT JOIN USERS u ON h.Changed_by = u.User_id
      WHERE h.Incident_id = $1
      ORDER BY h.Change_time ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/incidents/:id/comments', async (req, res) => {
  const { include_internal } = req.query;
  try {
    let query = `
      SELECT c.*, u.Name, u.Role
      FROM INCIDENT_COMMENTS c
      JOIN USERS u ON c.User_id = u.User_id
      WHERE c.Incident_id = $1
    `;
    const params = [req.params.id];
    

    if (include_internal !== 'true') {
      query += ' AND c.is_internal = false';
    }
    
    query += ' ORDER BY c.Comment_time ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.post('/api/incidents/:id/comments', async (req, res) => {
  const { user_id, comment_text, is_internal } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, user_id, comment_text, is_internal || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/incidents/:id/assignments', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.Name, u.Email, u.Role
      FROM INCIDENT_ASSIGNMENTS a
      JOIN USERS u ON a.Assigned_to = u.User_id
      WHERE a.Incident_id = $1
      ORDER BY a.Assigned_time DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.post('/api/incidents/:id/assignments', async (req, res) => {
  const { assigned_to } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO INCIDENT_ASSIGNMENTS (Incident_id, Assigned_to) 
       VALUES ($1, $2) RETURNING *`,
      [req.params.id, assigned_to]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.put('/api/incidents/:id/assignments/:assignment_id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE INCIDENT_ASSIGNMENTS 
       SET Is_active = false 
       WHERE Assignment_id = $1 AND Incident_id = $2 RETURNING *`,
      [req.params.assignment_id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/incidents/:id/photos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, u.Name
      FROM INCIDENT_PHOTOS p
      JOIN USERS u ON p.Uploaded_by = u.User_id
      WHERE p.Incident_id = $1
      ORDER BY p.Uploaded_time DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.post('/api/incidents/:id/photos', async (req, res) => {
  const { uploaded_by, file_path } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO INCIDENT_PHOTOS (Incident_id, Uploaded_by, File_path) 
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, uploaded_by, file_path]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/locations', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM Locations ORDER BY Location_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/incident-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT it.*, s.Severity_name
      FROM INCIDENT_TYPES it
      LEFT JOIN SEVERITY_LEVEL s ON it.Default_severity_level = s.Severity_id
      ORDER BY it.Type_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/severity-levels', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM SEVERITY_LEVEL ORDER BY Priority_score ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM INCIDENT_STATUS ORDER BY Status_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/users', async (req, res) => {
  const { role } = req.query;
  try {
    let query = 'SELECT User_id, Name, Email, Role, Phone, Created_at, is_active FROM USERS WHERE is_active = true';
    const params = [];
    if (role) {
      query += ` AND Role = $${params.length + 1}`;
      params.push(role);
    }
    query += ' ORDER BY User_id ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT User_id, Name, Email, Role, Phone, Created_at, is_active FROM USERS WHERE User_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, it.Type_name
      FROM INCIDENT_ANALYTICS a
      LEFT JOIN INCIDENT_TYPES it ON a.Type_id = it.Type_id
      ORDER BY a.Type_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/analytics/hotspots/location', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        l.Location_id,
        l.Location_name,
        l.Building,
        l.Floor,
        COUNT(i.Incident_id) as incident_count,
        ROUND(AVG(s.Priority_score)::numeric, 2) as avg_severity
      FROM Locations l
      LEFT JOIN INCIDENTS i ON l.Location_id = i.Location_id
      LEFT JOIN SEVERITY_LEVEL s ON i.Severity_id = s.Severity_id
      GROUP BY l.Location_id, l.Location_name, l.Building, l.Floor
      ORDER BY incident_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/stats/type', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        it.Type_id,
        it.Type_name,
        COUNT(i.Incident_id) as total_count,
        SUM(CASE WHEN ist.Status_name = 'Resolved' THEN 1 ELSE 0 END) as resolved_count,
        SUM(CASE WHEN ist.Status_name = 'Rejected' THEN 1 ELSE 0 END) as rejected_count,
        ROUND(100.0 * SUM(CASE WHEN ist.Status_name = 'Resolved' THEN 1 ELSE 0 END) / COUNT(i.Incident_id), 2) as resolution_rate
      FROM INCIDENT_TYPES it
      LEFT JOIN INCIDENTS i ON it.Type_id = i.Type_id
      LEFT JOIN INCIDENT_STATUS ist ON i.Current_status_id = ist.Status_id
      GROUP BY it.Type_id, it.Type_name
      ORDER BY total_count DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/trends/time', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        DATE(i.Reported_time) as report_date,
        COUNT(i.Incident_id) as incident_count,
        ROUND(AVG(s.Priority_score)::numeric, 2) as avg_severity
      FROM INCIDENTS i
      LEFT JOIN SEVERITY_LEVEL s ON i.Severity_id = s.Severity_id
      GROUP BY DATE(i.Reported_time)
      ORDER BY report_date DESC
      LIMIT 30
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/correlation', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(100.0 * COUNT(CASE WHEN i.Type_id = 4 THEN 1 END) / NULLIF(COUNT(*),0), 2)
        END as medical_percentage,
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(100.0 * COUNT(CASE WHEN i.Type_id = 3 THEN 1 END) / NULLIF(COUNT(*),0), 2)
        END as maintenance_percentage,
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(100.0 * COUNT(CASE WHEN i.Type_id = 1 THEN 1 END) / NULLIF(COUNT(*),0), 2)
        END as theft_percentage,
        CASE WHEN COUNT(*) = 0 THEN 0
             ELSE ROUND(100.0 * COUNT(CASE WHEN i.Type_id = 2 THEN 1 END) / NULLIF(COUNT(*),0), 2)
        END as harassment_percentage,
        COUNT(i.Incident_id) as total_incidents
      FROM INCIDENTS i
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.get('/api/users/:user_id/notifications', async (req, res) => {
  const { unread_only } = req.query;
  try {
    let query = `
      SELECT n.*, i.Description as incident_description, it.Type_name
      FROM NOTIFICATIONS n
      LEFT JOIN INCIDENTS i ON n.Incident_id = i.Incident_id
      LEFT JOIN INCIDENT_TYPES it ON i.Type_id = it.Type_id
      WHERE n.User_id = $1
    `;
    const params = [req.params.user_id];
    if (unread_only === 'true') {
      query += ' AND n.Is_read = false';
    }
    query += ' ORDER BY n.Created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.put('/api/notifications/:id/read', async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE NOTIFICATIONS SET Is_read = true WHERE Notification_id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/forum/threads', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ft.*, u.Name, COUNT(fp.Post_id) as post_count
      FROM FORUM_THREAD ft
      JOIN USERS u ON ft.User_id = u.User_id
      LEFT JOIN FORUM_POSTS fp ON ft.Thread_id = fp.Thread_id
      GROUP BY ft.Thread_id, u.Name
      ORDER BY ft.Created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/forum/threads/:id/posts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT fp.*, u.Name, u.Role
      FROM FORUM_POSTS fp
      JOIN USERS u ON fp.User_id = u.User_id
      WHERE fp.Thread_id = $1
      ORDER BY fp.Created_at ASC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/forum/threads', async (req, res) => {
  const { user_id, title } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO FORUM_THREAD (User_id, Title) VALUES ($1, $2) RETURNING *',
      [user_id, title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/forum/threads/:id/posts', async (req, res) => {
  const { user_id, post_text, is_anonymous } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO FORUM_POSTS (Thread_id, User_id, Post_text, Is_anonymous) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, user_id, post_text, is_anonymous || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});