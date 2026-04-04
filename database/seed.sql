BEGIN;


TRUNCATE TABLE 
  INCIDENT_AUDIO, INCIDENT_VIDEO, INCIDENT_PHOTOS, INCIDENT_COMMENTS,
  INCIDENT_ASSIGNMENTS, INCIDENT_STATUS_HISTORY, INCIDENTS,
  INCIDENT_TYPES, FORUM_POSTS, FORUM_THREAD, NOTIFICATIONS,
  INCIDENT_ANALYTICS, USERS, Locations, INCIDENT_STATUS, SEVERITY_LEVEL
RESTART IDENTITY CASCADE;

INSERT INTO SEVERITY_LEVEL (Severity_name, Priority_score, Description) 
VALUES 
  ('Low', 1, 'Minor issues with no immediate impact'),
  ('Medium', 2, 'Moderate issues affecting operations'),
  ('High', 3, 'Serious issues requiring urgent attention'),
  ('Critical', 4, 'Emergency situations requiring immediate action');

INSERT INTO INCIDENT_STATUS (Status_name) 
VALUES 
  ('Reported'),
  ('In Review'),
  ('Assigned'),
  ('Resolved'),
  ('Rejected');

INSERT INTO Locations (Location_name, Latitude, Longitude, Building, Category) 
VALUES
  ('Main Gate', 23.7310, 90.3880, 'Main Entrance', 'Gate'),
  ('Shahid Abrar Fahad Library (Central Library)', 23.7268, 90.3912, 'Library Building', 'Academic'),
  ('Registrar Building', 23.7255, 90.3895, 'Administration', 'Administrative'),
  ('Rector''s Office', 23.7253, 90.3890, 'Admin Block', 'Administrative'),
  ('ECE Building (Electrical & Computer Engineering)', 23.7275, 90.3935, 'ECE Block', 'Academic'),
  ('EME Building (Mechanical Engineering)', 23.7290, 90.3950, 'ME Block', 'Academic'),
  ('Civil Engineering Building', 23.7268, 90.3945, 'CE Block', 'Academic'),
  ('Chemistry Department', 23.7285, 90.3920, 'Science Block', 'Academic'),
  ('Physics Department', 23.7288, 90.3915, 'Science Block', 'Academic'),
  ('Architecture Building', 23.7305, 90.3960, 'Arch Block', 'Academic'),
  ('Chemical Engineering Building', 23.7275, 90.3925, 'ChE Block', 'Academic'),
  ('Ahsanullah Hall', 23.7305, 90.3975, 'Boys Dormitory', 'Hostel'),
  ('Titumir Hall', 23.7295, 90.3860, 'Boys Dormitory', 'Hostel'),
  ('Suhrawardy Hall', 23.7280, 90.3905, 'Boys Dormitory', 'Hostel'),
  ('Sher-e-Bangla Hall', 23.7275, 90.3880, 'Boys Dormitory', 'Hostel'),
  ('Dr. M.A. Rashid Hall', 23.7265, 90.3920, 'Boys Dormitory', 'Hostel'),
  ('Sabekun Nahar Sony Hall', 23.7310, 90.3895, 'Girls Dormitory', 'Hostel'),
  ('Shahid Smrity Hall', 23.7320, 90.3925, 'Boys Dormitory', 'Hostel'),
  ('Swadhinata Hall', 23.7315, 90.3890, 'Boys Dormitory', 'Hostel'),
  ('Kazi Nazrul Islam Hall', 23.7300, 90.3945, 'Boys Dormitory', 'Hostel'),
  ('BUET Masjid (Main Mosque)', 23.7240, 90.3915, 'Mosque', 'Religious'),
  ('Central Cafeteria', 23.7245, 90.3895, 'Food Court', 'Facility'),
  ('BUET Stadium & Playground', 23.7220, 90.3850, 'Sports Complex', 'Sports'),
  ('Gymnasium', 23.7215, 90.3905, 'Sports Facility', 'Sports'),
  ('Medical Center', 23.7250, 90.3950, 'Healthcare', 'Medical'),
  ('Bus Terminus', 23.7330, 90.3895, 'Transport', 'Transport'),
  ('Machine Shop & Manufacturing Lab', 23.7260, 90.3955, 'Workshop', 'Lab'),
  ('IT Center (ICT Academy)', 23.7270, 90.3875, 'Tech Hub', 'Academic'),
  ('Student Center', 23.7235, 90.3920, 'Community Space', 'Facility'),
  ('Water Treatment Plant', 23.7210, 90.3870, 'Infrastructure', 'Utility'),
  ('Shaheed Minar (Monument)', 23.7325, 90.3880, 'Memorial', 'Monument');

