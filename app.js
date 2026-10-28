const categoryOptions = {
  youtube: [
    { name: "10K subscribers", sub: "YouTube-themed option" },
    { name: "25K subscribers", sub: "YouTube-themed option" }
  ],
  minecraft: [
    { name: "MCFA", sub: "Minecraft-themed option" },
    { name: "Redeem code", sub: "Minecraft-themed option" }
  ],
  ott: [
    { name: "Netflix · 3 months", sub: "Streaming-themed option" },
    { name: "Amazon Prime · 3 months", sub: "Streaming-themed option" },
    { name: "Hotstar · 3 months", sub: "Streaming-themed option" }
  ]
};
const STORAGE_KEY = "triggerRewardsDemoCooldownV1";
let selectedCategory = "youtube";
let selectedOption = categoryOptions.youtube[0].name;
let timerInterval;

const optionsEl = document.querySelector("#options");
const form = document.querySelector("#claim-form");
const resultEl = document.querySelector("#result");
const timerPanel = document.querySelector("#timer-panel");
const timerEl = document.querySelector("#timer");
const timerCaption = document.querySelector("#timer-caption");

function renderOptions() {
  optionsEl.replaceChildren();
  categoryOptions[selectedCategory].forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option" + (option.name === selectedOption ? " selected" : "");
    button.setAttribute("aria-pressed", String(option.name === selectedOption));
    const dot = document.createElement("span");
    dot.className = "option-dot";
    const textWrap = document.createElement("span");
    const name = document.createElement("span");
    name.className = "option-label";
    name.textContent = option.name;
    const sub = document.createElement("span");
    sub.className = "option-sub";
    sub.textContent = option.sub;
    textWrap.append(name, document.createElement("br"), sub);
    button.append(dot, textWrap);
    button.addEventListener("click", () => {
      selectedOption = option.name;
      renderOptions();
    });
    optionsEl.append(button);
  });
}

document.querySelectorAll(".category").forEach((button) => {
  button.addEventListener("click", () => {
    selectedCategory = button.dataset.category;
    selectedOption = categoryOptions[selectedCategory][0].name;
    document.querySelectorAll(".category").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderOptions();
  });
});

function showTimer() {
  clearInterval(timerInterval);
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  if (!stored || !Number.isFinite(stored)) {
    timerPanel.hidden = true;
    return;
  }
  timerPanel.hidden = false;
  timerCaption.textContent = "Local demo timer · " + selectedOption;
  function tick() {
    const remaining = Math.max(0, stored - Date.now());
    const totalSeconds = Math.floor(remaining / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    timerEl.textContent = days > 0
      ? String(days).padStart(2, "0") + ":" + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0")
      : String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    if (remaining <= 0) {
      timerCaption.textContent = "The 72-hour demo cooldown has ended.";
      clearInterval(timerInterval);
    }
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = document.querySelector("#demo-code").value.trim();
  if (!code) return;
  // This is intentionally a local prototype: no real code verification,
  // network request, reward delivery, or IP/database collection occurs.
  localStorage.setItem(STORAGE_KEY, String(Date.now() + 72 * 60 * 60 * 1000));
  resultEl.hidden = false;
  resultEl.textContent = "Demo started for “" + selectedOption + "”. This is only a visual prototype: the text you entered was not verified and no reward will be provided.";
  form.reset();
  showTimer();
});

document.querySelector("#reset-demo").addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEY);
  clearInterval(timerInterval);
  timerPanel.hidden = true;
  resultEl.hidden = false;
  resultEl.textContent = "Local demo timer reset on this browser. No server-side data was changed.";
});

renderOptions();
showTimer();