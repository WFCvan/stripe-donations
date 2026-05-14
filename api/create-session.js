import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { amount, type, name, email, town } = req.body;

    const session = await stripe.checkout.sessions.create({
      mode: type === "monthly" ? "subscription" : "payment",

      payment_method_types: ["card"],

      line_items: [{
        price_data: {
          currency: "nzd",
          product_data: {
            name: type === "monthly"
              ? "Monthly Donation"
              : "One-off Donation",
          },
          unit_amount: Math.round(amount * 100),
          ...(type === "monthly" && {
            recurring: { interval: "month" }
          })
        },
        quantity: 1,
      }],

      customer_email: email,

      metadata: {
        name,
        town,
        donation_type: type
      },

      success_url: "https://example.com/success",
      cancel_url: "https://example.com/donate",
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({ error: error.message });
  }
}
