-- =============================================================
-- Industrial ERP Platform — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username     text UNIQUE NOT NULL,
  business_name text,
  business_type text CHECK (business_type IN ('shopowner','trader','warehouse','manufacturer')),
  owner_name   text,
  phone        text,
  email        text,
  role         text DEFAULT 'admin',
  onboarding_complete boolean DEFAULT false,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────
-- TRANSACTIONS (PocketBooks + Sales)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id           text PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  type         text,          -- 'income','expense','sale'
  category     text,
  description  text,
  amount       numeric(12,2),
  subtotal     numeric(12,2),
  vat          numeric(5,4),
  vat_amount   numeric(12,2),
  discount     numeric(12,2),
  total        numeric(12,2),
  payment_method text,
  customer_id  integer,
  customer_name text,
  items        jsonb,
  notes        text,
  status       text,
  reference    text,
  date         text,
  timestamp    bigint,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- ACCOUNTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  name         text,
  type         text,
  balance      numeric(12,2) DEFAULT 0,
  currency     text DEFAULT 'ZAR',
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  name         text NOT NULL,
  phone        text,
  email        text,
  loyalty_points integer DEFAULT 0,
  total_spent  numeric(12,2) DEFAULT 0,
  visit_count  integer DEFAULT 0,
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own customers" ON customers FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- INVENTORY (PoolStock)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory (
  sku          text NOT NULL,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  name         text NOT NULL,
  category     text,
  quantity     numeric(12,3) DEFAULT 0,
  unit         text,
  unit_cost    numeric(12,2),
  unit_price   numeric(12,2),
  reorder_level numeric(12,3),
  location     text,
  barcode      text,
  color        text,
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (sku, user_id)
);
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own inventory" ON inventory FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- SUPPLIERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  name         text NOT NULL,
  contact_name text,
  phone        text,
  email        text,
  address      text,
  rating       numeric(3,1),
  payment_terms text,
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own suppliers" ON suppliers FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- PURCHASE ORDERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  supplier_id  integer,
  status       text DEFAULT 'pending',
  items        jsonb,
  total        numeric(12,2),
  order_date   text,
  expected_date text,
  received_date text,
  notes        text,
  created_by   text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own purchase_orders" ON purchase_orders FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- STOCK MOVEMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  sku          text,
  type         text,   -- 'in','out','adjustment'
  quantity     numeric(12,3),
  reference    text,
  notes        text,
  timestamp    bigint,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own stock_movements" ON stock_movements FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- PRODUCTION ORDERS (SmartShift)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_orders (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  product_name text,
  sku          text,
  quantity     numeric(12,3),
  status       text DEFAULT 'queued',
  priority     integer DEFAULT 5,
  machine_id   integer,
  worker_id    integer,
  due_date     text,
  started_at   bigint,
  completed_at bigint,
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own production_orders" ON production_orders FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- MACHINES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS machines (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  name         text NOT NULL,
  type         text,
  status       text DEFAULT 'idle',
  utilization  numeric(5,2) DEFAULT 0,
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own machines" ON machines FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- SHIFTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shifts (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  machine_id   integer,
  worker_id    integer,
  date         text,
  start_time   text,
  end_time     text,
  status       text DEFAULT 'scheduled',
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own shifts" ON shifts FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- WORKERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workers (
  id           serial PRIMARY KEY,
  user_id      uuid REFERENCES auth.users ON DELETE CASCADE,
  name         text NOT NULL,
  skills       text[],
  availability text DEFAULT 'available',
  phone        text,
  notes        text,
  synced       boolean DEFAULT false,
  local_timestamp bigint,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own workers" ON workers FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- SYNDICATES (TrustCircle)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syndicates (
  id                 serial PRIMARY KEY,
  user_id            uuid REFERENCES auth.users ON DELETE CASCADE,
  name               text NOT NULL,
  type               text,   -- 'group_buying','equipment_financing','mutual_credit','warehouse_backed'
  description        text,
  max_members        integer DEFAULT 10,
  min_contribution   numeric(12,2),
  contribution_frequency text,
  purpose            text,
  rules              text,
  status             text DEFAULT 'active',
  total_pool         numeric(12,2) DEFAULT 0,
  created_by         text,
  synced             boolean DEFAULT false,
  local_timestamp    bigint,
  created_at         timestamptz DEFAULT now()
);
ALTER TABLE syndicates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own syndicates" ON syndicates FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- SYNDICATE MEMBERS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS syndicate_members (
  id                  serial PRIMARY KEY,
  user_id             uuid REFERENCES auth.users ON DELETE CASCADE,
  syndicate_id        integer,
  business_id         text,
  business_name       text,
  role                text DEFAULT 'member',
  joined_at           bigint,
  risk_score          integer DEFAULT 50,
  total_contributions numeric(12,2) DEFAULT 0,
  status              text DEFAULT 'active',
  approved_by         text,
  synced              boolean DEFAULT false,
  local_timestamp     bigint,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE syndicate_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own syndicate_members" ON syndicate_members FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- CONTRIBUTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contributions (
  id              serial PRIMARY KEY,
  user_id         uuid REFERENCES auth.users ON DELETE CASCADE,
  syndicate_id    integer,
  member_id       integer,
  amount          numeric(12,2),
  type            text,   -- 'regular','penalty','interest','principal'
  date            bigint,
  due_date        bigint,
  status          text DEFAULT 'pending',
  payment_method  text,
  reference       text,
  notes           text,
  synced          boolean DEFAULT false,
  local_timestamp bigint,
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own contributions" ON contributions FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- GROUP BUYS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_buys (
  id               serial PRIMARY KEY,
  user_id          uuid REFERENCES auth.users ON DELETE CASCADE,
  syndicate_id     integer,
  item             text,
  sku              text,
  supplier         text,
  unit_price       numeric(12,2),
  bulk_price       numeric(12,2),
  min_quantity     numeric(12,3),
  total_quantity   numeric(12,3) DEFAULT 0,
  participants     jsonb DEFAULT '[]',
  status           text DEFAULT 'open',
  deadline         text,
  savings_per_unit numeric(12,2),
  created_by       text,
  committed_at     bigint,
  synced           boolean DEFAULT false,
  local_timestamp  bigint,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE group_buys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own group_buys" ON group_buys FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- FUNDING REQUESTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS funding_requests (
  id               serial PRIMARY KEY,
  user_id          uuid REFERENCES auth.users ON DELETE CASCADE,
  syndicate_id     integer,
  member_id        integer,
  amount           numeric(12,2),
  purpose          text,
  description      text,
  repayment_terms  text,
  collateral       text,
  status           text DEFAULT 'pending',
  votes_for        integer DEFAULT 0,
  votes_against    integer DEFAULT 0,
  votes_required   integer,
  request_date     bigint,
  synced           boolean DEFAULT false,
  local_timestamp  bigint,
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE funding_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own funding_requests" ON funding_requests FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- WALLETS (PocketWallet)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id            serial PRIMARY KEY,
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE,
  business_id   text,
  balance       numeric(12,2) DEFAULT 0,
  currency      text DEFAULT 'ZAR',
  status        text DEFAULT 'active',
  synced        boolean DEFAULT false,
  local_timestamp bigint,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own wallets" ON wallets FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id            serial PRIMARY KEY,
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE,
  type          text,
  amount        numeric(12,2),
  currency      text DEFAULT 'ZAR',
  status        text DEFAULT 'pending',
  method        text,
  reference     text,
  description   text,
  date          text,
  synced        boolean DEFAULT false,
  local_timestamp bigint,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own payments" ON payments FOR ALL USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- WALLET TRANSACTIONS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            serial PRIMARY KEY,
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE,
  wallet_id     integer,
  type          text,
  amount        numeric(12,2),
  balance_after numeric(12,2),
  description   text,
  reference     text,
  date          text,
  synced        boolean DEFAULT false,
  local_timestamp bigint,
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own wallet_transactions" ON wallet_transactions FOR ALL USING (auth.uid() = user_id);

-- =============================================================
-- USAGE INSTRUCTIONS
-- =============================================================
-- 1. Go to your Supabase project → SQL Editor
-- 2. Paste and run this entire file
-- 3. Copy your project URL and anon key from Settings → API
-- 4. Create a .env file:
--      VITE_SUPABASE_URL=https://your-project.supabase.co
--      VITE_SUPABASE_ANON_KEY=your-anon-key
-- 5. Run: npm install && npm run dev
-- =============================================================
