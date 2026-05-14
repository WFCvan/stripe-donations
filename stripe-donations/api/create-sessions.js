import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  const { amount, type, name, email, town, message, consent } = req.body;

  try {
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
            unit_amount: amount * 100,
            recurring:
              type === "monthly"
                ? { interval: "month" }
                : undefined,
          },
          quantity: 1,
        },
      ],

      customer_email: email,

      metadata: {
        donor_name: name,
        town,
        message,
        consent: consent ? "yes" : "no",
        donation_type: type,
      },

      success_url: "https://YOUR-SITE/success",
      cancel_url: "https://YOUR-SITE/donate",
    });

    res.status(200).json({ url: session.url });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}