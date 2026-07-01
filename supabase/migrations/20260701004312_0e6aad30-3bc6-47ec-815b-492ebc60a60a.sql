
CREATE TABLE public.guru_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

GRANT SELECT ON public.guru_usage TO authenticated;
GRANT ALL ON public.guru_usage TO service_role;

ALTER TABLE public.guru_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own guru usage select" ON public.guru_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_guru_usage(_user_id uuid, _limit int)
RETURNS TABLE(new_count int, allowed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'utc')::date;
  cur int;
BEGIN
  INSERT INTO public.guru_usage (user_id, day, count)
  VALUES (_user_id, today, 0)
  ON CONFLICT (user_id, day) DO NOTHING;

  SELECT count INTO cur FROM public.guru_usage
   WHERE user_id = _user_id AND day = today FOR UPDATE;

  IF cur >= _limit THEN
    RETURN QUERY SELECT cur, false;
    RETURN;
  END IF;

  UPDATE public.guru_usage
     SET count = count + 1, updated_at = now()
   WHERE user_id = _user_id AND day = today
  RETURNING count INTO cur;

  RETURN QUERY SELECT cur, true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_guru_usage(uuid, int) FROM public;
GRANT EXECUTE ON FUNCTION public.increment_guru_usage(uuid, int) TO service_role;
