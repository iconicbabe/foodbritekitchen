CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  drop_id text NOT NULL DEFAULT '',
  meal_name text NOT NULL DEFAULT '',
  quantity integer NOT NULL DEFAULT 1,
  fulfillment text NOT NULL DEFAULT 'Pickup',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place an order"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(customer_name) > 0
  AND length(customer_name) <= 100
  AND quantity > 0
  AND quantity <= 50
  AND fulfillment IN ('Pickup','Delivery')
  AND status = 'pending'
);

CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);