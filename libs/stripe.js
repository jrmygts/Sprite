import Stripe from "stripe";

// This is used to create a Stripe Checkout for one-time payments. It's usually triggered with the <ButtonCheckout /> component. Webhooks are used to update the user's state in the database.
export const createCheckout = async ({
  priceId,
  mode,
  successUrl,
  cancelUrl,
  couponId,
  clientReferenceId,
  user,
}) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const extraParams = {};

  if (user?.customerId) {
    extraParams.customer = user.customerId;
  } else {
    if (mode === "payment") {
      extraParams.customer_creation = "always";
      // The option below costs 0.4% (up to $2) per invoice. Alternatively, you can use https://zenvoice.io/ to create unlimited invoices automatically.
      // extraParams.invoice_creation = { enabled: true };
      extraParams.payment_intent_data = { setup_future_usage: "on_session" };
    }
    if (user?.email) {
      extraParams.customer_email = user.email;
    }
    extraParams.tax_id_collection = { enabled: true };
  }

  const stripeSession = await stripe.checkout.sessions.create({
    mode,
    allow_promotion_codes: true,
    client_reference_id: clientReferenceId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    discounts: couponId
      ? [
          {
            coupon: couponId,
          },
        ]
      : [],
    success_url: successUrl,
    cancel_url: cancelUrl,
    ...extraParams,
  });

  return stripeSession.url;
};

// This is used to create Customer Portal sessions, so users can manage their subscriptions (payment methods, cancel, etc..)
export const createCustomerPortal = async ({ customerId, returnUrl }) => {
  try {
    if (!customerId) {
      console.error("Missing customer ID for portal creation");
      throw new Error("Customer ID is required to create a billing portal session");
    }
    
    // Validate and sanitize customer ID 
    // Remove any potential path traversal characters or control characters
    if (typeof customerId !== 'string') {
      console.error("Invalid customer ID type:", typeof customerId);
      throw new Error("Invalid customer ID format");
    }
    
    // Stripe customer IDs typically start with 'cus_' followed by alphanumeric characters
    // This sanitizes the ID to ensure it only contains safe characters
    const sanitizedCustomerId = customerId.trim();
    if (!sanitizedCustomerId.match(/^cus_[a-zA-Z0-9]+$/)) {
      console.error("Customer ID does not match expected format:", customerId);
      throw new Error("Invalid customer ID format");
    }
    
    console.log("Creating portal session for customer:", sanitizedCustomerId);
    
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not defined in environment");
      throw new Error("Stripe configuration error");
    }
    
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: sanitizedCustomerId,
        return_url: returnUrl,
      });

      if (!portalSession || !portalSession.url) {
        console.error("No URL in portal session response:", portalSession);
        throw new Error("Failed to create Stripe portal session");
      }

      console.log("Portal session created successfully");
      return portalSession.url;
    } catch (stripeError) {
      // Handle specific Stripe API errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        if (stripeError.message.includes('No such customer')) {
          console.error("Stripe error - customer not found:", sanitizedCustomerId);
          throw new Error("Customer not found in Stripe");
        }
      }
      console.error("Stripe API error:", stripeError);
      throw stripeError;
    }
  } catch (e) {
    console.error("Error creating customer portal:", e);
    throw e; // Re-throw the error to be handled by the API route
  }
};

// This is used to get the uesr checkout session and populate the data so we get the planId the user subscribed to
export const findCheckoutSession = async (sessionId) => {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });

    return session;
  } catch (e) {
    console.error(e);
    return null;
  }
};
