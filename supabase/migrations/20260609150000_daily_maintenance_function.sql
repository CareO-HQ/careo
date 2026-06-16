-- Migration: Create daily database maintenance function
-- Migration: 20260609150000_daily_maintenance_function.sql

-- Create stored procedure for daily cleanup and updates
CREATE OR REPLACE FUNCTION public.perform_daily_maintenance()
RETURNS void AS $$
BEGIN
    -- -------------------------------------------------------------
    -- A. AUTOMATIC OVERDUE ACTION PLAN STATUS UPDATES & NOTIFICATIONS
    -- -------------------------------------------------------------

    -- 1. audit_resident_action_plans
    WITH updated AS (
        UPDATE public.audit_resident_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, team_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, team_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        CASE WHEN u.team_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.team_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'resident')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 2. audit_care_file_action_plans
    WITH updated AS (
        UPDATE public.audit_care_file_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, team_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, team_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        CASE WHEN u.team_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.team_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'carefile')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 3. audit_governance_action_plans
    WITH updated AS (
        UPDATE public.audit_governance_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'governance')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 4. audit_clinical_action_plans
    WITH updated AS (
        UPDATE public.audit_clinical_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'clinical')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 5. audit_environment_action_plans
    WITH updated AS (
        UPDATE public.audit_environment_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'environment')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 6. audit_manager_action_plans
    WITH updated AS (
        UPDATE public.audit_manager_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'manager')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 7. care_home_common_action_plans
    WITH updated AS (
        UPDATE public.care_home_common_action_plans
        SET status = 'overdue',
            updated_at = NOW()
        WHERE due_date < NOW()
          AND status IN ('pending', 'in_progress')
        RETURNING id, organization_id, care_home_id, description, assigned_to
    )
    INSERT INTO public.notifications (organization_id, care_home_id, user_id, title, message, type, link, metadata)
    SELECT 
        CASE WHEN u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.organization_id::UUID ELSE NULL END,
        CASE WHEN u.care_home_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN u.care_home_id::UUID ELSE NULL END,
        u.assigned_to::UUID,
        'Action Plan Overdue',
        'Your action plan is now overdue: "' || u.description || '"',
        'action_plan_overdue',
        '/dashboard/action-plans',
        jsonb_build_object('actionPlanId', u.id, 'auditCategory', 'common')
    FROM updated u
    WHERE u.assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      AND u.organization_id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- -------------------------------------------------------------
    -- B. CLEAN UP READ NOTIFICATIONS OLDER THAN 90 DAYS
    -- -------------------------------------------------------------
    DELETE FROM public.notifications n
    WHERE n.created_at < NOW() - INTERVAL '90 days'
      AND EXISTS (
          SELECT 1 FROM public.notification_read_status r
          WHERE r.notification_id = n.id
      );

    -- -------------------------------------------------------------
    -- C. CLEAN UP COMPLETED ACTION PLANS OLDER THAN 90 DAYS
    -- -------------------------------------------------------------
    DELETE FROM public.audit_resident_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.audit_care_file_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.audit_governance_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.audit_clinical_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.audit_environment_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.audit_manager_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
    DELETE FROM public.care_home_common_action_plans WHERE status = 'completed' AND updated_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
