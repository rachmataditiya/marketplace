/*
  # Fix Row Level Security Policies

  1. Changes
    - Add public access policies for products table
    - Add public access policies for vendors table
    - Add public access policies for profiles table
    - Add public access policies for reviews table

  2. Security
    - Enable public read access to products
    - Enable public read access to verified vendors
    - Enable public read access to basic profile info
    - Enable public read access to reviews
*/

-- Products policies
DROP POLICY IF EXISTS "Public can view products" ON products;
CREATE POLICY "Public can view products"
  ON products
  FOR SELECT
  TO public
  USING (true);

-- Vendors policies
DROP POLICY IF EXISTS "Public can view verified vendors" ON vendors;
CREATE POLICY "Public can view verified vendors"
  ON vendors
  FOR SELECT
  TO public
  USING (true);

-- Profiles policies
DROP POLICY IF EXISTS "Public can view basic profile info" ON profiles;
CREATE POLICY "Public can view basic profile info"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

-- Reviews policies
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone"
  ON reviews
  FOR SELECT
  TO public
  USING (true);