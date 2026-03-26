require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// ─── Environment-driven constants ─────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_ROUNDS = 10;

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add it to your .env file.');
  process.exit(1);
}

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);


const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME     || 'dbms_project',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD,
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../frontend'), {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));

// ─── Auth Middleware ──────────────────────────────────────────────────────────
/**
 * Verifies the Bearer JWT in the Authorization header.
 * Attaches the decoded payload to req.user on success.
 */
function authenticateToken(req, res, next) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized — no token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

/**
 * Role-based access control gate.
 * Usage:  requireRole('Admin')  or  requireRole(['Admin','Analyst'])
 */
function requireRole(...roles) {
  const allowed = roles.flat();
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden — insufficient role' });
    }
    next();
  };
}

// ─── Global Auth Gate for API ─────────────────────────────────────────────────
/**
 * Ensures all /api requests are authenticated, except for the initial auth flow.
 */
app.use('/api', (req, res, next) => {
  const publicPaths = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/verify-code',
    '/auth/reset-password'
  ];
  // Note: req.path is relative to the /api mount point
  if (publicPaths.includes(req.path)) {
    return next();
  }
  authenticateToken(req, res, next);
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {

    if (!email || !password) {
      return res.status(400).json(
        {
          error: 'Email and password required'
        });
    }


    const validDomains = ['@buet.ac.bd', '@ugrad.buet.ac.bd', '@cse.buet.ac.bd', '@dmp.bd'];
    const isValidDomain = validDomains.some(domain => email.endsWith(domain));

    if (!isValidDomain) {
      return res.status(401).json({
        error: 'Invalid email domain'
      });
    }

    const result = await pool.query(
      'SELECT user_id, name, email, role, is_active, password_hash FROM USERS WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];


    if (!user.is_active) {
      if (user.role !== 'User') {
        return res.status(401).json({ error: 'Account is pending admin approval' });
      }
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // ── Secure password comparison via bcrypt ───────────────────────────────
    // Support legacy plaintext passwords (migrated users) by falling back to
    // a direct comparison ONLY when the stored hash does not look like a bcrypt
    // hash ($2b$ prefix). Once the user logs in, their password is re-hashed.
    let passwordValid = false;
    if (user.password_hash && user.password_hash.startsWith('$2')) {
      // Modern: bcrypt hash
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } else {
      // Legacy: plaintext stored — accept once, then re-hash
      passwordValid = (password === user.password_hash);
      if (passwordValid) {
        const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await pool.query('UPDATE USERS SET password_hash = $1 WHERE user_id = $2', [newHash, user.user_id]);
      }
    }

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ── Issue a signed JWT ──────────────────────────────────────────────────
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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

app.post('/api/auth/register', async (req, res) => {
  const { name, email, phone, password, role } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password required' });
    }

    const validDomains = ['@buet.ac.bd', '@ugrad.buet.ac.bd', '@cse.buet.ac.bd', '@dmp.bd'];
    const isValidDomain = validDomains.some(domain => email.endsWith(domain));
    if (!isValidDomain) {
      return res.status(401).json({ error: 'Invalid email domain' });
    }

    if (phone) {
      const checkPhone = await pool.query('SELECT user_id FROM USERS WHERE phone = $1', [phone]);
      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    const checkEmail = await pool.query('SELECT user_id FROM USERS WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    let assignedRole = role || 'User';
    const validRoles = ['User', 'Admin', 'Analyst', 'Responder'];
    if (!validRoles.includes(assignedRole)) {
      assignedRole = 'User';
    }

    const isActive = (assignedRole === 'User');

    // ── Hash password before storing ────────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO USERS (Name, Email, Phone, password_hash, Role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING user_id, name, email, role`,
      [name, email, phone || null, hashedPassword, assignedRole, isActive]
    );

    res.status(201).json({ success: true, user: result.rows[0], pendingApproval: !isActive });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const verificationCodes = {};

app.post('/api/auth/forgot-password', async (req, res) => {
  const { phone } = req.body;
  try {
    const result = await pool.query('SELECT user_id FROM USERS WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found with this phone number' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes[phone] = {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
    };

    console.log(`\n========================================`);
    console.log(`[MOCK SMS] Password reset requested for phone: ${phone}`);
    console.log(`[MOCK SMS] Verification Code: ${code}`);
    console.log(`========================================\n`);

    res.json({ success: true, message: 'Verification code sent' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/verify-code', async (req, res) => {
  const { phone, code } = req.body;
  try {
    const record = verificationCodes[phone];
    if (!record || record.code !== code || Date.now() > record.expiresAt) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    const result = await pool.query('SELECT user_id, name, email, role, is_active FROM USERS WHERE phone = $1', [phone]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const user = result.rows[0];

    // Issue a short-lived JWT (15 min) for the password-reset flow only
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role, scope: 'password_reset' },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    delete verificationCodes[phone];

    res.json({
      success: true,
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

app.post('/api/auth/reset-password', async (req, res) => {
  const { new_password } = req.body;
  try {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : null;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    }
    const { email } = decoded;
    if (!email) return res.status(401).json({ error: 'Unauthorized' });

    // Hash the new password before storing
    const hashedPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query('UPDATE USERS SET password_hash = $1 WHERE email = $2', [hashedPassword, email]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { old_password, new_password } = req.body;
  const userId = req.user.user_id;

  try {
    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    // Fetch the user's current password hash
    const result = await pool.query('SELECT password_hash FROM USERS WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_hash } = result.rows[0];

    // Verify the old password
    const isMatch = await bcrypt.compare(old_password, password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // Hash the new password
    const newHashedPassword = await bcrypt.hash(new_password, BCRYPT_ROUNDS);

    // Update the password in the database
    await pool.query('UPDATE USERS SET password_hash = $1 WHERE user_id = $2', [newHashedPassword, userId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error changing password:', err);
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
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    }

    const result = await pool.query(
      'SELECT user_id, name, email, role FROM USERS WHERE email = $1',
      [decoded.email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: 'Unauthorized' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});


app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, name, email, role, is_active FROM USERS ORDER BY user_id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/severity-levels', async (req, res) => {
  try {
    const result = await pool.query('SELECT severity_id, severity_name, priority_score FROM SEVERITY_LEVEL ORDER BY priority_score DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/status', async (req, res) => {
  try {
    const result = await pool.query('SELECT status_id, status_name FROM INCIDENT_STATUS ORDER BY status_id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/incident-types', async (req, res) => {
  try {
    const result = await pool.query('SELECT type_id, type_name, default_severity_level FROM INCIDENT_TYPES ORDER BY type_name');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});


app.get('/api/incidents', async (req, res) => {
  let { status_id, type_id, severity_id, location_id, assigned_to, reported_by, is_public } = req.query;
  try {

    status_id = status_id ? parseInt(status_id, 10) : undefined;
    type_id = type_id ? parseInt(type_id, 10) : undefined;
    severity_id = severity_id ? parseInt(severity_id, 10) : undefined;
    location_id = location_id ? parseInt(location_id, 10) : undefined;
    assigned_to = assigned_to ? parseInt(assigned_to, 10) : undefined;
    reported_by = reported_by ? parseInt(reported_by, 10) : undefined;

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
    if (reported_by !== undefined) {
      query += ` AND i.Reported_by = $${params.length + 1}`;
      params.push(reported_by);
    }
    if (is_public !== undefined) {
      query += ` AND i.is_public = $${params.length + 1}`;
      params.push(is_public === 'true');
    }
    query += ' ORDER BY i.Reported_time DESC, i.Incident_id DESC';
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
             u.Name as Reported_by_name,
             au.Name as Assigned_to_name
      FROM INCIDENTS i
      LEFT JOIN INCIDENT_TYPES it ON i.Type_id = it.Type_id
      LEFT JOIN SEVERITY_LEVEL s ON i.Severity_id = s.Severity_id
      LEFT JOIN INCIDENT_STATUS ist ON i.Current_status_id = ist.Status_id
      LEFT JOIN Locations l ON i.Location_id = l.Location_id
      LEFT JOIN USERS u ON i.Reported_by = u.User_id
      LEFT JOIN INCIDENT_ASSIGNMENTS ia ON i.Incident_id = ia.Incident_id AND ia.Is_active = TRUE
      LEFT JOIN USERS au ON ia.Assigned_to = au.User_id
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
  const { description, is_public, severity_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE INCIDENTS 
       SET Description = COALESCE($1, Description),
           is_public = COALESCE($2, is_public),
           Severity_id = COALESCE($3, Severity_id)
       WHERE Incident_id = $4 RETURNING *`,
      [description || null, is_public !== undefined ? is_public : null, severity_id || null, req.params.id]
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

app.put('/api/users/:id/status', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { is_active } = req.body;
  try {
    const result = await pool.query(
      'UPDATE USERS SET is_active = $1 WHERE User_id = $2 RETURNING user_id, name, email, role, is_active',
      [is_active, req.params.id]
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

app.put('/api/users/:id/role', authenticateToken, requireRole('Admin'), async (req, res) => {
  const { role } = req.body;
  try {
    const validRoles = ['User', 'Admin', 'Analyst', 'Responder'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const result = await pool.query(
      'UPDATE USERS SET role = $1 WHERE User_id = $2 RETURNING user_id, name, email, role, is_active',
      [role, req.params.id]
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


app.post('/api/incidents/:id/status', authenticateToken, async (req, res) => {
  const { new_status_id, changed_by } = req.body;
  try {
    // ─── Offload logic to database procedure ──────────────────────────────
    // The stored procedure 'update_incident_status' handles the update and
    // ensures the audit trail (INCIDENT_STATUS_HISTORY) is correctly attributed.
    await pool.query(
      'CALL update_incident_status($1, $2, $3)',
      [req.params.id, new_status_id, changed_by]
    );

    res.json({ success: true, message: 'Status updated via database procedure' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});


app.post('/api/incidents/:id/assignments', authenticateToken, requireRole('Admin', 'Responder'), async (req, res) => {
  const { assigned_to } = req.body;
  const changed_by = req.user.user_id; // Using the authenticated user ID
  try {
    // ─── Offload logic to database procedure ──────────────────────────────
    // The procedure 'assign_responder' atomicly handles:
    // 1. Deactivating old assignments (via trigger)
    // 2. Creating the new assignment
    // 3. Updating the incident status to 'Assigned'
    // 4. Correctly attributing the status history change
    await pool.query(
      'CALL assign_responder($1, $2, $3)',
      [req.params.id, assigned_to, changed_by]
    );

    res.json({ success: true, message: 'Incident assigned via database procedure' });
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
  const { user_id, comment_text, is_internal, is_admin_comment } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, is_admin_comment) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.params.id, user_id, comment_text, is_internal || false, is_admin_comment || false]
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
    // ─── Use Database Function for Analytics ──────────────────────────────
    // get_overall_stats() provides a consolidated view of system metrics.
    const result = await pool.query('SELECT * FROM get_overall_stats()');
    res.json(result.rows[0]);
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

app.get('/api/analytics/severity-dist', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.Severity_name, 
        COUNT(i.Incident_id) as count,
        ROUND(100.0 * COUNT(i.Incident_id) / (SELECT COUNT(*) FROM INCIDENTS), 2) as percentage
      FROM SEVERITY_LEVEL s
      LEFT JOIN INCIDENTS i ON s.Severity_id = i.Severity_id
      GROUP BY s.Severity_id, s.Severity_name
      ORDER BY s.Priority_score ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/status-dist', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        s.Status_name, 
        COUNT(i.Incident_id) as count,
        ROUND(100.0 * COUNT(i.Incident_id) / (SELECT COUNT(*) FROM INCIDENTS), 2) as percentage
      FROM INCIDENT_STATUS s
      LEFT JOIN INCIDENTS i ON s.Status_id = i.Current_status_id
      GROUP BY s.Status_id, s.Status_name
      ORDER BY s.Status_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/resolution-times', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        it.Type_name,
        AVG(i.Last_updated_time - i.Reported_time) as avg_resolution_time
      FROM INCIDENTS i
      JOIN INCIDENT_TYPES it ON i.Type_id = it.Type_id
      JOIN INCIDENT_STATUS ist ON i.Current_status_id = ist.Status_id
      WHERE ist.Status_name = 'Resolved'
      GROUP BY it.Type_id, it.Type_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/user-activity', async (req, res) => {
  try {
    const topReporters = await pool.query(`
      SELECT u.Name, COUNT(i.Incident_id) as count
      FROM USERS u
      JOIN INCIDENTS i ON u.User_id = i.Reported_by
      GROUP BY u.User_id, u.Name
      ORDER BY count DESC
      LIMIT 10
    `);
    const topAssignees = await pool.query(`
      SELECT u.Name, COUNT(a.Assignment_id) as count
      FROM USERS u
      JOIN INCIDENT_ASSIGNMENTS a ON u.User_id = a.Assigned_to
      GROUP BY u.User_id, u.Name
      ORDER BY count DESC
      LIMIT 10
    `);
    res.json({ reporters: topReporters.rows, assignees: topAssignees.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/day-of-week', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(Reported_time, 'Day') as day_name,
        EXTRACT(DOW FROM Reported_time) as dow,
        COUNT(*) as count
      FROM INCIDENTS
      GROUP BY day_name, dow
      ORDER BY dow ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/hourly-trend', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM Reported_time) as hourOfDay,
        COUNT(*) as count
      FROM INCIDENTS
      GROUP BY hourOfDay
      ORDER BY hourOfDay ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/attachment-stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        it.Type_name,
        COUNT(DISTINCT p.Photo_id) as photo_count,
        COUNT(DISTINCT v.Video_id) as video_count,
        COUNT(DISTINCT a.Audio_id) as audio_count
      FROM INCIDENT_TYPES it
      LEFT JOIN INCIDENTS i ON it.Type_id = i.Type_id
      LEFT JOIN INCIDENT_PHOTOS p ON i.Incident_id = p.Incident_id
      LEFT JOIN INCIDENT_VIDEO v ON i.Incident_id = v.Incident_id
      LEFT JOIN INCIDENT_AUDIO a ON i.Incident_id = a.Audio_id
      GROUP BY it.Type_id, it.Type_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/forum-activity', async (req, res) => {
  try {
    const threadCounts = await pool.query(`
      SELECT TO_CHAR(Created_at, 'YYYY-MM-DD') as date, COUNT(*) as thread_count
      FROM FORUM_THREAD
      GROUP BY TO_CHAR(Created_at, 'YYYY-MM-DD')
      ORDER BY date DESC
      LIMIT 15
    `);
    const postCounts = await pool.query(`
      SELECT TO_CHAR(Created_at, 'YYYY-MM-DD') as date, COUNT(*) as post_count
      FROM FORUM_POSTS
      GROUP BY TO_CHAR(Created_at, 'YYYY-MM-DD')
      ORDER BY date DESC
      LIMIT 15
    `);
    res.json({ threads: threadCounts.rows, posts: postCounts.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/analytics/public-ratio', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        is_public,
        COUNT(*) as count,
        ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM INCIDENTS), 2) as percentage
      FROM INCIDENTS
      GROUP BY is_public
    `);
    res.json(result.rows);
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
      SELECT ft.*, u.Name as author_name, u.Role as author_role, COUNT(fp.Post_id) as post_count
      FROM FORUM_THREAD ft
      LEFT JOIN USERS u ON ft.User_id = u.User_id
      LEFT JOIN FORUM_POSTS fp ON ft.Thread_id = fp.Thread_id
      GROUP BY ft.Thread_id, u.Name, u.Role
      ORDER BY ft.Created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.get('/api/forum/threads/:id', async (req, res) => {
  const { user_id } = req.query; // to check reactions
  try {
    const threadRes = await pool.query(`
      SELECT ft.*, u.Name as author_name, u.Role as author_role
      FROM FORUM_THREAD ft
      LEFT JOIN USERS u ON ft.User_id = u.User_id
      WHERE ft.Thread_id = $1
    `, [req.params.id]);

    if (threadRes.rows.length === 0) return res.status(404).json({ error: 'Thread not found' });

    let postQuery = `
      SELECT fp.*, u.Name as author_name, u.Role as author_role,
             (SELECT COUNT(*) FROM FORUM_POST_REACTIONS fpr WHERE fpr.Post_id = fp.Post_id AND fpr.Reaction_type = 'like') as likes_count,
             (SELECT COUNT(*) FROM FORUM_POST_REACTIONS fpr WHERE fpr.Post_id = fp.Post_id AND fpr.Reaction_type = 'dislike') as dislikes_count
      `;

    let queryParams = [req.params.id];
    if (user_id) {
      postQuery += `, (SELECT Reaction_type FROM FORUM_POST_REACTIONS fpr WHERE fpr.Post_id = fp.Post_id AND fpr.User_id = $2) as user_reaction `;
      queryParams.push(user_id);
    } else {
      postQuery += `, NULL as user_reaction `;
    }

    postQuery += `
      FROM FORUM_POSTS fp
      LEFT JOIN USERS u ON fp.User_id = u.User_id
      WHERE fp.Thread_id = $1
      ORDER BY fp.Created_at ASC
    `;

    const postsRes = await pool.query(postQuery, queryParams);
    res.json({ thread: threadRes.rows[0], posts: postsRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/forum/threads', async (req, res) => {
  const { user_id, title, content, is_anonymous, incident_id } = req.body;
  try {
    await pool.query('BEGIN');
    const tRes = await pool.query(
      'INSERT INTO FORUM_THREAD (User_id, Title, Is_anonymous, Incident_id) VALUES ($1, $2, $3, $4) RETURNING Thread_id',
      [user_id, title, is_anonymous || false, incident_id || null]
    );
    const thread_id = tRes.rows[0].thread_id;
    await pool.query(
      'INSERT INTO FORUM_POSTS (Thread_id, User_id, Post_text, Is_anonymous) VALUES ($1, $2, $3, $4)',
      [thread_id, user_id, content || '', is_anonymous || false]
    );
    await pool.query('COMMIT');
    res.status(201).json({ success: true, thread_id });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/forum/threads/:id/posts', async (req, res) => {
  const { user_id, content, is_anonymous } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO FORUM_POSTS (Thread_id, User_id, Post_text, Is_anonymous) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, user_id, content, is_anonymous || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error', details: err.message });
  }
});

app.post('/api/forum/posts/:id/react', async (req, res) => {
  const { user_id, reaction_type } = req.body; // 'like' or 'dislike'
  try {
    const existing = await pool.query('SELECT * FROM FORUM_POST_REACTIONS WHERE Post_id = $1 AND User_id = $2', [req.params.id, user_id]);

    if (existing.rows.length > 0) {
      if (existing.rows[0].reaction_type === reaction_type) {
        await pool.query('DELETE FROM FORUM_POST_REACTIONS WHERE Post_id = $1 AND User_id = $2', [req.params.id, user_id]);
      } else {
        await pool.query('UPDATE FORUM_POST_REACTIONS SET Reaction_type = $1 WHERE Post_id = $2 AND User_id = $3', [reaction_type, req.params.id, user_id]);
      }
    } else {
      await pool.query('INSERT INTO FORUM_POST_REACTIONS (Post_id, User_id, Reaction_type) VALUES ($1, $2, $3)', [req.params.id, user_id, reaction_type]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});