-- Скрипт для создания таблиц в Supabase SQL Editor

-- 1. Таблица профилей пользователей
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('client', 'buyer')) DEFAULT 'client',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Таблица заказов
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  client_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('draft', 'on_review', 'calculating', 'pending_payment', 'purchased', 'at_warehouse', 'shipped', 'delivered')) DEFAULT 'draft',
  exchange_rate DECIMAL DEFAULT 13.5, -- Примерный курс
  delivery_cost_rmb DECIMAL DEFAULT 0,
  total_amount_rmb DECIMAL DEFAULT 0,
  total_amount_rub DECIMAL DEFAULT 0,
  notes TEXT
);

-- 3. Таблица товаров в заказе
CREATE TABLE order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  name_ru TEXT NOT NULL,
  name_ch TEXT,
  photo_url TEXT,
  description TEXT,
  material TEXT,
  has_battery BOOLEAN DEFAULT FALSE,
  dimensions TEXT,
  link TEXT,
  hs_code TEXT,
  manufacturer TEXT,
  model TEXT,
  sku TEXT,
  brand TEXT,
  qty_per_box INTEGER DEFAULT 1,
  box_count INTEGER DEFAULT 1,
  total_qty INTEGER DEFAULT 1,
  box_dimensions TEXT,
  net_weight_per_unit DECIMAL,
  weight_per_box_kg DECIMAL,
  total_net_weight_kg DECIMAL,
  total_gross_weight_kg DECIMAL,
  total_volume_m3 DECIMAL,
  price_per_unit_rmb DECIMAL DEFAULT 0,
  total_price_rmb DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Настройка RLS (Row Level Security) - чтобы пользователи видели только свои заказы
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Политика: пользователи видят свои профили
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- Политика: клиенты видят свои заказы, байеры видят все заказы
CREATE POLICY "Clients can view own orders" ON orders FOR SELECT USING (
  auth.uid() = client_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'buyer')
);
