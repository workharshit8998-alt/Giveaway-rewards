module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || "";
  const guildId = (process.env.TRG_GUILD_ID || "").trim();

  if (!url || !key || !guildId) {
    return res.status(503).json({ error: "Code verification is not configured yet." });
  }

  const body = req.body || {};
  const code = typeof body.code === "string" ? body.code.trim().slice(0, 200) : "";
  if (!code) return res.status(400).json({ error: "Enter a reward code." });

  try {
    const response = await fetch(url + "/rest/v1/rpc/verify_trigger_reward_code_simple", {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: "Bearer " + key,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ p_guild_id: guildId, p_code: code })
    });

    if (!response.ok) {
      console.error("Simple code verification RPC failed:", response.status);
      return res.status(502).json({ error: "Could not verify this code right now." });
    }

    const valid = await response.json();
    return res.status(200).json({ valid: valid === true });
  } catch (error) {
    console.error("Code verification error:", error?.message || "unknown");
    return res.status(502).json({ error: "Could not verify this code right now." });
  }
};