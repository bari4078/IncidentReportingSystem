
CREATE TABLE SEVERITY_LEVEL (
    Severity_id SERIAL PRIMARY KEY,
    Severity_name VARCHAR(50) NOT NULL CHECK (Severity_name IN ('Low', 'Medium', 'High', 'Critical')),
    Priority_score INT NOT NULL,
    Description TEXT
);

CREATE TABLE INCIDENT_STATUS (
    Status_id SERIAL PRIMARY KEY,
    Status_name VARCHAR(50) NOT NULL CHECK (Status_name IN ('Reported', 'In Review', 'Assigned', 'Resolved', 'Rejected'))
);

CREATE TABLE Locations (
    Location_id SERIAL PRIMARY KEY,
    Location_name VARCHAR(100) NOT NULL,
    Building VARCHAR(100),
    Floor VARCHAR(20),
    Room VARCHAR(50)
);

CREATE TABLE USERS (
    User_id SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Phone VARCHAR(20),
    Email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    Role VARCHAR(20) NOT NULL CHECK (Role IN ('User', 'Admin', 'Analyst')),
    Created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);


CREATE TABLE INCIDENT_TYPES (
    Type_id SERIAL PRIMARY KEY,
    Type_name VARCHAR(100) NOT NULL, -- Theft, Harassment, etc.
    Default_severity_level INT REFERENCES SEVERITY_LEVEL(Severity_id),
    Description TEXT
);


CREATE TABLE INCIDENTS (
    Incident_id SERIAL PRIMARY KEY,
    Reported_by INT REFERENCES USERS(User_id) ON DELETE CASCADE,
    Type_id INT REFERENCES INCIDENT_TYPES(Type_id),
    Location_id INT REFERENCES Locations(Location_id),
    is_public BOOLEAN DEFAULT FALSE,
    Severity_id INT REFERENCES SEVERITY_LEVEL(Severity_id),
    Current_status_id INT REFERENCES INCIDENT_STATUS(Status_id),
    Description TEXT NOT NULL,
    Reported_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Last_updated_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE INCIDENT_STATUS_HISTORY (
    History_id SERIAL PRIMARY KEY,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE CASCADE,
    Old_status_id INT REFERENCES INCIDENT_STATUS(Status_id),
    New_status_id INT REFERENCES INCIDENT_STATUS(Status_id),
    Changed_by INT REFERENCES USERS(User_id),
    Change_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE INCIDENT_ASSIGNMENTS (
    Assignment_id SERIAL PRIMARY KEY,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE CASCADE,
    Assigned_to INT REFERENCES USERS(User_id),
    Assigned_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE INCIDENT_COMMENTS (
    Comment_id SERIAL PRIMARY KEY,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE CASCADE,
    User_id INT REFERENCES USERS(User_id),
    Comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    Comment_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE INCIDENT_PHOTOS (
    Photo_id SERIAL PRIMARY KEY,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE CASCADE,
    Uploaded_by INT REFERENCES USERS(User_id),
    Uploaded_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    File_path TEXT NOT NULL
);

CREATE TABLE INCIDENT_VIDEO (
    Video_id SERIAL PRIMARY KEY,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE CASCADE,
    Uploaded_by INT REFERENCES USERS(User_id),
    Uploaded_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    File_path TEXT NOT NULL
);

CREATE TABLE INCIDENT_AUDIO (
    Audio_id SERIAL PRIMARY KEY,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE CASCADE,
    Uploaded_by INT REFERENCES USERS(User_id),
    Uploaded_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    File_path TEXT NOT NULL
);


CREATE TABLE NOTIFICATIONS (
    Notification_id SERIAL PRIMARY KEY,
    User_id INT REFERENCES USERS(User_id) ON DELETE CASCADE,
    Incident_id INT REFERENCES INCIDENTS(Incident_id) ON DELETE SET NULL,
    Message_text TEXT NOT NULL,
    Notification_type VARCHAR(50) CHECK (Notification_type IN ('Status Update', 'New Comment', 'Assignment')),
    Created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    Is_read BOOLEAN DEFAULT FALSE
);


CREATE TABLE FORUM_THREAD (
    Thread_id SERIAL PRIMARY KEY,
    User_id INT REFERENCES USERS(User_id),
    Title VARCHAR(255) NOT NULL,
    Created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE FORUM_POSTS (
    Post_id SERIAL PRIMARY KEY,
    Thread_id INT REFERENCES FORUM_THREAD(Thread_id) ON DELETE CASCADE,
    User_id INT REFERENCES USERS(User_id),
    Post_text TEXT NOT NULL,
    Is_anonymous BOOLEAN DEFAULT FALSE,
    Created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE INCIDENT_ANALYTICS (
    Analytics_id SERIAL PRIMARY KEY,
    Type_id INT UNIQUE REFERENCES INCIDENT_TYPES(Type_id),
    Average_resolving_time INTERVAL,
    Success_rate DECIMAL(5,2),
    Last_computed_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