INSERT INTO USERS (Name, Email, password_hash, Role, Phone, is_active) 
VALUES
  ('Authority Office', 'authority@buet.ac.bd', 'hashed_pass_auth', 'Admin', '880-1234-5678', true),
  ('Dean of Studies Wing', 'dsw@buet.ac.bd', 'hashed_pass_dsw', 'Admin', '880-1234-5679', true),
  ('Vice Chancellor', 'vc@buet.ac.bd', 'hashed_pass_vc', 'Admin', '880-1234-5680', true),
  ('Registrar Office', 'registrar.office@buet.ac.bd', 'hashed_pass_reg', 'Admin', '880-1234-5681', true),
  ('Dhaka Metro Police', 'dhakametropolice@dmp.bd', 'hashed_pass_dmp', 'Responder', '880-1234-5682', true),
  ('Water Technician', 'water.tech@buet.ac.bd', 'password@123', 'Responder', '880-1234-5101', true),
  ('Electrician', 'electrician@buet.ac.bd', 'password@123', 'Responder', '880-1234-5102', true),
  ('Fire Service', 'fireservice@buet.ac.bd', 'password@123', 'Responder', '880-1234-5103', true),
  ('Medical Responder', 'medical.responder@buet.ac.bd', 'password@123', 'Responder', '880-1234-5104', true),
  ('Campus Security', 'security@buet.ac.bd', 'password@123', 'Responder', '880-1234-5105', true),
  ('IT Support', 'itsupport@buet.ac.bd', 'password@123', 'Responder', '880-1234-5106', true),
  ('Maintenance Team', 'maintenance.team@buet.ac.bd', 'password@123', 'Responder', '880-1234-5107', true),
  ('System Analyst', 'system.analyst@buet.ac.bd', 'hashed_pass_analyst', 'Analyst', '880-1234-5683', true),
  ('Student User 1', 'student1@ugrad.buet.ac.bd', 'hashed_pass_student1', 'User', '880-1234-5684', true),
  ('Student User 2', 'student2@ugrad.buet.ac.bd', 'hashed_pass_student2', 'User', '880-1234-5685', true)
ON CONFLICT (Email) DO NOTHING;

INSERT INTO INCIDENT_TYPES (Type_name, Default_severity_level, Description) 
VALUES
  ('Theft/Lost Items', (SELECT severity_id FROM severity_level WHERE severity_name='Medium' LIMIT 1), 'Missing or stolen items such as equipment, keys, or personal belongings'),
  ('Harassment', (SELECT severity_id FROM severity_level WHERE severity_name='Medium' LIMIT 1), 'Verbal, physical, or digital harassment incidents'),
  ('Maintenance', (SELECT severity_id FROM severity_level WHERE severity_name='Low' LIMIT 1), 'Infrastructure and maintenance issues including repairs needed'),
  ('Medical', (SELECT severity_id FROM severity_level WHERE severity_name='Critical' LIMIT 1), 'Medical emergencies or health-related incidents');

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

INSERT INTO INCIDENT_STATUS_HISTORY (Incident_id, Old_status_id, New_status_id, Changed_by, Change_time)
VALUES
  (1, 1, 2, 2, CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (2, 1, 1, 2, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (3, 1, 2, 2, CURRENT_TIMESTAMP - INTERVAL '4 hours'),
  (5, 1, 2, 5, CURRENT_TIMESTAMP - INTERVAL '6 hours'),
  (6, 1, 3, 2, CURRENT_TIMESTAMP - INTERVAL '12 hours'),
  (8, 1, 4, 2, CURRENT_TIMESTAMP - INTERVAL '3 days');

INSERT INTO INCIDENT_ASSIGNMENTS (Incident_id, Assigned_to, Is_active)
VALUES
  (1, 2, true),   
  (2, 5, true),   
  (3, 2, true),   
  (5, 2, true),   
  (6, 5, true),   
  (8, 5, false);  


INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, is_admin_comment, Comment_time)
VALUES 
  (1, 2, 'We have dispatched a technician to look at this.', false, true, CURRENT_TIMESTAMP - INTERVAL '1.5 days'),
  (1, 2, 'Waiting for parts to arrive. Expected delivery tomorrow.', true, true, CURRENT_TIMESTAMP - INTERVAL '1 day');


INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, is_admin_comment, Comment_time)
VALUES
  (2, 4, 'Thank you for reporting this. We are investigating.', false, true, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  (2, 5, 'Checked security cameras - laptop last seen at 2 PM', true, true, CURRENT_TIMESTAMP - INTERVAL '18 hours');


INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, is_admin_comment, Comment_time)
VALUES
  (3, 2, 'Ambulance has been called. ETA 5 minutes.', true, true, CURRENT_TIMESTAMP - INTERVAL '3.5 hours'),
  (3, 2, 'Patient transported to hospital. Follow-up care arranged.', false, true, CURRENT_TIMESTAMP - INTERVAL '2 hours');


INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, is_admin_comment, Comment_time)
VALUES
  (5, 2, 'IT team investigating root cause', false, true, CURRENT_TIMESTAMP - INTERVAL '5.5 hours'),
  (5, 2, 'Issue caused by failed switch in server room', true, true, CURRENT_TIMESTAMP - INTERVAL '5 hours'),
  (5, 2, 'Switch replaced, connectivity restored', false, true, CURRENT_TIMESTAMP - INTERVAL '4 hours');


INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal, is_admin_comment, Comment_time)
VALUES
  (8, 5, 'Completed maintenance - all dispensers refilled', false, true, CURRENT_TIMESTAMP - INTERVAL '2.5 days');

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