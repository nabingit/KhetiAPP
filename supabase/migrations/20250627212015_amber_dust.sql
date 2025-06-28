/*
  # Remove Row Level Security

  1. Security Changes
    - Disable RLS on all tables
    - Drop all existing policies
    - Remove authentication restrictions

  2. Tables affected
    - user_profiles
    - jobs  
    - applications
*/

-- Disable Row Level Security on all tables
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;

-- Drop all policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;

-- Drop all policies for jobs
DROP POLICY IF EXISTS "Anyone can view open jobs" ON jobs;
DROP POLICY IF EXISTS "Farmers can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Farmers can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Farmers can delete their own jobs" ON jobs;

-- Drop all policies for applications
DROP POLICY IF EXISTS "Users can view applications for their jobs or applications they made" ON applications;
DROP POLICY IF EXISTS "Workers can insert applications" ON applications;
DROP POLICY IF EXISTS "Workers can update their own applications" ON applications;
DROP POLICY IF EXISTS "Farmers can update applications for their jobs" ON applications;