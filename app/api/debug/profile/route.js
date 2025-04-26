import { NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

export async function GET(req) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: "Debug endpoints only available in development" },
      { status: 403 }
    );
  }

  try {
    const supabase = createClient();
    
    // Get current user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json(
        { error: "Auth error: " + userError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "Not logged in" },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Profile error: " + profileError.message, userId: user.id },
        { status: 500 }
      );
    }

    // Check Stripe customer if we have a customer ID
    let customerInfo = null;
    let stripeError = null;
    let sanitizedCustomerId = null;
    
    if (profile?.customer_id) {
      const customerId = profile.customer_id;
      
      // Check if customer ID matches Stripe format
      const validFormat = typeof customerId === 'string' && 
                         customerId.match(/^cus_[a-zA-Z0-9]+$/);
      
      if (validFormat) {
        sanitizedCustomerId = customerId;
        try {
          const customer = await stripe.customers.retrieve(sanitizedCustomerId);
          customerInfo = {
            id: customer.id,
            email: customer.email,
            name: customer.name,
            created: new Date(customer.created * 1000).toISOString(),
            deleted: customer.deleted
          };
        } catch (error) {
          stripeError = {
            message: error.message,
            type: error.type, 
            code: error.code
          };
        }
      }
      
      // If invalid format or error, try to find by email
      if (!validFormat || stripeError) {
        try {
          const customers = await stripe.customers.list({
            email: user.email,
            limit: 5
          });
          
          if (customers && customers.data && customers.data.length > 0) {
            customerInfo = {
              id: customers.data[0].id,
              email: customers.data[0].email,
              name: customers.data[0].name,
              created: new Date(customers.data[0].created * 1000).toISOString(),
              deleted: customers.data[0].deleted,
              allCustomers: customers.data.map(c => ({
                id: c.id,
                email: c.email,
                created: new Date(c.created * 1000).toISOString()
              }))
            };
          }
        } catch (lookupError) {
          // Ignore lookup errors
        }
      }
    }

    // Return all debugging info
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      customer: {
        id: profile?.customer_id,
        valid_format: sanitizedCustomerId !== null,
        sanitized_id: sanitizedCustomerId,
        info: customerInfo,
        error: stripeError
      }
    });
  } catch (error) {
    console.error("Debug error:", error);
    return NextResponse.json(
      { error: "Server error: " + error.message },
      { status: 500 }
    );
  }
} 