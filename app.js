document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = String(new Date().getFullYear());
  });

  const TIMER_KEY = "trg_reward_timer_v3";
  const TIMER_DURATION = 72 * 60 * 60 * 1000;
  const form = document.querySelector("#code-entry-form");

  if (form) {
    const input = document.querySelector("#code-entry-input");
    const result = document.querySelector("#code-entry-result");
    const activeTimerLink = document.querySelector("#active-timer-link");
    const submitButton = form.querySelector('button[type="submit"]');

    const existingStart = Number(localStorage.getItem(TIMER_KEY));
    const timerStillRunning = Number.isFinite(existingStart) &&
      existingStart > 0 && Date.now() < existingStart + TIMER_DURATION;

    if (timerStillRunning) {
      form.hidden = true;
      if (activeTimerLink) activeTimerLink.classList.remove("hidden");
    }

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const code = (input?.value || "").trim();
      if (!code) {
        if (result) result.textContent = "Enter your code first.";
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Checking code…";
      }
      if (result) {
        result.textContent = "";
        result.className = "reward-code-result";
      }

      try {
        const response = await fetch("/api/verify-code", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ code })
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.error || "Could not verify this code. Try again.");
        }

        if (data.valid === true) {
          localStorage.setItem(TIMER_KEY, String(Date.now()));
          if (result) {
            result.textContent = "Code verified. Starting your timer…";
            result.classList.add("is-success");
          }
          window.location.assign("timer.html");
          return;
        }

        if (result) {
          result.textContent = "Invalid or already-used code. Please check it and try again.";
          result.classList.add("is-error");
        }
        if (input) {
          input.setAttribute("aria-invalid", "true");
          input.focus();
        }
      } catch (error) {
        if (result) {
          result.textContent = error.message || "Could not verify this code. Try again.";
          result.classList.add("is-error");
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = "Submit code →";
        }
      }
    });
  }

  const timer = document.querySelector("#timer-value");
  if (timer) {
    const label = document.querySelector("#timer-message");
    const finish = document.querySelector("#timer-finish");
    const start = Number(localStorage.getItem(TIMER_KEY));

    if (!Number.isFinite(start) || start <= 0 || start > Date.now()) {
      window.location.replace("index.html");
      return;
    }

    const end = start + TIMER_DURATION;
    const update = () => {
      const remaining = Math.max(0, end - Date.now());
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);

      timer.innerHTML =
        "<span><b>" + String(hours).padStart(2, "0") + "</b><small>HOURS</small></span>" +
        "<i>:</i><span><b>" + String(minutes).padStart(2, "0") + "</b><small>MINUTES</small></span>" +
        "<i>:</i><span><b>" + String(seconds).padStart(2, "0") + "</b><small>SECONDS</small></span>";

      if (remaining <= 0) {
        clearInterval(interval);
        if (label) label.textContent = "Timer complete. Contact the server staff to continue with your reward.";
        if (finish) finish.classList.remove("hidden");
      }
    };

    if (label) label.textContent = "Your 72-hour waiting timer is running.";
    update();
    const interval = setInterval(update, 1000);
  }
});