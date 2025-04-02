/*
  # Initial Schema Setup for UMKM Marketplace

  1. New Tables
    - `profiles`
      - Extends Supabase auth.users
      - Stores user profile information
      - Links to vendors table for vendor accounts
    
    - `vendors`
      - Stores vendor-specific information
      - Links to profiles table
    
    - `products`
      - Stores product information
      - Links to vendors table
    
    - `orders`
      - Stores order information
      - Links to profiles (customer) and vendors
    
    - `order_items`
      - Stores items within each order
      - Links to orders and products

  2. Security
    - Enable RLS on all tables
    - Add policies for:
      - Profiles: Users can read/update their own profile
      - Vendors: Public can view verified vendors
      - Products: Public read, vendor-only write
      - Orders: Customer/vendor access to relevant orders
      - Order Items: Same as orders
*/

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'vendor', 'customer');
CREATE TYPE order_status AS ENUM ('pending', 'processing', 'shipping', 'delivered', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cod', 'bank_transfer');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role DEFAULT 'customer',
  name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors table
CREATE TABLE vendors (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  description TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  image_url TEXT,
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  vendor_id UUID REFERENCES vendors(id),
  status order_status DEFAULT 'pending',
  payment_method payment_method,
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_address TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order items table
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_time DECIMAL(10,2) NOT NULL CHECK (price_at_time >= 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Vendors policies
CREATE POLICY "Public can view verified vendors"
  ON vendors FOR SELECT
  USING (is_verified = true OR auth.uid() = id);

CREATE POLICY "Vendors can update their own data"
  ON vendors FOR UPDATE
  USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Public can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage their products"
  ON products FOR ALL
  USING (auth.uid() = vendor_id);

-- Orders policies
CREATE POLICY "Customers can view their orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Vendors can view orders for their products"
  ON orders FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Vendors can update order status"
  ON orders FOR UPDATE
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

-- Order items policies
CREATE POLICY "Users can view their order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.customer_id = auth.uid() OR orders.vendor_id = auth.uid())
    )
  );

CREATE POLICY "Customers can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();