-- Migration: 20260205130000_add_lifestyle_social_tables.sql
-- Description: Adds tables for Lifestyle & Social features (personal_interests, social_activities, social_connections)

-- 1. ENUMS (if they don't exist)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_activity_type') THEN
    CREATE TYPE social_activity_type AS ENUM (
      'group_activity', 'one_on_one', 'family_visit', 'outing', 'entertainment',
      'exercise', 'crafts', 'music', 'reading', 'games', 'therapy', 'religious', 'other'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_level') THEN
    CREATE TYPE engagement_level AS ENUM (
      'very_engaged', 'engaged', 'somewhat_engaged', 'minimal', 'disengaged'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mood_level') THEN
    CREATE TYPE mood_level AS ENUM (
      'excellent', 'good', 'neutral', 'poor', 'very_poor'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_interaction_type') THEN
    CREATE TYPE social_interaction_type AS ENUM (
      'active', 'responsive', 'minimal', 'withdrawn'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enjoyment_level') THEN
    CREATE TYPE enjoyment_level AS ENUM (
      'loved_it', 'enjoyed', 'neutral', 'disliked', 'refused'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'social_connection_type') THEN
    CREATE TYPE social_connection_type AS ENUM (
      'family', 'friend', 'staff', 'other'
    );
  END IF;
END $$;

-- 2. TABLES

-- Personal Interests
CREATE TABLE IF NOT EXISTS public.personal_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  main_interests TEXT[] DEFAULT '{}',
  hobbies TEXT[] DEFAULT '{}',
  social_preferences TEXT[] DEFAULT '{}',
  favorite_activities TEXT[] DEFAULT '{}',
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Social Activities
CREATE TABLE IF NOT EXISTS public.social_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_time TEXT NOT NULL,
  activity_type social_activity_type NOT NULL,
  activity_name TEXT NOT NULL,
  participants TEXT,
  location TEXT,
  duration TEXT,
  engagement_level engagement_level,
  mood_before mood_level,
  mood_after mood_level,
  social_interaction social_interaction_type,
  enjoyment enjoyment_level,
  recorded_by TEXT NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social Connections
CREATE TABLE IF NOT EXISTS public.social_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  type social_connection_type NOT NULL,
  contact_frequency TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_personal_interests_resident ON public.personal_interests(resident_id);
CREATE INDEX IF NOT EXISTS idx_social_activities_resident_date ON public.social_activities(resident_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_social_connections_resident ON public.social_connections(resident_id);

-- 4. RLS POLICIES
ALTER TABLE public.personal_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

-- Personal Interests Policies
CREATE POLICY "Users can read personal interests in their org"
  ON public.personal_interests FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can insert personal interests in their org"
  ON public.personal_interests FOR INSERT
  WITH CHECK ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can update personal interests in their org"
  ON public.personal_interests FOR UPDATE
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );

-- Social Activities Policies
CREATE POLICY "Users can read social activities in their org"
  ON public.social_activities FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can insert social activities in their org"
  ON public.social_activities FOR INSERT
  WITH CHECK ( public.can_access_organization(organization_id) );

-- Social Connections Policies
CREATE POLICY "Users can read social connections in their org"
  ON public.social_connections FOR SELECT
  USING ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can insert social connections in their org"
  ON public.social_connections FOR INSERT
  WITH CHECK ( public.can_access_organization(organization_id) );

CREATE POLICY "Users can update social connections in their org"
  ON public.social_connections FOR UPDATE
  USING ( public.can_access_organization(organization_id) )
  WITH CHECK ( public.can_access_organization(organization_id) );

-- 5. TRIGGERS for updated_at
CREATE TRIGGER set_updated_at_personal_interests BEFORE UPDATE ON public.personal_interests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER set_updated_at_social_connections BEFORE UPDATE ON public.social_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
