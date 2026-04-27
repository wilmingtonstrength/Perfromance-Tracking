import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const GHL_API_KEY = Deno.env.get("GHL_API_KEY")!
const GHL_OWNER_CONTACT_ID = Deno.env.get("GHL_OWNER_CONTACT_ID")!
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "matt@wilmingtonstrength.com"

const GHL_API_BASE = "https://services.leadconnectorhq.com"
const GHL_API_VERSION = "2021-07-28"

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record) {
      return new Response(JSON.stringify({ error: "No record in payload" }), { status: 400 })
    }

    const gymName = record.name || "Unknown Gym"
    const gymSlug = record.slug || ""
    const createdAt = record.created_at
      ? new Date(record.created_at).toLocaleString("en-US", { timeZone: "America/New_York" })
      : "Unknown"
    const utmSource = record.utm_source || ""
    const utmMedium = record.utm_medium || ""
    const utmCampaign = record.utm_campaign || ""
    const utmContent = record.utm_content || ""
    const utmTerm = record.utm_term || ""

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let ownerEmail = "Unknown"
    let ownerName = ""
    const { data: gymUsers } = await supabase
      .from("gym_users")
      .select("email, full_name")
      .eq("gym_id", record.id)
      .eq("role", "admin")
      .limit(1)

    if (gymUsers && gymUsers.length > 0) {
      ownerEmail = gymUsers[0].email || "Unknown"
      ownerName = gymUsers[0].full_name || ""
    }

    const utmRows = (utmSource || utmMedium || utmCampaign || utmContent || utmTerm)
      ? `
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">UTM Source</td><td style="padding:8px 16px;">${utmSource}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">UTM Medium</td><td style="padding:8px 16px;">${utmMedium}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">UTM Campaign</td><td style="padding:8px 16px;">${utmCampaign}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">UTM Content</td><td style="padding:8px 16px;">${utmContent}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">UTM Term</td><td style="padding:8px 16px;">${utmTerm}</td></tr>`
      : ""

    const html = `
      <h2>New Kaimetric Signup</h2>
      <table style="border-collapse:collapse;font-family:sans-serif;">
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">Gym Name</td><td style="padding:8px 16px;">${gymName}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">Slug</td><td style="padding:8px 16px;">${gymSlug}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">Owner Name</td><td style="padding:8px 16px;">${ownerName}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">Owner Email</td><td style="padding:8px 16px;">${ownerEmail}</td></tr>
        <tr><td style="padding:8px 16px;font-weight:bold;color:#555;">Signed Up</td><td style="padding:8px 16px;">${createdAt}</td></tr>
        ${utmRows}
      </table>
      <p style="font-family:sans-serif;color:#666;margin-top:24px;">Reach out to nurture this lead.</p>
    `

    const ghlRes = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GHL_API_KEY}`,
        "Version": GHL_API_VERSION,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        type: "Email",
        contactId: GHL_OWNER_CONTACT_ID,
        subject: `New Kaimetric Signup: ${gymName}`,
        html,
        emailFrom: `Kaimetric <${ADMIN_EMAIL}>`,
      }),
    })

    const ghlBody = await ghlRes.text()
    console.log("GHL response:", ghlRes.status, ghlBody)

    if (!ghlRes.ok) {
      return new Response(JSON.stringify({ error: "GHL send failed", status: ghlRes.status, body: ghlBody }), { status: 500 })
    }

    return new Response(JSON.stringify({ success: true, ghl: JSON.parse(ghlBody) }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Error:", err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
