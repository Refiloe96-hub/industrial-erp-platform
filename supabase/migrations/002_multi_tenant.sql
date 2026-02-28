-- =============================================================
-- Industrial ERP Platform — Phase 12: Multi-Tenant Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================

-- Add business_id to profiles to group users
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT auth.uid();

-- Create business_invites for multi-user onboarding
CREATE TABLE IF NOT EXISTS business_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid NOT NULL,
  email        text NOT NULL,
  role         text DEFAULT 'employee',
  invited_by   uuid REFERENCES auth.users ON DELETE CASCADE,
  status       text DEFAULT 'pending',
  created_at   timestamptz DEFAULT now(),
  UNIQUE(business_id, email)
);
ALTER TABLE business_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own business invites" ON business_invites 
FOR ALL USING (
  business_id IN (SELECT business_id FROM profiles WHERE id = auth.uid())
);

-- Helper function to get the current user's business_id
CREATE OR REPLACE FUNCTION get_business_id() RETURNS uuid AS $$
  SELECT business_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Update RLS policies for common tables to use business_id 
-- NOTE: In a true migration, you would drop the old policies first if they conflict.
-- We are assuming these tables either already exist from 001 or will be updated.

-- Profiles: Users in the same business can see each other
DROP POLICY IF EXISTS "Users manage own profile" ON profiles;
CREATE POLICY "Users view business profiles" ON profiles FOR SELECT USING (business_id = get_business_id());
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own transactions" ON transactions;
CREATE POLICY "Business see own transactions" ON transactions FOR ALL USING (business_id = get_business_id());

-- Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own inventory" ON inventory;
CREATE POLICY "Business see own inventory" ON inventory FOR ALL USING (business_id = get_business_id());

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own customers" ON customers;
CREATE POLICY "Business see own customers" ON customers FOR ALL USING (business_id = get_business_id());

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own suppliers" ON suppliers;
CREATE POLICY "Business see own suppliers" ON suppliers FOR ALL USING (business_id = get_business_id());

-- Machines
ALTER TABLE machines ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own machines" ON machines;
CREATE POLICY "Business see own machines" ON machines FOR ALL USING (business_id = get_business_id());

-- Production Orders
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own production_orders" ON production_orders;
CREATE POLICY "Business see own production_orders" ON production_orders FOR ALL USING (business_id = get_business_id());

-- Shifts
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own shifts" ON shifts;
CREATE POLICY "Business see own shifts" ON shifts FOR ALL USING (business_id = get_business_id());

-- Workers
ALTER TABLE workers ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own workers" ON workers;
CREATE POLICY "Business see own workers" ON workers FOR ALL USING (business_id = get_business_id());

-- Accounts
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS business_id uuid DEFAULT get_business_id();
DROP POLICY IF EXISTS "Users see own accounts" ON accounts;
CREATE POLICY "Business see own accounts" ON accounts FOR ALL USING (business_id = get_business_id());
