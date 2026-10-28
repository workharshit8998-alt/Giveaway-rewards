const ALLOWED = new Set(["YouTube", "Minecraft", "OTT & streaming"]);
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const origin = req.headers.origin;
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (host !== "trigger-rewards.vercel.app" && !host.endsWith(".vercel.app") && host !== "localhost") {
        return res.status(403).json({ error: "Origin not allowed" });
      }
    } catch {
      return res.status(403).json({ error: "Invalid origin" });
    }
  }
  const category = typeof req.body?.category === "string" ? req.body.category.trim() : "";
  if (!ALLOWED.has(category)) return res.status(400).json({ error: "Choose a valid category." });
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return res.status(503).json({ error: "Database is not configured yet." });
  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/trigger_demo_events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": serviceKey,
        "Authorization": `Bearer ${serviceKey}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ category, event_type: "demo_preview" })
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Supabase insert failed:", response.status, detail.slice(0, 300));
      return res.status(502).json({ error: "Could not save the demo event." });
    }
    return res.status(201).json({ ok: true, message: "Demo event saved. No reward was issued." });
  } catch (error) {
    console.error("Demo event error:", error?.message || "unknown");
    return res.status(502).json({ error: "Database connection failed." });
  }
};