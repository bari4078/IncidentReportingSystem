
-- 1. Trigger to update last_updated_time in INCIDENTS
CREATE OR REPLACE FUNCTION update_last_updated_time()
RETURNS TRIGGER AS $$
BEGIN
    NEW.Last_updated_time = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_last_updated_time ON INCIDENTS;
CREATE TRIGGER trg_update_last_updated_time
BEFORE UPDATE ON INCIDENTS
FOR EACH ROW
EXECUTE FUNCTION update_last_updated_time();


-- 2. Trigger to log status changes in INCIDENTS to INCIDENT_STATUS_HISTORY
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.Current_status_id IS DISTINCT FROM NEW.Current_status_id) THEN
        INSERT INTO INCIDENT_STATUS_HISTORY (Incident_id, Old_status_id, New_status_id, Changed_by)
        VALUES (NEW.Incident_id, OLD.Current_status_id, NEW.Current_status_id, NULL); -- Changed_by can be improved if passed in via session
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_status_change ON INCIDENTS;
CREATE TRIGGER trg_log_status_change
AFTER UPDATE OF Current_status_id ON INCIDENTS
FOR EACH ROW
EXECUTE FUNCTION log_status_change();


-- 3. Trigger to ensure only one active assignment per incident
CREATE OR REPLACE FUNCTION ensure_single_active_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Deactivate all previous assignments for this incident
    UPDATE INCIDENT_ASSIGNMENTS
    SET Is_active = FALSE
    WHERE Incident_id = NEW.Incident_id AND Assignment_id <> NEW.Assignment_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_single_active_assignment ON INCIDENT_ASSIGNMENTS;
CREATE TRIGGER trg_ensure_single_active_assignment
BEFORE INSERT ON INCIDENT_ASSIGNMENTS
FOR EACH ROW
EXECUTE FUNCTION ensure_single_active_assignment();


-- 4. Trigger to notify on status change
CREATE OR REPLACE FUNCTION notify_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_reported_by INT;
    v_status_name VARCHAR(50);
BEGIN
    -- Get the reporter's user ID
    SELECT Reported_by INTO v_reported_by FROM INCIDENTS WHERE Incident_id = NEW.Incident_id;
    
    -- Get the new status name
    SELECT Status_name INTO v_status_name FROM INCIDENT_STATUS WHERE Status_id = NEW.New_status_id;
    
    INSERT INTO NOTIFICATIONS (User_id, Incident_id, Message_text, Notification_type)
    VALUES (v_reported_by, NEW.Incident_id, 'Your incident status has been updated to ' || v_status_name, 'Status Update');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_status_change ON INCIDENT_STATUS_HISTORY;
CREATE TRIGGER trg_notify_status_change
AFTER INSERT ON INCIDENT_STATUS_HISTORY
FOR EACH ROW
EXECUTE FUNCTION notify_status_change();


-- 5. Trigger to notify on new comment (from admin/responder)
CREATE OR REPLACE FUNCTION notify_new_comment()
RETURNS TRIGGER AS $$
DECLARE
    v_reported_by INT;
    v_commenter_role VARCHAR(20);
BEGIN
    -- Get the reporter
    SELECT Reported_by INTO v_reported_by FROM INCIDENTS WHERE Incident_id = NEW.Incident_id;
    
    -- Get the role of the person who commented
    SELECT Role INTO v_commenter_role FROM USERS WHERE User_id = NEW.User_id;
    
    -- Notify the reporter if an Admin/Responder/Analyst leaves a comment
    IF v_commenter_role IN ('Admin', 'Responder', 'Analyst') AND v_reported_by <> NEW.User_id THEN
        INSERT INTO NOTIFICATIONS (User_id, Incident_id, Message_text, Notification_type)
        VALUES (v_reported_by, NEW.Incident_id, 'A staff member commented on your incident.', 'New Comment');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_new_comment ON INCIDENT_COMMENTS;
CREATE TRIGGER trg_notify_new_comment
AFTER INSERT ON INCIDENT_COMMENTS
FOR EACH ROW
EXECUTE FUNCTION notify_new_comment();


