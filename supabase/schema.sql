-- ══════════════════════════════════════════════════════════════════════════════
--  WeberTrack v2.0 · Supabase SQL Schema
--  Ejecuta esto en Supabase → SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── Extensions ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enums ───────────────────────────────────────────────────────────────────
CREATE TYPE user_role     AS ENUM ('PROMOTOR', 'SUPERVISOR', 'SUPERADMIN', 'AUDITOR');
CREATE TYPE order_status  AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELIVERED');
CREATE TYPE bread_status  AS ENUM ('available', 'sold_out', 'discontinued');

-- ─── Branches ────────────────────────────────────────────────────────────────
CREATE TABLE branches (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  address               TEXT NOT NULL,
  lat                   NUMERIC(10, 6),
  lng                   NUMERIC(10, 6),
  status                TEXT DEFAULT 'active',
  assigned_promotor_ids UUID[] DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bread types ─────────────────────────────────────────────────────────────
CREATE TABLE bread_types (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  status     bread_status DEFAULT 'available',
  unit       TEXT DEFAULT 'pza',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Profiles (extends auth.users) ───────────────────────────────────────────
CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  role                user_role NOT NULL DEFAULT 'PROMOTOR',
  supervisor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_branch_ids UUID[] DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Orders ──────────────────────────────────────────────────────────────────
CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  promoter_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  supervisor_comments TEXT,
  status              order_status DEFAULT 'PENDING',
  items               JSONB NOT NULL DEFAULT '[]',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  approved_at         TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Sales history ────────────────────────────────────────────────────────────
CREATE TABLE sales_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  bread_type_id UUID NOT NULL REFERENCES bread_types(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  quantity      INTEGER NOT NULL DEFAULT 0,
  UNIQUE(branch_id, bread_type_id, date)
);

CREATE INDEX idx_sales_history_branch_bread ON sales_history(branch_id, bread_type_id);
CREATE INDEX idx_orders_supervisor ON orders(supervisor_id);
CREATE INDEX idx_orders_promoter   ON orders(promoter_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_status     ON orders(status);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_history ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_read_all"   ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (get_my_role() IN ('SUPERADMIN'));

-- Branches: all can read; superadmin can write
CREATE POLICY "branches_read"  ON branches FOR SELECT USING (true);
CREATE POLICY "branches_write" ON branches FOR ALL   USING (get_my_role() = 'SUPERADMIN');

-- Bread types: all can read; superadmin can write
CREATE POLICY "bread_types_read"  ON bread_types FOR SELECT USING (true);
CREATE POLICY "bread_types_write" ON bread_types FOR ALL   USING (get_my_role() = 'SUPERADMIN');

-- Orders:
--   PROMOTOR:   can create + read own
--   SUPERVISOR: can read/update their team's orders
--   AUDITOR/SUPERADMIN: can read all
CREATE POLICY "orders_insert" ON orders FOR INSERT
  WITH CHECK (promoter_id = auth.uid());

CREATE POLICY "orders_select_promoter" ON orders FOR SELECT
  USING (
    promoter_id   = auth.uid() OR
    supervisor_id = auth.uid() OR
    get_my_role() IN ('SUPERADMIN', 'AUDITOR')
  );

CREATE POLICY "orders_update_supervisor" ON orders FOR UPDATE
  USING (
    supervisor_id = auth.uid() OR
    get_my_role() IN ('SUPERADMIN')
  );

-- Sales history: all authenticated can read; SUPERADMIN can write
CREATE POLICY "sales_read"  ON sales_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sales_write" ON sales_history FOR ALL   USING (get_my_role() = 'SUPERADMIN');

-- ─── Realtime ─────────────────────────────────────────────────────────────────
-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- ─── Seed data ───────────────────────────────────────────────────────────────
-- Branches (Chihuahua, Mexico)
INSERT INTO branches (name, address, lat, lng) VALUES
  ('Sucursal Centro',          'Av. Juárez 1520, Centro',           28.6353, -106.0889),
  ('Sucursal Anáhuac',         'Blvd. Anáhuac 2100',                28.6420, -106.0650),
  ('Sucursal Nombre de Dios',  'Av. División del Norte 4500',       28.6180, -106.0750),
  ('Sucursal Las Granjas',     'Calle Las Granjas 890',             28.6500, -106.0970),
  ('Sucursal Colinas',         'Blvd. Ortiz Mena 3200',             28.6280, -106.1100),
  ('Sucursal Cerro Grande',    'Av. Cerro Grande 1780',             28.6610, -106.0820),
  ('Sucursal Mirador',         'Calle Mirador 450',                 28.6090, -106.0680),
  ('Sucursal Altavista',       'Blvd. Altavista 1100',              28.6350, -106.1200);

-- Bread types
INSERT INTO bread_types (name, status, unit) VALUES
  ('Pan Blanco',        'available', 'pza'),
  ('Pan Integral',      'available', 'pza'),
  ('Pan Multigrano',    'available', 'pza'),
  ('Pan de Caja 680g',  'available', 'pza'),
  ('Pan Dulce Surtido', 'available', 'paq'),
  ('Baguette',          'available', 'pza'),
  ('Pan de Maíz',       'sold_out',  'pza'),
  ('Pan sin Gluten',    'available', 'pza'),
  ('Telera',            'available', 'pza'),
  ('Bolillo',           'available', 'pza');
