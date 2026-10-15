// The game page: loads the console, which starts itself, and wires the full-screen button.
import "./console.js";

const fs = document.getElementById("fs");
const el = document.documentElement;
if (fs && el.requestFullscreen) {
  fs.hidden = false;
  const sync = () => { const on = !!document.fullscreenElement; fs.setAttribute("aria-pressed", String(on)); fs.textContent = on ? "Exit full screen" : "Full screen"; };
  fs.addEventListener("click", () => (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen().catch(() => {})));
  document.addEventListener("fullscreenchange", sync);
}
