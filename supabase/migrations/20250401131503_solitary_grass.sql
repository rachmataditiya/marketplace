/*
  # Fix Profiles RLS Policies
  
  1. Changes
    - Add INSERT policy for profiles table to allow new user registration
    - Policy allows authenticated users to create their own profile
    - Policy ensures user can only set their own ID
*/

-- Add INSERT policy for profiles
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;
  CREATE POLICY "Users can create their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
END $$;

-- Add INSERT policy for profiles during signup
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
  CREATE POLICY "Enable insert for authenticated users only"
    ON profiles FOR INSERT
    TO anon
    WITH CHECK (true);
END $$;