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
    const details = document.querySelector("#reward-details");
    const form = document.querySelector("#reward-code-form");
    const codeInput = document.querySelector("#reward-code-input");
    const codeResult = document.querySelector("#reward-code-result");
    const continueButton = document.querySelector("#continue-timer");
    const timerLink = document.querySelector("#code-timer-link");
    const backOptions = document.querySelector("#back-options-link");
    const optionsUrl = "options.html?category=" + encodeURIComponent(requestedCategory);
    const timerUrl = "timer.html?category=" + encodeURIComponent(requestedCategory) + "&option=" + encodeURIComponent(option);
    if (timerLink) { timerLink.href = timerUrl; timerLink.hidden = true; }
    if (backOptions) backOptions.href = optionsUrl;
    if (continueButton) continueButton.href = timerUrl;
    if (continueButton) { continueButton.classList.add("hidden"); continueButton.setAttribute("aria-hidden", "true"); }
    fetch("/api/rewards", { headers: { "Accept": "application/json" }, cache: "no-store" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("Unable to load rewards.")))
      .then(data => {
        const reward = (data.rewards || []).find(r => r.category === requestedCategory && r.reward_name === option);
        if (!reward) {
          chosen.textContent = "Reward unavailable";
          if (form) form.hidden = true;
          if (codeResult) codeResult.textContent = "This reward option is unavailable. Go back and choose an available reward.";
          return;
        }
        if (details) {
          const text = (reward.reward_text || "").trim();
          details.textContent = text;
          details.hidden = !text;
        }
      })
      .catch(() => { if (details) details.hidden = true; });
    if (form) form.addEventListener("submit", async event => {
      event.preventDefault();
      const value = (codeInput?.value || "").trim();
      if (!value) { if (codeResult) codeResult.textContent = "Enter a code first."; return; }
      const button = form.querySelector('button[type="submit"]');
      if (button) { button.disabled = true; button.textContent = "Checking…"; }
      if (codeResult) { codeResult.textContent = ""; codeResult.className = "reward-code-result"; }
      try {
        const response = await fetch("/api/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ category: requestedCategory, option, code: value })
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Could not verify this code. Try again.");
        if (result.valid === true) {
          // Start and persist a separate 72-hour timer for this exact category + reward.
          const rewardTimerKey = "trg_reward_timer_v2_" + encodeURIComponent(requestedCategory) + "_" + encodeURIComponent(option);
          if (!localStorage.getItem(rewardTimerKey)) localStorage.setItem(rewardTimerKey, String(Date.now()));
          if (codeResult) { codeResult.textContent = "Code is correct."; codeResult.classList.add("is-success"); }
          if (continueButton) { continueButton.classList.remove("hidden"); continueButton.setAttribute("aria-hidden", "false"); }
          if (timerLink) timerLink.hidden = false;
          if (codeInput) codeInput.setAttribute("aria-invalid", "false");
        } else {
          if (codeResult) { codeResult.textContent = "Incorrect code. Please check it and try again."; codeResult.classList.add("is-error"); }
          if (continueButton) { continueButton.classList.add("hidden"); continueButton.setAttribute("aria-hidden", "true"); }
          if (codeInput) { codeInput.setAttribute("aria-invalid", "true"); codeInput.focus(); }
        }
      } catch (error) {
        if (codeResult) { codeResult.textContent = error.message || "Could not verify this code. Try again."; codeResult.classList.add("is-error"); }
      } finally {
        if (button) { button.disabled = false; button.textContent = "Verify code →"; }
      }
    });
  }
  const timer = document.querySelector("#timer-value");
  if (timer) {
    const label = document.querySelector("#timer-message"), finish = document.querySelector("#timer-finish");
    const categoryKey = params.get("category") || "";
    const key = "trg_reward_timer_v2_" + encodeURIComponent(categoryKey) + "_" + encodeURIComponent(option);
    const duration = 72 * 60 * 60 * 1000; let start = Number(localStorage.getItem(key));
    // Separate timer per exact category/reward; fallback supports direct timer-page visits.
    if (!start || !Number.isFinite(start) || start > Date.now()) { start = Date.now(); localStorage.setItem(key, String(start)); }
    const end = start + duration;
    const update = () => { const remaining = Math.max(0, end-Date.now()); const hours=Math.floor(remaining/3600000), minutes=Math.floor((remaining%3600000)/60000), seconds=Math.floor((remaining%60000)/1000); timer.innerHTML="<span><b>"+String(hours).padStart(2,"0")+"</b><small>HOURS</small></span><i>:</i><span><b>"+String(minutes).padStart(2,"0")+"</b><small>MINUTES</small></span><i>:</i><span><b>"+String(seconds).padStart(2,"0")+"</b><small>SECONDS</small></span>"; if (remaining<=0) { clearInterval(interval); if(label) label.textContent="Timer finished. Your reward will be provided in your DM."; if(finish) finish.classList.remove("hidden"); } };
    const optionsLink = document.querySelector("#timer-options-link"), codeLink = document.querySelector("#timer-code-link"); if (optionsLink) optionsLink.href = "options.html?category=" + encodeURIComponent(params.get("category") || ""); if (codeLink) codeLink.href = "code.html?category=" + encodeURIComponent(params.get("category") || "") + "&option=" + encodeURIComponent(option); if (label) label.textContent = "Your reward will be provided in your DM after the timer ends."; update(); const interval = setInterval(update, 1000);
  }
  const contact=document.querySelector("#contact-form");
  if(contact) contact.addEventListener("submit", e => { e.preventDefault(); const result=document.querySelector("#contact-result"); if(result) result.textContent="Preview only: this message was not sent or saved."; contact.reset(); });
});