import Stripe from "stripe";

export default async function handler(req, res) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // ✅ Test endpoint in browser
  if (req.method === "GET") {
    return res.status(200).json({ status: "API is working ✅" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body || {};

    const amount = Number(body.amount || 10);
    const type = body.type || "one_off";
    const name = body.name || "Anonymous";
    const email = body.email || "test@test.com";
    const town = body.town || "Unknown";

    const session = await stripe.checkout.sessions.create({
      mode: type === "monthly" ? "subscription" : "payment",

      payment_method_types: ["card"],

      line_items: [
        {
          price_data: {
            currency: "nzd",
            product_data: {
              name:
                type === "monthly"
                  ? "Monthly Donation"
                  : "One-off Donation",
            },
            unit_amount: Math.round(amount * 100),

            // ✅ FIXED LINE HERE
            ...(type === "monthly" && {
              recurring: { interval: "month" }
            }),
          },
          quantity: 1,
        },
      ],

      customer_email: email,

      metadata: {
        name,
        town,
        donation_type: type,
      },

      success_url: "https://yourwebsite.co.nz/thanks",
      cancel_url: "https://yourwebsite.co.nz/donate",
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
