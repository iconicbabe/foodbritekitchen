
-- Weekly drops
CREATE TABLE public.weekly_drops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 450,
  portion TEXT NOT NULL DEFAULT '',
  deadline_weekday INTEGER NOT NULL DEFAULT 2,
  deadline_hour INTEGER NOT NULL DEFAULT 20,
  cook_weekday INTEGER NOT NULL DEFAULT 3,
  plates_left INTEGER NOT NULL DEFAULT 12,
  total_plates INTEGER NOT NULL DEFAULT 24,
  pickup_window TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_drops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view weekly drops"
  ON public.weekly_drops FOR SELECT
  USING (true);

-- Site settings (single row)
CREATE TABLE public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  call_phone TEXT NOT NULL DEFAULT '0748801610',
  whatsapp_phone TEXT NOT NULL DEFAULT '254748801610',
  delivery_badge_text TEXT NOT NULL DEFAULT 'Delivery from KES 50 • varies by distance',
  delivery_fee_note TEXT NOT NULL DEFAULT 'Delivery starts from KES 50 and may go higher depending on distance from the pickup point in Ruiru.',
  pickup_note TEXT NOT NULL DEFAULT 'Pick up in Ruiru or request delivery around Ruiru and nearby estates.',
  instagram_url TEXT NOT NULL DEFAULT 'https://www.instagram.com/foodbrite.ke',
  tiktok_url TEXT NOT NULL DEFAULT 'https://www.tiktok.com/@foodbrite.ke',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_settings_singleton CHECK (id = 1)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Admin credentials (hashed passcode)
CREATE TABLE public.admin_credentials (
  id INTEGER PRIMARY KEY DEFAULT 1,
  passcode_hash TEXT,
  salt TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_credentials_singleton CHECK (id = 1)
);

ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;
-- No public policies — only the service role (edge functions) can read/write.

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER weekly_drops_updated_at
  BEFORE UPDATE ON public.weekly_drops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER admin_credentials_updated_at
  BEFORE UPDATE ON public.admin_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed defaults
INSERT INTO public.site_settings (id) VALUES (1);

INSERT INTO public.admin_credentials (id) VALUES (1);

INSERT INTO public.weekly_drops (meal_name, price, portion, deadline_weekday, deadline_hour, cook_weekday, plates_left, total_plates, pickup_window, sort_order) VALUES
  ('Chicken Stew + Rice', 420, 'Full plate, balanced portion with sukuma wiki and chapati add-on option.', 2, 20, 3, 10, 24, 'Ready Wednesday from 12:30PM in Ruiru', 1),
  ('Beef Stew + Ugali', 450, 'Hearty home-style plate built for lunch or early dinner.', 4, 20, 5, 7, 20, 'Ready Friday from 1:00PM with delivery slots after 2PM', 2),
  ('Pilau + Kachumbari', 480, 'Weekend special plate with fragrant spices and generous serving.', 6, 20, 0, 5, 18, 'Ready Sunday from 12:00PM, ideal for family lunch', 3);
