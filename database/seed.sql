BEGIN;

-- ============================================================================
-- CLEAN SLATE: Remove existing data and reset identity sequences
-- ============================================================================
TRUNCATE TABLE 
  INCIDENT_AUDIO, INCIDENT_VIDEO, INCIDENT_PHOTOS, INCIDENT_COMMENTS,
  INCIDENT_ASSIGNMENTS, INCIDENT_STATUS_HISTORY, INCIDENTS,
  INCIDENT_TYPES, FORUM_POSTS, FORUM_THREAD, NOTIFICATIONS,
  INCIDENT_ANALYTICS, USERS, Locations, INCIDENT_STATUS, SEVERITY_LEVEL
RESTART IDENTITY CASCADE;

-- ============================================================================
-- SEVERITY LEVELS
-- ============================================================================
INSERT INTO SEVERITY_LEVEL (Severity_name, Priority_score, Description) 
VALUES 
  ('Low', 1, 'Minor issues with no immediate impact'),
  ('Medium', 2, 'Moderate issues affecting operations'),
  ('High', 3, 'Serious issues requiring urgent attention'),
  ('Critical', 4, 'Emergency situations requiring immediate action');

-- ============================================================================
-- INCIDENT STATUS
-- ============================================================================
INSERT INTO INCIDENT_STATUS (Status_name) 
VALUES 
  ('Reported'),
  ('In Review'),
  ('Assigned'),
  ('Resolved'),
  ('Rejected');

