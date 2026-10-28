module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const url = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || "";
  const guildId = (process.env.TRG_GUILD_ID || "").trim();
  if (!url || !key || !guildId) {
    return res.status(503).json({ error: "Rewards are not configured yet." });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const categoryUrl = new URL(`${url}/rest/v1/trigger_reward_categories`);
    categoryUrl.searchParams.set("select", "category_key,category_label,category_emoji,sort_order");
    categoryUrl.searchParams.set("guild_id", `eq.${guildId}`);
    categoryUrl.searchParams.set("active", "eq.true");
    categoryUrl.searchParams.set("order", "sort_order.asc,category_label.asc");

    const rewardUrl = new URL(`${url}/rest/v1/trigger_rewards_config`);
    rewardUrl.searchParams.set("select", "category,category_label,category_emoji,reward_name,invite_requirement,reward_text,sort_order");
    rewardUrl.searchParams.set("guild_id", `eq.${guildId}`);
    rewardUrl.searchParams.set("active", "eq.true");
    rewardUrl.searchParams.set("order", "sort_order.asc,reward_name.asc");

    const [categoryResponse, rewardResponse] = await Promise.all([
      fetch(categoryUrl, { headers }),
      fetch(rewardUrl, { headers })
    ]);
    if (!categoryResponse.ok || !rewardResponse.ok) {
      console.error("Rewards API database read failed", categoryResponse.status, rewardResponse.status);
      return res.status(502).json({ error: "Could not load rewards." });
    }
    const [categories, rewards] = await Promise.all([categoryResponse.json(), rewardResponse.json()]);
    return res.status(200).json({ categories, rewards });
  } catch (error) {
    console.error("Rewards API error:", error?.message || "unknown");
    return res.status(502).json({ error: "Could not load rewards." });
  }
};