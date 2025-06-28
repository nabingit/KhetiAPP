/*
  # Initial Schema for Kheticulture App

  1. New Tables
    - `user_profiles`
      - `id` (uuid, references auth.users)
      - `name` (text)
      - `contact_number` (text)
      - `user_type` (enum: farmer, worker)
      - `location` (text, optional)
      - `date_of_birth` (date, optional)
      - `weight` (integer, optional, for workers)
      - `height` (integer, optional, for workers)
      - `profile_picture` (text, optional)
      - `working_picture` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `jobs`
      - `id` (uuid, primary key)
      - `farmer_id` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text)
      - `preferred_date` (date)
      - `wage` (numeric)
      - `duration` (integer)
      - `duration_type` (enum: hours, days)
      - `location` (text)
      - `required_workers` (integer)
      - `status` (enum: open, filled, in-progress, completed)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `applications`
      - `id` (uuid, primary key)
      - `job_id` (uuid, references jobs)
      - `worker_id` (uuid, references user_profiles)
      - `message` (text, optional)
      - `status` (enum: pending, accepted, rejected)
      - `applied_at` (timestamp)
      - `rejected_at` (timestamp, optional)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage their own data
    - Add policies for farmers to manage their jobs and view applications
    - Add policies for workers to view jobs and manage their applications
*/

-- Create custom types
CREATE TYPE user_type_enum AS ENUM ('farmer', 'worker');
CREATE TYPE duration_type_enum AS ENUM ('hours', 'days');
CREATE TYPE job_status_enum AS ENUM ('open', 'filled', 'in-progress', 'completed');
CREATE TYPE application_status_enum AS ENUM ('pending', 'accepted', 'rejected');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  contact_number text NOT NULL,
  user_type user_type_enum NOT NULL,
  location text,
  date_of_birth date,
  weight integer,
  height integer,
  profile_picture text,
  working_picture text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  preferred_date date NOT NULL,
  wage numeric NOT NULL,
  duration integer NOT NULL,
  duration_type duration_type_enum NOT NULL,
  location text NOT NULL,
  required_workers integer NOT NULL DEFAULT 1,
  status job_status_enum NOT NULL DEFAULT 'open',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  worker_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  message text,
  status application_status_enum NOT NULL DEFAULT 'pending',
  applied_at timestamptz DEFAULT now(),
  rejected_at timestamptz,
  UNIQUE(job_id, worker_id)
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

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

-- Create policies for jobs
CREATE POLICY "Anyone can view open jobs"
  ON jobs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Farmers can insert their own jobs"
  ON jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = farmer_id AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'farmer'
    )
  );

CREATE POLICY "Farmers can update their own jobs"
  ON jobs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = farmer_id)
  WITH CHECK (auth.uid() = farmer_id);

CREATE POLICY "Farmers can delete their own jobs"
  ON jobs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = farmer_id);

-- Create policies for applications
CREATE POLICY "Users can view applications for their jobs or applications they made"
  ON applications
  FOR SELECT
  TO authenticated
  USING (
    worker_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_id AND jobs.farmer_id = auth.uid()
    )
  );

CREATE POLICY "Workers can insert applications"
  ON applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = worker_id AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'worker'
    )
  );

CREATE POLICY "Workers can update their own applications"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = worker_id)
  WITH CHECK (auth.uid() = worker_id);

CREATE POLICY "Farmers can update applications for their jobs"
  ON applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_id AND jobs.farmer_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_id AND jobs.farmer_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_jobs_farmer_id ON jobs(farmer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_preferred_date ON jobs(preferred_date);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();