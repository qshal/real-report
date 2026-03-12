-- Dataset tables for benchmark fake news datasets
-- This migration is self-contained and doesn't depend on other migrations

-- Create app_role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END
$$;

-- Create has_role function if it doesn't exist
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

-- Dataset items table for storing normalized benchmark data
CREATE TABLE public.dataset_items (
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
CREATE INDEX idx_dataset_items_dataset_name ON public.dataset_items (dataset_name);
CREATE INDEX idx_dataset_items_label ON public.dataset_items (label);
CREATE INDEX idx_dataset_items_source ON public.dataset_items (source);
CREATE INDEX idx_dataset_items_dataset_label ON public.dataset_items (dataset_name, label);

-- Full-text search index for text content
CREATE INDEX idx_dataset_items_text_search ON public.dataset_items USING gin (to_tsvector('english', text));

-- Enable RLS
ALTER TABLE public.dataset_items ENABLE ROW LEVEL SECURITY;

-- RLS policies: dataset_items (readable by all authenticated users, writable by admins)
CREATE POLICY "Authenticated users can view dataset items"
ON public.dataset_items
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage dataset items"
ON public.dataset_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

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

-- Dataset experiments table for tracking model training/evaluation
CREATE TABLE public.dataset_experiments (
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

CREATE INDEX idx_dataset_experiments_user_id ON public.dataset_experiments (user_id);
CREATE INDEX idx_dataset_experiments_status ON public.dataset_experiments (status);

ALTER TABLE public.dataset_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own experiments"
ON public.dataset_experiments
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own experiments"
ON public.dataset_experiments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiments"
ON public.dataset_experiments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own experiments"
ON public.dataset_experiments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Trigger to update updated_at
CREATE TRIGGER update_dataset_items_updated_at
BEFORE UPDATE ON public.dataset_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dataset_experiments_updated_at
BEFORE UPDATE ON public.dataset_experiments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.dataset_items IS 'Normalized benchmark dataset items from LIAR, FakeNewsNet, ISOT, etc.';
COMMENT ON TABLE public.dataset_experiments IS 'User-created dataset experiments for model training and evaluation';
COMMENT ON COLUMN public.dataset_items.dataset_name IS 'Name of the dataset: LIAR, ISOT, FakeNewsNet';
COMMENT ON COLUMN public.dataset_items.original_id IS 'Original ID from the source dataset';
COMMENT ON COLUMN public.dataset_items.label IS 'Normalized label: real, fake, or misleading';
