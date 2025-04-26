import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Direct Supabase client with service role key for admin actions
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

export async function GET(req) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "This endpoint is only available in development mode" },
      { status: 403 }
    );
  }

  try {
    // Hardcoded user ID for this test
    const userId = '543d5c6b-3048-4bf5-890d-fc7ec74bda58';
    const customerEmail = 'thejeremygates@gmail.com';
    
    // Get the user's profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
      
    if (profileError) {
      return NextResponse.json(
        { error: "Profile error: " + profileError.message },
        { status: 500 }
      );
    }
    
    // Check Stripe customer if we have a customer ID
    let customerInfo = null;
    let stripeError = null;
    const customerId = profile.customer_id;
    
    // Check if it's a valid Stripe customer ID format
    const validFormat = typeof customerId === 'string' && 
                       customerId.match(/^cus_[a-zA-Z0-9]+$/);
    
    try {
      if (validFormat) {
        const customer = await stripe.customers.retrieve(customerId);
        customerInfo = {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          created: new Date(customer.created * 1000).toISOString(),
          deleted: customer.deleted
        };
      }
    } catch (error) {
      stripeError = {
        message: error.message,
        type: error.type,
        code: error.code
      };
    }
    
    return NextResponse.json({
      profile,
      customer: {
        id: customerId,
        valid_format: validFormat,
        info: customerInfo,
        error: stripeError
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
} 