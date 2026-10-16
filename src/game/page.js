// The game page: loads the game, which starts itself, and wires the full-screen button.
import "./play.js";

const fs = document.getElementById("fs");
const el = document.documentElement;
if (fs && el.requestFullscreen) {
  fs.hidden = false;
  const sync = () => { const on = !!document.fullscreenElement; fs.setAttribute("aria-pressed", String(on)); fs.textContent = on ? "Exit full screen" : "Full screen"; };
  fs.addEventListener("click", () => (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen().catch(() => {})));
  document.addEventListener("fullscreenchange", sync);
}
