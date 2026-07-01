
CREATE TABLE public.user_entitlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','refunded')),
  source TEXT NOT NULL DEFAULT 'stars' CHECK (source IN ('stars','grant','beta')),
  product_id TEXT,
  stars_charge_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);

GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;
ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own entitlements"
  ON public.user_entitlements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_entitlements_updated_at
  BEFORE UPDATE ON public.user_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

CREATE TABLE public.stars_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  telegram_user_id BIGINT,
  product_id TEXT NOT NULL,
  stars_amount INTEGER NOT NULL,
  telegram_payment_charge_id TEXT NOT NULL UNIQUE,
  provider_payment_charge_id TEXT,
  invoice_payload TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stars_payments TO authenticated;
GRANT ALL ON public.stars_payments TO service_role;
ALTER TABLE public.stars_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own payments"
  ON public.stars_payments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_stars_payments_user ON public.stars_payments (user_id, created_at DESC);
