// Research Background page: phone menu, the stacking deck sheets, the gallery (filter by deck, open a card larger),
// and the quote that lights up as it scrolls.

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

document.documentElement.classList.add("ready");

// ---- the gallery ----
const filters = $$("[data-filter]");
filters.forEach((btn) =>
  btn.addEventListener("click", () => {
    const which = btn.dataset.filter;
    filters.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    $$(".browse .item").forEach((li) => (li.hidden = which !== "all" && li.dataset.deck !== which));
  })
);

const dlg = $("#zoom");
if (dlg) {
  const image = $("#zoom-img");
  const cap = $("#zoom-cap");
  let opener = null;
  $$("[data-img]").forEach((btn) =>
    btn.addEventListener("click", () => {
      opener = btn;
      const { img, name, noun, desc } = { img: btn.dataset.img, name: btn.dataset.name, noun: btn.dataset.noun, desc: btn.dataset.desc };
      image.src = img;
      image.alt = `${name}, ${noun}.${desc ? ` ${desc}` : ""}`;
      cap.textContent = `${noun}: ${name}`;
      dlg.setAttribute("aria-label", cap.textContent);
      dlg.showModal();
    })
  );
  const close = () => dlg.close();
  $("[data-zoom-close]", dlg).addEventListener("click", close);
  dlg.addEventListener("click", (e) => { if (e.target === dlg) close(); });
  dlg.addEventListener("close", () => opener?.focus());
}

// ---- phone menu: full-screen sheet; the page behind is inert while it is open ----
const bar = $(".bar");
const menuBtn = $(".menu");
if (bar && menuBtn) {
  const behind = [$("#main"), $(".site-foot")].filter(Boolean);
  const setMenu = (open, returnFocus = true) => {
    bar.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    $("[data-menu-label]").textContent = open ? "Close" : "Menu";
    document.documentElement.style.overflow = open ? "hidden" : "";
    behind.forEach((el) => (el.inert = open));
    if (open) $("#nav a")?.focus();
    else if (returnFocus) menuBtn.focus();
  };
  menuBtn.addEventListener("click", () => setMenu(!bar.classList.contains("open")));
  $$("#nav a").forEach((a) => a.addEventListener("click", () => setMenu(false, false)));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && bar.classList.contains("open")) setMenu(false); });
  matchMedia("(min-width: 62rem)").addEventListener("change", (e) => e.matches && setMenu(false, false));
}

// ---- deck stack: only stack while every sheet's content fits; otherwise let the sheets flow ----
const decksEl = $(".decks");
if (decksEl) {
  const sheets = $$(".sheet", decksEl);
  const stackable = matchMedia("(min-width: 62rem) and (min-height: 46rem)");
  const fit = () => {
    if (!stackable.matches) return;
    decksEl.classList.remove("flow");
    const clipped = sheets.some((s) => {
      const bottom = s.getBoundingClientRect().bottom;
      return [$(".copy", s), $(".fan", s)].some((el) => el && el.getBoundingClientRect().bottom > bottom - 4);
    });
    if (clipped) decksEl.classList.add("flow");
  };
  const ro = new ResizeObserver(() => { if (!decksEl.classList.contains("flow")) fit(); });
  sheets.forEach((s) => ro.observe($(".copy", s)));
  addEventListener("resize", fit);
  document.fonts?.ready.then(fit);
  fit();
}

// ---- the quote: words light up as it scrolls through the viewport ----
const quote = $("[data-reveal] p");
if (quote && !reduceMotion) {
  const words = quote.textContent.trim().split(/\s+/);
  quote.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(" ");
  const spans = $$(".w", quote);
  let ticking = false;
  const update = () => {
    const r = quote.getBoundingClientRect();
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / (r.height + vh * 0.3)));
    const on = Math.round(p * spans.length);
    spans.forEach((s, i) => s.classList.toggle("on", i < on));
    ticking = false;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener("resize", update);
  update();
}
