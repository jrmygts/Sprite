// Script to set up required database tables
// Run with: node scripts/setup-database.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupDatabase() {
  // Initialize Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    console.log('Setting up database tables...');
    console.log('Making sure profiles table exists...');
    
    // Create profiles table using the REST API directly
    const { error: createProfilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (createProfilesError && createProfilesError.code === '42P01') {
      console.log('Profiles table does not exist. Creating it...');
      
      // We need to run SQL directly, but the JavaScript client doesn't support this
      // Let's show instructions for the user instead
      console.log('\n-------------------------------------------------------');
      console.log('IMPORTANT: You need to create the profiles table manually.');
      console.log('Please go to your Supabase dashboard at:');
      console.log(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/project/default/editor`);
      console.log('And run the following SQL:');
      console.log('\n');
      console.log(`
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

-- Add trigger to create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
      `);
      
      console.log('\n-------------------------------------------------------');
      console.log('After creating the profiles table, run this script again to create profiles for existing users.\n');
      return;
    } else if (createProfilesError) {
      console.error('Error checking profiles table:', createProfilesError);
      return;
    } else {
      console.log('Profiles table exists');
    }
    
    // Get current users and create profiles for them
    console.log('Checking for users without profiles...');
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error getting users:', usersError);
    } else if (users && users.length > 0) {
      console.log(`Found ${users.length} users`);
      
      for (const user of users) {
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();
          
        if (profileError && profileError.code === 'PGRST116') {
          // Create profile
          console.log(`Creating profile for user ${user.id} (${user.email})`);
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: user.id,
                email: user.email,
                has_access: true, // Give access to all existing users
                subscription_status: 'active'
              }
            ]);
            
          if (insertError) {
            console.error(`Error creating profile for user ${user.id}:`, insertError);
          } else {
            console.log(`Created profile for user ${user.id}`);
          }
        } else if (profileError) {
          console.error(`Error checking profile for user ${user.id}:`, profileError);
        } else {
          console.log(`Profile already exists for user ${user.id}`);
          
          // Update to ensure access
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              has_access: true,
              subscription_status: 'active'
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error(`Error updating profile for user ${user.id}:`, updateError);
          } else {
            console.log(`Updated profile for user ${user.id} to have access`);
          }
        }
      }
    } else {
      console.log('No users found');
    }
    
    console.log('Database setup complete');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

setupDatabase(); 