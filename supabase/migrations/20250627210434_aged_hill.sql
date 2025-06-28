/*
  # Fix user_profiles RLS policies

  1. Security Updates
    - Drop existing policies that use incorrect uid() function
    - Create new policies using proper auth.uid() function
    - Ensure proper authentication checks for all operations

  2. Policy Changes
    - Allow authenticated users to insert their own profile using auth.uid()
    - Allow users to update their own profile
    - Allow authenticated users to view all profiles
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;

-- Create new policies with correct auth.uid() function
CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);