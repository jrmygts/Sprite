import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Direct Supabase client with service role key for admin actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(req) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Only available in development' }, { status: 403 });
    }

    // Hardcoded user ID and correct customer ID
    const userId = '543d5c6b-3048-4bf5-890d-fc7ec74bda58';
    const correctCustomerId = 'cus_SCGdDmWiFmMd5I';
    
    console.log('Updating profile for user:', userId);
    console.log('Setting customer_id to:', correctCustomerId);
    
    // Update the profile with the corrected customer ID
    const { error } = await supabase
      .from('profiles')
      .update({ customer_id: correctCustomerId })
      .eq('id', userId);
      
    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Customer ID fixed successfully',
      userId,
      newCustomerId: correctCustomerId
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 