-- ============================================================================
-- LOCATIONS - BUET CAMPUS
-- ============================================================================
INSERT INTO Locations (Location_name, Building, Floor, Room) 
VALUES
  ('Main Gate', 'Main Entrance', 'Ground', 'Entry Point'),
  ('Shahid Abrar Fahad Library (Central Library)', 'Library Building', 'Ground', 'Main Hall'),
  ('Registrar Building', 'Administration', 'Ground', 'Main Office'),
  ('Rector''s Office', 'Admin Block', '1', 'Office'),
  ('ECE Building (Electrical & Computer Engineering)', 'ECE Block', '2', 'Lab'),
  ('EME Building (Mechanical Engineering)', 'ME Block', '2', 'Lab'),
  ('Civil Engineering Building', 'CE Block', '1', 'Classroom'),
  ('Chemistry Department', 'Science Block', '2', 'Lab'),
  ('Physics Department', 'Science Block', '2', 'Lab'),
  ('Architecture Building', 'Arch Block', '3', 'Studio'),
  ('Chemical Engineering Building', 'ChE Block', '2', 'Lab'),
  ('Ahsanullah Hall', 'Boys Dormitory', '3', 'Common Room'),
  ('Titumir Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('Suhrawardy Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('Sher-e-Bangla Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('Dr. M.A. Rashid Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('Sabekun Nahar Sony Hall', 'Girls Dormitory', '2', 'Common Room'),
  ('Shahid Smrity Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('Swadhinata Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('Kazi Nazrul Islam Hall', 'Boys Dormitory', '2', 'Common Room'),
  ('BUET Masjid (Main Mosque)', 'Mosque', 'Ground', 'Prayer Hall'),
  ('Central Cafeteria', 'Food Court', 'Ground', 'Dining Area'),
  ('BUET Stadium & Playground', 'Sports Complex', 'Ground', 'Field'),
  ('Gymnasium', 'Sports Facility', 'Ground', 'Main Hall'),
  ('Medical Center', 'Healthcare', 'Ground', 'Reception'),
  ('Bus Terminus', 'Transport', 'Ground', 'Platform'),
  ('Machine Shop & Manufacturing Lab', 'Workshop', 'Ground', 'Main Area'),
  ('IT Center (ICT Academy)', 'Tech Hub', '1', 'Computer Lab'),
  ('Student Center', 'Community Space', 'Ground', 'Main Area'),
  ('Water Treatment Plant', 'Infrastructure', 'Ground', 'Plant'),
  ('Shaheed Minar (Monument)', 'Memorial', 'Ground', 'Monument');

-- ============================================================================
-- USERS
-- ============================================================================
INSERT INTO USERS (Name, Email, password_hash, Role, Phone, is_active) 
VALUES
  ('Authority Office', 'authority@buet.ac.bd', 'hashed_pass_auth', 'Admin', '880-1234-5678', true),
  ('Dean of Studies Wing', 'dsw@buet.ac.bd', 'hashed_pass_dsw', 'Admin', '880-1234-5679', true),
  ('Vice Chancellor', 'vc@buet.ac.bd', 'hashed_pass_vc', 'Admin', '880-1234-5680', true),
  ('Registrar Office', 'registrar.office@buet.ac.bd', 'hashed_pass_reg', 'Admin', '880-1234-5681', true),
  ('Dhaka Metro Police', 'dhakametropolice@dmp.bd', 'hashed_pass_dmp', 'Admin', '880-1234-5682', true),
  ('System Analyst', 'system.analyst@buet.ac.bd', 'hashed_pass_analyst', 'Analyst', '880-1234-5683', true),
  ('Student User 1', 'student1@ugrad.buet.ac.bd', 'hashed_pass_student1', 'User', '880-1234-5684', true),
  ('Student User 2', 'student2@ugrad.buet.ac.bd', 'hashed_pass_student2', 'User', '880-1234-5685', true)
ON CONFLICT (Email) DO NOTHING;

-- ============================================================================
-- INCIDENT TYPES
-- ============================================================================
INSERT INTO INCIDENT_TYPES (Type_name, Default_severity_level, Description) 
VALUES
  ('Theft/Lost Items', (SELECT severity_id FROM severity_level WHERE severity_name='Medium' LIMIT 1), 'Missing or stolen items such as equipment, keys, or personal belongings'),
  ('Harassment', (SELECT severity_id FROM severity_level WHERE severity_name='Medium' LIMIT 1), 'Verbal, physical, or digital harassment incidents'),
  ('Maintenance', (SELECT severity_id FROM severity_level WHERE severity_name='Low' LIMIT 1), 'Infrastructure and maintenance issues including repairs needed'),
  ('Medical', (SELECT severity_id FROM severity_level WHERE severity_name='Critical' LIMIT 1), 'Medical emergencies or health-related incidents');

-- ============================================================================
-- INCIDENTS
-- ============================================================================
INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (1, 3, 5, 1, 1, 'Broken light fixture in ECE Building, lab area on 2nd floor', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (4, 1, 2, 2, 1, 'Lost student ID card in Shahid Abrar Fahad Library', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (7, 4, 25, 4, 2, 'Student collapsed near Medical Center, requires immediate attention', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (8, 2, 22, 2, 1, 'Inappropriate conduct observed in cafeteria area', false);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (1, 3, 28, 3, 2, 'Internet connectivity down at IT Center (ICT Academy)', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (4, 1, 6, 3, 3, 'Missing surveying equipment from EME Building lab', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (8, 2, 12, 2, 2, 'Unwelcome behavior reported at Ahsanullah Hall', false);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (3, 3, 30, 1, 4, 'Water supply restored at Water Treatment Plant', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (7, 4, 21, 3, 1, 'Medical assistance needed near Mosque area during prayer time', true);

INSERT INTO INCIDENTS (Reported_by, Type_id, Location_id, Severity_id, Current_status_id, Description, is_public)
VALUES (1, 3, 7, 2, 2, 'Ceiling leak reported in Civil Engineering Building', true);

-- ============================================================================
-- INCIDENT STATUS HISTORY
-- ============================================================================
INSERT INTO INCIDENT_STATUS_HISTORY (Incident_id, Old_status_id, New_status_id, Changed_by, Change_time)
VALUES
  (1, 1, 2, 2, CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (2, 1, 1, 2, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (3, 1, 2, 2, CURRENT_TIMESTAMP - INTERVAL '4 hours'),
  (5, 1, 2, 5, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
  (6, 1, 3, 2, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
  (8, 1, 4, 2, CURRENT_TIMESTAMP - INTERVAL '3 days');

-- ============================================================================
-- INCIDENT ASSIGNMENTS
-- ============================================================================
INSERT INTO INCIDENT_ASSIGNMENTS (Incident_id, Assigned_to, Is_active)
VALUES
  (1, 2, true),   
  (2, 5, true),   
  (3, 2, true),   
  (5, 2, true),   
  (6, 5, true),   
  (8, 5, false);  

-- ============================================================================
-- INCIDENT COMMENTS
-- ============================================================================
-- Incident 1 Comments (Maintenance)
INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, Comment_time)
VALUES 
  (1, 2, 'We have dispatched a technician to look at this.', false, CURRENT_TIMESTAMP - INTERVAL '1.5 days'),
  (1, 2, 'Waiting for parts to arrive. Expected delivery tomorrow.', true, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Incident 2 Comments (Lost Items)
INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, Comment_time)
VALUES
  (2, 4, 'Thank you for reporting this. We are investigating.', false, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (2, 5, 'Checked security cameras - laptop last seen at 2 PM', true, CURRENT_TIMESTAMP - INTERVAL '18 hours');

-- Incident 3 Comments (Medical Emergency)
INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, Comment_time)
VALUES
  (3, 2, 'Ambulance has been called. ETA 5 minutes.', true, CURRENT_TIMESTAMP - INTERVAL '3.5 hours'),
  (3, 2, 'Patient transported to hospital. Follow-up care arranged.', false, CURRENT_TIMESTAMP - INTERVAL '2 hours');

-- Incident 5 Comments (Network Outage)
INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, Comment_time)
VALUES
  (5, 2, 'IT team investigating root cause', false, CURRENT_TIMESTAMP - INTERVAL '5.5 hours'),
  (5, 2, 'Issue caused by failed switch in server room', true, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
  (5, 2, 'Switch replaced, connectivity restored', false, CURRENT_TIMESTAMP - INTERVAL '4 hours');

-- Incident 8 Comments (Maintenance)
INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, Comment_time)
VALUES
  (8, 5, 'Completed maintenance - all dispensers refilled', false, CURRENT_TIMESTAMP - INTERVAL '2.5 days');

-- ============================================================================
-- INCIDENT PHOTOS
-- ============================================================================
INSERT INTO INCIDENT_PHOTOS (Incident_id, Uploaded_by, File_path, Uploaded_time)
VALUES
  (3, 7, '/uploads/medical_incident_1.jpg', CURRENT_TIMESTAMP - INTERVAL '3.8 hours'),
  (5, 3, '/uploads/network_outage_damage.jpg', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
  (6, 4, '/uploads/missing_projector.jpg', CURRENT_TIMESTAMP - INTERVAL '12 hours');

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
INSERT INTO NOTIFICATIONS (User_id, Incident_id, Message_text, Notification_type, Is_read)
VALUES
  (1, 1, 'Your incident has been reviewed by admin', 'Status Update', true),
  (4, 2, 'Your lost item report has been received', 'Status Update', true),
  (7, 3, 'Medical incident resolved - please contact admin for follow-up', 'Status Update', false),
  (1, 5, 'Admin has assigned your incident', 'Assignment', true),
  (4, 6, 'A new comment has been added to your incident', 'New Comment', false);

-- ============================================================================
-- INCIDENT ANALYTICS - Sequence Independent 
-- ============================================================================
INSERT INTO INCIDENT_ANALYTICS (Type_id, Average_resolving_time, Success_rate)
SELECT type_id, INTERVAL '2 days 3 hours', 95.50 FROM INCIDENT_TYPES WHERE Type_name = 'Maintenance';

INSERT INTO INCIDENT_ANALYTICS (Type_id, Average_resolving_time, Success_rate)
SELECT type_id, INTERVAL '5 days 12 hours', 80.25 FROM INCIDENT_TYPES WHERE Type_name = 'Theft/Lost Items';

INSERT INTO INCIDENT_ANALYTICS (Type_id, Average_resolving_time, Success_rate)
SELECT type_id, INTERVAL '3 days', 85.75 FROM INCIDENT_TYPES WHERE Type_name = 'Harassment';

INSERT INTO INCIDENT_ANALYTICS (Type_id, Average_resolving_time, Success_rate)
SELECT type_id, INTERVAL '4 hours', 100.00 FROM INCIDENT_TYPES WHERE Type_name = 'Medical';

-- ====================================================================
-- FORUM THREADS + POSTS (Fixed with proper type casting)
-- ====================================================================

-- Step 1: Insert threads and capture IDs
WITH inserted_threads AS (
  INSERT INTO FORUM_THREAD (User_id, Title, Created_at)
  VALUES
    (1, 'Best practices for reporting incidents', CURRENT_TIMESTAMP - INTERVAL '10 days'),
    (3, 'How to prevent theft in office spaces', CURRENT_TIMESTAMP - INTERVAL '7 days'),
    (7, 'Medical emergency response procedures', CURRENT_TIMESTAMP - INTERVAL '5 days')
  RETURNING thread_id, title
)

-- Step 2: Insert posts using REAL generated IDs
INSERT INTO FORUM_POSTS (Thread_id, User_id, Post_text, Is_anonymous, Created_at)
SELECT 
  t.thread_id,
  p.user_id,
  p.post_text,
  p.is_anonymous,
  p.created_at
FROM inserted_threads t
JOIN (
  VALUES
    ('Best practices for reporting incidents'::text, 1::int, 'Always include as much detail as possible when reporting'::text, false::boolean, CURRENT_TIMESTAMP - INTERVAL '10 days'),
    ('Best practices for reporting incidents'::text, 2::int, 'Attach photos if possible for better investigation'::text, false::boolean, CURRENT_TIMESTAMP - INTERVAL '9 days'),

    ('How to prevent theft in office spaces'::text, 3::int, 'Keep valuables secured and use lockers when available'::text, false::boolean, CURRENT_TIMESTAMP - INTERVAL '7 days'),
    ('How to prevent theft in office spaces'::text, 4::int, 'Report suspicious activity immediately'::text, false::boolean, CURRENT_TIMESTAMP - INTERVAL '6.5 days'),

    ('Medical emergency response procedures'::text, 7::int, 'Know the location of medical kits and first aid supplies'::text, false::boolean, CURRENT_TIMESTAMP - INTERVAL '5 days'),
    ('Medical emergency response procedures'::text, 2::int, 'Training on CPR and basic first aid is available monthly'::text, false::boolean, CURRENT_TIMESTAMP - INTERVAL '4.5 days')
) AS p(title, user_id, post_text, is_anonymous, created_at)
ON t.title = p.title;

COMMIT;