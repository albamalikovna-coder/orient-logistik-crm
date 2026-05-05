-- Скрипт для создания таблиц в Supabase SQL Editor (Актуальная версия V2.0)

-- 1. Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  role TEXT CHECK (role IN ('client', 'buyer', 'admin', 'ispolnitel')) DEFAULT 'client',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. Таблица заказов
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  client_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'draft',
  exchange_rate DECIMAL DEFAULT 13.5,
  
  -- Поля доставки
  address_delivery TEXT,
  delivery_days TEXT,
  
  -- Финансовый блок USD
  logistic_cost_usd DECIMAL DEFAULT 0,
  bank_fees_usd DECIMAL DEFAULT 0,
  company_service_usd DECIMAL DEFAULT 0,
  certification_usd DECIMAL DEFAULT 0,
  labeling_usd DECIMAL DEFAULT 0,
  
  -- Платежи RUB
  payment_1_rub DECIMAL DEFAULT 0,
  payment_2_rub DECIMAL DEFAULT 0,
  payment_3_rub DECIMAL DEFAULT 0,
  
  total_amount_rmb DECIMAL DEFAULT 0,
  total_amount_rub DECIMAL DEFAULT 0,
  notes TEXT
);

-- 3. Таблица товаров в заказе
CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  name_ru TEXT NOT NULL,
  photo_url TEXT,
  
  -- Параметры груза
  hscode TEXT,
  weight_kg DECIMAL DEFAULT 0,
  volume_m3 DECIMAL DEFAULT 0,
  
  -- Цены и расчеты
  price_per_unit_rmb DECIMAL DEFAULT 0,
  total_qty INTEGER DEFAULT 1,
  actual_price_rmb DECIMAL,
  actual_qty DECIMAL,
  duty_percent DECIMAL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Дополнительные расходы
CREATE TABLE IF NOT EXISTS order_extra_charges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_rmb DECIMAL DEFAULT 0,
  amount_rub DECIMAL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Включаем RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_extra_charges ENABLE ROW LEVEL SECURITY;

-- Простые политики доступа (для разработки)
DROP POLICY IF EXISTS "Public access" ON profiles;
CREATE POLICY "Public access" ON profiles FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON orders;
CREATE POLICY "Public access" ON orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON order_items;
CREATE POLICY "Public access" ON order_items FOR ALL USING (true);

DROP POLICY IF EXISTS "Public access" ON order_extra_charges;
CREATE POLICY "Public access" ON order_extra_charges FOR ALL USING (true);
