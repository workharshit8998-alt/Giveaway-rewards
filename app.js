document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach(el => el.textContent = String(new Date().getFullYear()));
  const toggle = document.querySelector(".menu-toggle"), nav = document.querySelector(".nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => { const open = nav.classList.toggle("open"); toggle.setAttribute("aria-expanded", String(open)); toggle.textContent = open ? "✕" : "☰"; });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); toggle.textContent = "☰"; }));
  }
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const params = new URLSearchParams(location.search);
  const requestedCategory = params.get("category") || "";
  const option = params.get("option") || "";
  const categoryGrid = document.querySelector("#category-list");
  const optionList = document.querySelector("#option-list");
  const selectedCategory = document.querySelector("#selected-category");

  async function loadRewards() {
    try {
      const response = await fetch("/api/rewards", { headers: { "Accept": "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 503 ? "Reward categories have not been added yet." : "Could not load rewards right now.");
      const data = await response.json();
      const categories = Array.isArray(data.categories) ? data.categories : [];
      const rewards = Array.isArray(data.rewards) ? data.rewards : [];
      if (categoryGrid) {
        categoryGrid.innerHTML = categories.length ? categories.map((cat, i) => '<a class="category-card" href="options.html?category='+encodeURIComponent(cat.category_key)+'"><span class="category-symbol">'+escapeHtml(cat.category_emoji || "🎁")+'</span><div class="card-index">CATEGORY '+String(i+1).padStart(2,"0")+'</div><h3>'+escapeHtml(cat.category_label)+'</h3><p>Browse available rewards in this category.</p><span class="card-link">View rewards <b>→</b></span></a>').join("") : '<p class="empty-state">No categories configured yet. Add categories with the Discord bot.</p>';
      }
      if (optionList) {
        const cat = categories.find(c => c.category_key === requestedCategory);
        if (!cat) {
          if (selectedCategory) selectedCategory.textContent = "Category not found";
          optionList.innerHTML = '<p class="empty-state">This category is unavailable. Please return to categories.</p>';
          return;
        }
        if (selectedCategory) selectedCategory.textContent = cat.category_label;
        const items = rewards.filter(r => r.category === cat.category_key);
        optionList.innerHTML = items.length ? items.map((r, i) => '<article class="category-card option-card"><div class="category-symbol">'+String(i+1).padStart(2,"0")+'</div><div class="card-index">REWARD OPTION '+String(i+1).padStart(2,"0")+'</div><h3>'+escapeHtml(r.reward_name)+'</h3><p>Invite requirement: '+Number(r.invite_requirement || 0)+'</p><a class="button button-gold" href="code.html?category='+encodeURIComponent(cat.category_key)+'&option='+encodeURIComponent(r.reward_name)+'">Continue →</a></article>').join("") : '<p class="empty-state">No rewards in this category yet. Ask an administrator to add rewards using Discord.</p>';
      }
    } catch (error) {
      const message = escapeHtml(error.message || "Could not load rewards.");
      if (categoryGrid) categoryGrid.innerHTML = '<p class="empty-state">'+message+'</p>';
      if (optionList) optionList.innerHTML = '<p class="empty-state">'+message+'</p>';
      if (selectedCategory) selectedCategory.textContent = "Unavailable";
    }
  }
  if (categoryGrid || optionList) loadRewards();

  const chosen = document.querySelector("#chosen-option");
  if (chosen) {
    chosen.textContent = option || "Choose an option first";
    const code = document.querySelector("#reward-text-display");
    const details = document.querySelector("#reward-details");
    fetch("/api/rewards", { headers: { "Accept": "application/json" }, cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Unable to load reward details.")))
      .then(data => {
        const cat = (data.categories || []).find(c => c.category_key === requestedCategory);
        const reward = (data.rewards || []).find(r => r.category === requestedCategory && r.reward_name === option);
        if (code) code.textContent = "";
        if (details) details.textContent = reward ? (reward.reward_text || "") : "";
        if (chosen && !reward) chosen.textContent = "Reward unavailable";
      }).catch(() => { if (code) code.textContent = ""; if (details) details.textContent = ""; });
  }
  const codeForm = document.querySelector("#reward-code-form");
  if (codeForm) {
    const codeInput = document.querySelector("#reward-code-input");
    const codeResult = document.querySelector("#reward-code-result");
    const query = new URLSearchParams(location.search);
    const category = query.get("category") || "";
    const rewardOption = query.get("option") || "";
    const optionUrl = "options.html?category=" + encodeURIComponent(category);
    const codeUrl = "code.html?category=" + encodeURIComponent(category) + "&option=" + encodeURIComponent(rewardOption);
    const optionsLink = document.querySelector("#code-options-link");
    const timerLink = document.querySelector("#code-timer-link");
    if (optionsLink) optionsLink.href = optionUrl;
    if (timerLink) timerLink.href = "timer.html?category=" + encodeURIComponent(category) + "&option=" + encodeURIComponent(rewardOption);
    codeForm.addEventListener("submit", event => {
      event.preventDefault();
      const value = (codeInput?.value || "").trim();
      if (!value) { if (codeResult) codeResult.textContent = "Enter a code first."; return; }
      if (codeResult) codeResult.textContent = "Code entered. Automatic code verification is not connected yet.";
    });
  }
  const timer = document.querySelector("#timer-value");
  if (timer) {
    const label = document.querySelector("#timer-message"), finish = document.querySelector("#timer-finish");
    const key = "trg_reward_timer_v1_" + btoa(unescape(encodeURIComponent((params.get("category") || "") + "|" + option))).replace(/[^a-zA-Z0-9]/g, "");
    const duration = 72 * 60 * 60 * 1000; let start = Number(localStorage.getItem(key));
    if (!start || !Number.isFinite(start) || start > Date.now()) { start = Date.now(); localStorage.setItem(key, String(start)); }
    const end = start + duration;
    const update = () => { const remaining = Math.max(0, end-Date.now()); const hours=Math.floor(remaining/3600000), minutes=Math.floor((remaining%3600000)/60000), seconds=Math.floor((remaining%60000)/1000); timer.innerHTML="<span><b>"+String(hours).padStart(2,"0")+"</b><small>HOURS</small></span><i>:</i><span><b>"+String(minutes).padStart(2,"0")+"</b><small>MINUTES</small></span><i>:</i><span><b>"+String(seconds).padStart(2,"0")+"</b><small>SECONDS</small></span>"; if (remaining<=0) { clearInterval(interval); if(label) label.textContent="72-hour wait period finished. Reward fulfillment still needs to be configured."; if(finish) finish.classList.remove("hidden"); } };
    const optionsLink = document.querySelector("#timer-options-link"), codeLink = document.querySelector("#timer-code-link"); if (optionsLink) optionsLink.href = "options.html?category=" + encodeURIComponent(params.get("category") || ""); if (codeLink) codeLink.href = "code.html?category=" + encodeURIComponent(params.get("category") || "") + "&option=" + encodeURIComponent(option); if (label) label.textContent = "72-hour wait period"; update(); const interval = setInterval(update, 1000);
  }
  const contact=document.querySelector("#contact-form");
  if(contact) contact.addEventListener("submit", e => { e.preventDefault(); const result=document.querySelector("#contact-result"); if(result) result.textContent="Preview only: this message was not sent or saved."; contact.reset(); });
});