// Script to reset subscription status for development testing
// Run with: node scripts/reset-subscription.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function resetSubscription() {
  // Initialize Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  try {
    // Get the current user
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email, has_access, subscription_status')
      .limit(10);

    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }

    console.log('Found users:', users.map(u => ({ id: u.id, email: u.email })));
    
    // Ask which user to update
    const userId = users[0]?.id;
    
    if (!userId) {
      console.error('No users found to update');
      return;
    }

    // Update the subscription status
    const { data, error } = await supabase
      .from('profiles')
      .update({
        has_access: true,
        subscription_status: 'active'
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating subscription:', error);
    } else {
      console.log(`Successfully updated subscription for user: ${userId}`);
      console.log('You should now have access to the generate page.');
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

resetSubscription(); 