-- Extend news_checks with baseline-vs-hybrid evaluation fields
ALTER TABLE public.news_checks
  ADD COLUMN IF NOT EXISTS baseline_predicted_label text,
  ADD COLUMN IF NOT EXISTS baseline_confidence numeric,
  ADD COLUMN IF NOT EXISTS baseline_explanation text,
  ADD COLUMN IF NOT EXISTS verified_label text,
  ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS analysis_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill baseline columns from historical rule-based predictions
UPDATE public.news_checks
SET
  baseline_predicted_label = COALESCE(baseline_predicted_label, predicted_label),
  baseline_confidence = COALESCE(baseline_confidence, confidence),
  baseline_explanation = COALESCE(baseline_explanation, explanation),
  model_name = COALESCE(NULLIF(model_name, ''), 'rule-based-v1')
WHERE baseline_predicted_label IS NULL
   OR baseline_confidence IS NULL
   OR baseline_explanation IS NULL
   OR model_name IS NULL
   OR model_name = '';

-- Validation trigger for verified labels to keep values consistent
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

DROP TRIGGER IF EXISTS validate_news_check_labels_trg ON public.news_checks;
CREATE TRIGGER validate_news_check_labels_trg
BEFORE UPDATE OR INSERT ON public.news_checks
FOR EACH ROW
EXECUTE FUNCTION public.validate_news_check_labels();

CREATE INDEX IF NOT EXISTS idx_news_checks_verified_label ON public.news_checks (verified_label);
CREATE INDEX IF NOT EXISTS idx_news_checks_user_created_at ON public.news_checks (user_id, created_at DESC);