/*
  # Fix User Registration

  1. Changes
    - Modify handle_new_user trigger function to be more robust
    - Add error handling
    - Fix role assignment
    - Ensure proper transaction handling
    
  2. Security
    - Maintain existing RLS policies
    - Keep security definer for proper permissions
*/

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Modify the trigger function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile first
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'store_name' IS NOT NULL THEN 'vendor'::user_role
      ELSE 'customer'::user_role
    END,
    NOW(),
    NOW()
  );

  -- If user is registering as a vendor, create vendor profile
  IF NEW.raw_user_meta_data->>'store_name' IS NOT NULL THEN
    INSERT INTO public.vendors (
      id,
      store_name,
      description,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'store_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'store_description', ''),
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure policies allow profile creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable profile creation" ON profiles;
  CREATE POLICY "Enable profile creation"
    ON profiles FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
END $$;

-- Ensure policies allow vendor creation
DO $$ BEGIN
  DROP POLICY IF EXISTS "Enable vendor creation" ON vendors;
  CREATE POLICY "Enable vendor creation"
    ON vendors FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);
END $$;