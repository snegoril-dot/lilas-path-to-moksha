ALTER TABLE public.stars_payments ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.stars_payments ADD COLUMN IF NOT EXISTS refund_charge_id text;