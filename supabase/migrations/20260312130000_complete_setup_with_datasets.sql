-- Complete Setup Migration with Dataset Support
-- This migration creates all necessary tables, functions, and dataset infrastructure

-- ============================================
-- 1. CORE ROLE SYSTEM
-- ============================================

-- Create app_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END
$$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================
-- 2. PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. NEWS CHECKS / ANALYSIS HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS public.news_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_type text NOT NULL CHECK (input_type IN ('text', 'url')),
  input_text text,
  source_url text,
  predicted_label text NOT NULL CHECK (predicted_label IN ('real', 'fake', 'misleading')),
  confidence numeric(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  explanation text,
  model_name text NOT NULL DEFAULT 'hybrid-v1',
  baseline_predicted_label text,
  baseline_confidence numeric,
  baseline_explanation text,
  verified_label text,
  verified_at timestamptz,
  analysis_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT news_checks_input_required CHECK (
    (input_type = 'text' AND input_text IS NOT NULL AND length(trim(input_text)) > 0)
    OR
    (input_type = 'url' AND source_url IS NOT NULL AND length(trim(source_url)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_news_checks_user_created_at ON public.news_checks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_checks_verified_label ON public.news_checks (verified_label);

ALTER TABLE public.news_checks ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. DATASET TABLES (NEW)
-- ============================================

-- Dataset items table for storing normalized benchmark data
CREATE TABLE IF NOT EXISTS public.dataset_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_name text NOT NULL,
  original_id text,
  text text NOT NULL,
  source text NOT NULL DEFAULT 'unknown',
  label text NOT NULL CHECK (label IN ('real', 'fake', 'misleading')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_dataset_items_dataset_name ON public.dataset_items (dataset_name);
CREATE INDEX IF NOT EXISTS idx_dataset_items_label ON public.dataset_items (label);
CREATE INDEX IF NOT EXISTS idx_dataset_items_source ON public.dataset_items (source);
CREATE INDEX IF NOT EXISTS idx_dataset_items_dataset_label ON public.dataset_items (dataset_name, label);

-- Full-text search index for text content
CREATE INDEX IF NOT EXISTS idx_dataset_items_text_search ON public.dataset_items USING gin (to_tsvector('english', text));

ALTER TABLE public.dataset_items ENABLE ROW LEVEL SECURITY;

-- Dataset experiments table for tracking model training/evaluation
CREATE TABLE IF NOT EXISTS public.dataset_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  dataset_names text[] NOT NULL,
  train_split_percent integer NOT NULL DEFAULT 80 CHECK (train_split_percent BETWEEN 10 AND 90),
  val_split_percent integer NOT NULL DEFAULT 10 CHECK (val_split_percent BETWEEN 5 AND 50),
  test_split_percent integer GENERATED ALWAYS AS (100 - train_split_percent - val_split_percent) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  results jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_split CHECK (train_split_percent + val_split_percent < 100)
);

CREATE INDEX IF NOT EXISTS idx_dataset_experiments_user_id ON public.dataset_experiments (user_id);
CREATE INDEX IF NOT EXISTS idx_dataset_experiments_status ON public.dataset_experiments (status);

ALTER TABLE public.dataset_experiments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. VIEWS
-- ============================================

-- News checks dashboard view
CREATE OR REPLACE VIEW public.news_checks_dashboard
WITH (security_invoker = true)
AS
SELECT
  nc.id,
  nc.user_id,
  nc.input_type,
  nc.predicted_label,
  nc.confidence,
  nc.model_name,
  nc.created_at
FROM public.news_checks nc;

-- Dataset statistics view
CREATE OR REPLACE VIEW public.dataset_statistics
WITH (security_invoker = true)
AS
SELECT
  dataset_name,
  label,
  COUNT(*) as count,
  AVG(LENGTH(text)) as avg_text_length,
  MIN(LENGTH(text)) as min_text_length,
  MAX(LENGTH(text)) as max_text_length
FROM public.dataset_items
GROUP BY dataset_name, label;

-- Dataset summary view
CREATE OR REPLACE VIEW public.dataset_summary
WITH (security_invoker = true)
AS
SELECT
  dataset_name,
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE label = 'real') as real_count,
  COUNT(*) FILTER (WHERE label = 'fake') as fake_count,
  COUNT(*) FILTER (WHERE label = 'misleading') as misleading_count,
  COUNT(DISTINCT source) as unique_sources
FROM public.dataset_items
GROUP BY dataset_name;

-- ============================================
-- 6. FUNCTIONS
-- ============================================

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Validation trigger for news check labels
CREATE OR REPLACE FUNCTION public.validate_news_check_labels()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.predicted_label IS NOT NULL AND NEW.predicted_label NOT IN ('real', 'fake', 'misleading') THEN
    RAISE EXCEPTION 'predicted_label must be one of: real, fake, misleading';
  END IF;

  IF NEW.baseline_predicted_label IS NOT NULL AND NEW.baseline_predicted_label NOT IN ('real', 'fake', 'misleading') THEN
    RAISE EXCEPTION 'baseline_predicted_label must be one of: real, fake, misleading';
  END IF;

  IF NEW.verified_label IS NOT NULL AND NEW.verified_label NOT IN ('real', 'fake', 'misleading') THEN
    RAISE EXCEPTION 'verified_label must be one of: real, fake, misleading';
  END IF;

  IF NEW.verified_label IS DISTINCT FROM OLD.verified_label THEN
    NEW.verified_at = CASE WHEN NEW.verified_label IS NULL THEN NULL ELSE now() END;
  END IF;

  RETURN NEW;
END;
$$;

-- Function to get random sample from dataset
CREATE OR REPLACE FUNCTION public.get_dataset_sample(
  p_dataset_name text,
  p_limit integer DEFAULT 100,
  p_label text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  dataset_name text,
  original_id text,
  text text,
  source text,
  label text,
  metadata jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    di.id,
    di.dataset_name,
    di.original_id,
    di.text,
    di.source,
    di.label,
    di.metadata
  FROM public.dataset_items di
  WHERE di.dataset_name = p_dataset_name
    AND (p_label IS NULL OR di.label = p_label)
  ORDER BY random()
  LIMIT p_limit;
$$;

-- Function to search dataset items
CREATE OR REPLACE FUNCTION public.search_dataset_items(
  p_query text,
  p_dataset_name text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  dataset_name text,
  text text,
  source text,
  label text,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    di.id,
    di.dataset_name,
    di.text,
    di.source,
    di.label,
    ts_rank(to_tsvector('english', di.text), plainto_tsquery('english', p_query)) as rank
  FROM public.dataset_items di
  WHERE to_tsvector('english', di.text) @@ plainto_tsquery('english', p_query)
    AND (p_dataset_name IS NULL OR di.dataset_name = p_dataset_name)
  ORDER BY rank DESC
  LIMIT p_limit;
$$;

-- ============================================
-- 7. TRIGGERS
-- ============================================

-- User signup trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_profile();

-- Update timestamps
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_news_checks_updated_at ON public.news_checks;
CREATE TRIGGER update_news_checks_updated_at
BEFORE UPDATE ON public.news_checks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS validate_news_check_labels_trg ON public.news_checks;
CREATE TRIGGER validate_news_check_labels_trg
BEFORE UPDATE OR INSERT ON public.news_checks
FOR EACH ROW
EXECUTE FUNCTION public.validate_news_check_labels();

DROP TRIGGER IF EXISTS update_dataset_items_updated_at ON public.dataset_items;
CREATE TRIGGER update_dataset_items_updated_at
BEFORE UPDATE ON public.dataset_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_dataset_experiments_updated_at ON public.dataset_experiments;
CREATE TRIGGER update_dataset_experiments_updated_at
BEFORE UPDATE ON public.dataset_experiments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- User roles policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- News checks policies
DROP POLICY IF EXISTS "Users can view own checks" ON public.news_checks;
CREATE POLICY "Users can view own checks"
ON public.news_checks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can insert own checks" ON public.news_checks;
CREATE POLICY "Users can insert own checks"
ON public.news_checks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own checks" ON public.news_checks;
CREATE POLICY "Users can update own checks"
ON public.news_checks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can delete own checks" ON public.news_checks;
CREATE POLICY "Users can delete own checks"
ON public.news_checks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Dataset items policies
DROP POLICY IF EXISTS "Authenticated users can view dataset items" ON public.dataset_items;
CREATE POLICY "Authenticated users can view dataset items"
ON public.dataset_items
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Admins can manage dataset items" ON public.dataset_items;
CREATE POLICY "Admins can manage dataset items"
ON public.dataset_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Dataset experiments policies
DROP POLICY IF EXISTS "Users can view own experiments" ON public.dataset_experiments;
CREATE POLICY "Users can view own experiments"
ON public.dataset_experiments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can create own experiments" ON public.dataset_experiments;
CREATE POLICY "Users can create own experiments"
ON public.dataset_experiments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own experiments" ON public.dataset_experiments;
CREATE POLICY "Users can update own experiments"
ON public.dataset_experiments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can delete own experiments" ON public.dataset_experiments;
CREATE POLICY "Users can delete own experiments"
ON public.dataset_experiments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- ============================================
-- 9. COMMENTS
-- ============================================

COMMENT ON TABLE public.dataset_items IS 'Normalized benchmark dataset items from LIAR, FakeNewsNet, ISOT, etc.';
COMMENT ON TABLE public.dataset_experiments IS 'User-created dataset experiments for model training and evaluation';
COMMENT ON COLUMN public.dataset_items.dataset_name IS 'Name of the dataset: LIAR, ISOT, FakeNewsNet';
COMMENT ON COLUMN public.dataset_items.original_id IS 'Original ID from the source dataset';
COMMENT ON COLUMN public.dataset_items.label IS 'Normalized label: real, fake, or misleading';
