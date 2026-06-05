import Stripe from "stripe";
import fs from "fs";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { id, amount, type, name, email, town } = req.body;
    // ✅ SAVE DATA LOCALLY (temporary storage)
    const donation = {
      id,
      name,
      email,
      town,
      amount,
      type,
      date: new Date().toISOString()
    };
    const filePath = "/tmp/donations.json";
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(filePath));
    } catch {}
    data.push(donation);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    // ✅ CREATE STRIPE SESSION
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "nzd",
          product_data: {
            name: type === "monthly" ? "Monthly Donation" : "Donation",
          },
          unit_amount: Math.round(amount * 100),
          ...(type === "monthly" && {
            recurring: { interval: "month" }
          })
        },
        quantity: 1,
      }],
      mode: type === "monthly" ? "subscription" : "payment",
      success_url: "https://yourwebsite.co.nz/thanks",
      cancel_url: "https://yourwebsite.co.nz/cancel",
      metadata: {
        id,
        name,
        email,
        town,
        amount,
        type
      }
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}


give me full replacement code if needed then clear next steps
