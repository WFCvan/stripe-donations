/* =====================================================================
   WAIKATO FAMILY CENTRE — create-intent.js  (ES module version)
   Powers the IN-WIDGET card field (Stripe Payment Element). Creates a
   PaymentIntent (one-off) or Subscription (monthly) and returns a
   clientSecret. No redirect — card is entered on your page.

   Place at:  /api/create-intent.js   (same folder as create-session.js)
   Reuses your existing STRIPE_SECRET_KEY env var. Nothing else to set here.
   ===================================================================== */

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const ALLOW_ORIGIN = "*"; // or lock to "https://www.waikatofamilycentre.co.nz"

export default async function handler(req, res) {
  // Allow your website to call this endpoint (CORS)
  res.setHeader("Access-Control-Allow-Origin", ALLOW_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const cents = Math.round(Number(b.total != null ? b.total : b.amount) * 100);
    if (!Number.isFinite(cents) || cents < 100) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    const det = b.details || {};
    const metadata = {
      name: b.name || ((det.firstName || "") + " " + (det.lastName || "")).trim(),
      email: b.email || det.email || "",
      phone: det.phone || "",
      address: det.address || b.town || "",
      wantsRegularContact: b.wantsRegularContact ? "YES" : "no",
      coverFees: b.coverFees ? "yes" : "no",
      giftType: b.type || ""
    };

    // MONTHLY → subscription
    if (b.type === "monthly") {
      const customer = await stripe.customers.create({
        email: metadata.email || undefined,
        name: metadata.name || undefined,
        metadata
      });
      const price = await stripe.prices.create({
        unit_amount: cents,
        currency: "nzd",
        recurring: { interval: "month" },
        product_data: { name: "Monthly donation — Waikato Family Centre" }
      });
      const sub = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: price.id }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata
      });
      const pi = sub.latest_invoice && sub.latest_invoice.payment_intent;
      if (!pi) return res.status(400).json({ error: "Could not create subscription payment" });
      return res.status(200).json({ clientSecret: pi.client_secret, mode: "subscription" });
    }

    // ONE-OFF → payment intent
    const pi = await stripe.paymentIntents.create({
      amount: cents,
      currency: "nzd",
      automatic_payment_methods: { enabled: true },
      receipt_email: metadata.email || undefined,
      description: "Donation — Waikato Family Centre",
      metadata
    });
    return res.status(200).json({ clientSecret: pi.client_secret, mode: "payment" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
