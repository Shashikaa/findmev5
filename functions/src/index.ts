// In your Firebase functions (e.g., functions/index.js)
const functions = require("firebase-functions");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  try {
    // Optionally verify the user is authenticated
    if (!context.auth) {
      throw new Error("Authentication required");
    }

    const { amount, currency } = data;
    
    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      currency: currency,
      // Optional: Set metadata for tracking
      metadata: {
        userId: context.auth.uid
      }
    });

    // Return the client secret to the client
    return {
      clientSecret: paymentIntent.client_secret
    };
  } catch (error) {
    console.error("Payment intent error:", error);
    throw new Error(`Payment intent creation failed: ${error.message}`);
  }
});