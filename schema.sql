-- SQL Schema for Coffee Shop POS System with Loyalty Points
-- You can run this script directly in the Supabase SQL Editor.

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Employees Table (สำหรับพนักงานและผู้ดูแลระบบ)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- ในระบบจริงควรแฮช แต่สำหรับการจำลองสามารถใช้รหัสผ่านตรงหรือแฮชอย่างง่ายได้
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'cashier', -- 'cashier', 'admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customers Table (ระบบสมาชิกสะสมแต้ม)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Products Table (รายการเครื่องดื่มและเบเกอรี่)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'coffee', 'bakery', 'tea', 'others'
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'out_of_stock'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Orders Table (ประวัติการขายหลัก)
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_amount DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    final_amount DECIMAL(10, 2) NOT NULL,
    points_earned INTEGER DEFAULT 0,
    points_redeemed INTEGER DEFAULT 0,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Order Items Table (รายการย่อยในออเดอร์)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    options JSONB, -- เก็บรายละเอียดเพิ่มเติมเช่น {sweetness: '50%', type: 'Ice', size: 'M'}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
-- เพื่อให้ระบบทำงานง่ายสำหรับการเริ่มต้นทดสอบ สามารถเปิดใช้งานหรือข้ามขั้นตอนนี้ได้
-- ในที่นี้เราสร้าง RLS policies เบื้องต้นให้ใช้งานได้แบบเปิดกว้าง (Public Read/Write)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read employees" ON employees FOR SELECT USING (true);
CREATE POLICY "Allow public insert employees" ON employees FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public all customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all products" ON products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all orders" ON orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

-- Insert Sample Products (สินค้าเริ่มต้น)
INSERT INTO products (name, category, price, image_url) VALUES
('Espresso', 'coffee', 55.00, 'https://images.unsplash.com/photo-1510707513156-46c59d997b72?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Americano', 'coffee', 60.00, 'https://images.unsplash.com/photo-1551046713-247a329c2d1b?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Latte', 'coffee', 65.00, 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Cappuccino', 'coffee', 65.00, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Matcha Latte', 'coffee', 75.00, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Caramel Macchiato', 'coffee', 80.00, 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Butter Croissant', 'bakery', 65.00, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Chocolate Fudge Cake', 'bakery', 85.00, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Blueberry Cheesecake', 'bakery', 95.00, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
('Almond Brownie', 'bakery', 55.00, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');

-- Insert Sample Employees (รหัสพนักงานเริ่มต้น)
-- หมายเหตุ: เพื่อความง่ายในการเชื่อมต่อและสปินอัพ ในระบบจำลองจะเปรียบเทียบ username และ password โดยตรง
INSERT INTO employees (username, password_hash, name, role) VALUES
('admin', 'admin1234', 'Admin Manager', 'admin'),
('cashier1', 'cashier1234', 'John Cashier', 'cashier');

-- Insert Sample Customers (ลูกค้าสมาชิกตัวอย่าง)
INSERT INTO customers (name, phone, points) VALUES
('สมชาย ดีใจ', '0812345678', 25),
('สมหญิง มีสุข', '0898765432', 8),
('กิตติ เก่งกาจ', '0855556666', 105);
