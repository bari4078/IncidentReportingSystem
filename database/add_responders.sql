-- Migration: Add Responder Role and Specialist Users

BEGIN;

-- 1. Update the Role check constraint in USERS table
-- First, find the name of the constraint (it's likely users_role_check but can vary)
DO $$ 
DECLARE 
    constraint_name TEXT;
BEGIN 
    SELECT conname INTO constraint_name
    FROM pg_constraint 
    WHERE conrelid = 'users'::regclass AND contype = 'c' AND conname LIKE '%role%';
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE USERS DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE USERS ADD CONSTRAINT users_role_check CHECK (Role IN ('User', 'Admin', 'Analyst', 'Responder'));

-- 2. Update existing Dhaka Metro Police to Responder
UPDATE USERS SET Role = 'Responder' WHERE Name = 'Dhaka Metro Police';

-- 3. Add new specialist Responder users
INSERT INTO USERS (Name, Email, password_hash, Role, Phone, is_active) 
VALUES
  ('Water Technician', 'water.tech@buet.ac.bd', 'password@123', 'Responder', '880-1234-5101', true),
  ('Electrician', 'electrician@buet.ac.bd', 'password@123', 'Responder', '880-1234-5102', true),
  ('Fire Service', 'fireservice@buet.ac.bd', 'password@123', 'Responder', '880-1234-5103', true),
  ('Medical Responder', 'medical.responder@buet.ac.bd', 'password@123', 'Responder', '880-1234-5104', true),
  ('Campus Security', 'security@buet.ac.bd', 'password@123', 'Responder', '880-1234-5105', true),
  ('IT Support', 'itsupport@buet.ac.bd', 'password@123', 'Responder', '880-1234-5106', true),
  ('Maintenance Team', 'maintenance.team@buet.ac.bd', 'password@123', 'Responder', '880-1234-5107', true)
ON CONFLICT (Email) DO UPDATE 
SET Name = EXCLUDED.Name, Role = EXCLUDED.Role, Phone = EXCLUDED.Phone;

COMMIT;