-- 6. Procedure to assign a responder
CREATE OR REPLACE PROCEDURE assign_responder(
    p_incident_id INT,
    p_responder_id INT,
    p_assigned_by INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_assigned_status_id INT;
BEGIN
    -- Get the "Assigned" status ID
    SELECT Status_id INTO v_assigned_status_id FROM INCIDENT_STATUS WHERE Status_name = 'Assigned';
    
    -- Insert the assignment (The trigger trg_ensure_single_active_assignment will handle deactivating old ones)
    INSERT INTO INCIDENT_ASSIGNMENTS (Incident_id, Assigned_to)
    VALUES (p_incident_id, p_responder_id);
    
    -- Update the incident status
    -- The trigger trg_log_status_change will handle history, but we'll use procedure to capture Changed_by correctly
    UPDATE INCIDENTS
    SET Current_status_id = v_assigned_status_id
    WHERE Incident_id = p_incident_id;
    
    -- Update the history record created by the trigger to include the responder_id as the one who changed it
    -- (Or we could avoid the trigger and do it manually in procedures for better control over Changed_by)
    UPDATE INCIDENT_STATUS_HISTORY 
    SET Changed_by = p_assigned_by 
    WHERE History_id = (
        SELECT History_id 
        FROM INCIDENT_STATUS_HISTORY 
        WHERE Incident_id = p_incident_id 
        ORDER BY Change_time DESC 
        LIMIT 1
    );
END;
$$;


-- 6b. Procedure to update status generally
CREATE OR REPLACE PROCEDURE update_incident_status(
    p_incident_id INT,
    p_new_status_id INT,
    p_changed_by INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE INCIDENTS
    SET Current_status_id = p_new_status_id
    WHERE Incident_id = p_incident_id;

    -- Update the history record created by the trigger
    UPDATE INCIDENT_STATUS_HISTORY 
    SET Changed_by = p_changed_by 
    WHERE History_id = (
        SELECT History_id 
        FROM INCIDENT_STATUS_HISTORY 
        WHERE Incident_id = p_incident_id AND New_status_id = p_new_status_id
        ORDER BY Change_time DESC 
        LIMIT 1
    );
END;
$$;




-- 7. Procedure to resolve an incident
CREATE OR REPLACE PROCEDURE resolve_incident(
    p_incident_id INT,
    p_resolver_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_resolved_status_id INT;
BEGIN
    SELECT Status_id INTO v_resolved_status_id FROM INCIDENT_STATUS WHERE Status_name = 'Resolved';
    
    -- Update status
    UPDATE INCIDENTS
    SET Current_status_id = v_resolved_status_id
    WHERE Incident_id = p_incident_id;
    
    -- Deactivate any assignments
    UPDATE INCIDENT_ASSIGNMENTS
    SET Is_active = FALSE
    WHERE Incident_id = p_incident_id;
    
    -- Add an internal comment
    INSERT INTO INCIDENT_COMMENTS (Incident_id, User_id, Comment_text, is_internal)
    VALUES (p_incident_id, p_resolver_id, 'Incident marked as resolved via resolution procedure.', TRUE);
END;
$$;


-- 8. Function to get incident metrics (replaces static polling)
CREATE OR REPLACE FUNCTION get_overall_stats()
RETURNS TABLE (
    total_incidents BIGINT,
    reported_count BIGINT,
    assigned_count BIGINT,
    resolved_count BIGINT,
    rejected_count BIGINT,
    avg_resolution_time_hours DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE s.Status_name = 'Reported'),
        COUNT(*) FILTER (WHERE s.Status_name = 'Assigned'),
        COUNT(*) FILTER (WHERE s.Status_name = 'Resolved'),
        COUNT(*) FILTER (WHERE s.Status_name = 'Rejected'),
        EXTRACT(EPOCH FROM AVG(i.Last_updated_time - i.Reported_time) FILTER (WHERE s.Status_name = 'Resolved')) / 3600
    FROM INCIDENTS i
    JOIN INCIDENT_STATUS s ON i.Current_status_id = s.Status_id;
END;
$$ LANGUAGE plpgsql;

