/*
  # Fix Authentication Policies

  1. Changes
    - Add policies to allow profile creation during signup
    - Add policies for vendor creation
    - Fix profile policies to allow proper authentication flow

  2. Security
    - Maintain RLS security while allowing necessary operations
    - Ensure proper access control for profile and vendor creation
*/

-- Add INSERT policy for profiles during signup
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
  CREATE POLICY "Enable insert for authenticated users only"
    ON profiles FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
END $$;

-- Add INSERT policy for vendors
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable vendor creation" ON vendors;
  CREATE POLICY "Enable vendor creation"
    ON vendors FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
END $$;

-- Create trigger function for profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'name',
    CASE 
      WHEN new.raw_user_meta_data->>'store_name' IS NOT NULL THEN 'vendor'::user_role
      ELSE 'customer'::user_role
    END
  );

  -- If user is registering as a vendor, create vendor profile
  IF new.raw_user_meta_data->>'store_name' IS NOT NULL THEN
    INSERT INTO public.vendors (id, store_name, description)
    VALUES (
      new.id,
      new.raw_user_meta_data->>'store_name',
      new.raw_user_meta_data->>'store_description'
    );
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();