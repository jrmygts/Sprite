-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  customer_id TEXT,
  price_id TEXT,
  has_access BOOLEAN DEFAULT FALSE,
  subscription_status TEXT,
  subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create policy to allow users to access their own profile
CREATE POLICY "Users can access their own profile"
  ON profiles FOR ALL
  USING (auth.uid() = id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; 