import "https://esm.sh/@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!
const stripe_key = Deno.env.get("STRIPE_SECRET_KEY")!

// Simple Stripe signature verification
async function verifySignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts = sigHeader.split(",").reduce((acc: Record<string, string>, part: string) => {
      const [key, val] = part.split("=")
      acc[key.trim()] = val
      return acc
    }, {})
    const timestamp = parts["t"]
    const signature = parts["v1"]
    if (!timestamp || !signature) return false

    const signedPayload = `${timestamp}.${payload}`
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload))
    const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("")
    return expected === signature
  } catch {
    return false
  }
}

Deno.serve(async (req) => {
  try {
    const body = await req.text()
    const sigHeader = req.headers.get("stripe-signature") || ""

    const valid = await verifySignature(body, sigHeader, STRIPE_WEBHOOK_SECRET)
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 })
    }

    const event = JSON.parse(body)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    if (event.type === "checkout.session.completed") {
      const session = event.data.object
      const gymId = session.client_reference_id
      const customerId = session.customer
      const subscriptionId = session.subscription

      if (gymId) {
        await supabase.from("gyms").update({
          stripe_customer_id: customerId,
          subscription_status: "active",
        }).eq("id", gymId)
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscription = event.data.object
      const customerId = subscription.customer
      const status = subscription.status
      const periodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null

      // Map Stripe status to our status
      let appStatus = "active"
      if (status === "active" || status === "trialing") appStatus = "active"
      else if (status === "past_due") appStatus = "past_due"
      else if (status === "canceled" || status === "unpaid" || status === "incomplete_expired") appStatus = "canceled"

      await supabase.from("gyms").update({
        subscription_status: appStatus,
        subscription_current_period_end: periodEnd,
      }).eq("stripe_customer_id", customerId)
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object
      const customerId = invoice.customer

      await supabase.from("gyms").update({
        subscription_status: "past_due",
      }).eq("stripe_customer_id", customerId)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Webhook error:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
