/* Helpers shared by the public pages. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = n => Number(n).toFixed(1);
const isPhone = c => /^[+#]?\d[\d\s\-()]{3,}$/.test(String(c).trim());
const contactHTML = c => isPhone(c)
  ? `<a href="tel:${encodeURIComponent(String(c).replace(/\s+/g, ""))}">${esc(c)}</a>`
  : esc(c);

/* One restaurant row with a details dropdown */
function itemHTML(r, i = 0) {
  return `
    <details class="item" style="--i:${i}">
      <summary>
        <span class="item-main">
          <span class="name">${esc(r.name)}</span>
          <span class="sub">${esc(r.cuisine)}</span>
        </span>
        <span class="leader" aria-hidden="true"></span>
        <span class="rating" title="Rating ${fmt(r.rating)} out of 5"><span>${fmt(r.rating)}</span></span>
      </summary>
      <dl class="detail">
        <div><dt>Address</dt><dd>${esc(r.address)}</dd></div>
        <div><dt>Contact</dt><dd>${contactHTML(r.contact)}</dd></div>
        <div><dt>Cuisine</dt><dd>${esc(r.cuisine)}</dd></div>
        <div><dt>Rating</dt><dd>${fmt(r.rating)} out of 5</dd></div>
      </dl>
    </details>`;
}

/* Surprise me: needs a #surprise button on the page.
   getPool() returns { pool: [restaurants], where: "in Italian" or "" }.
   The pop-up bounces in, shuffles through names like a wheel, then lands on the pick. */
function initSurprise(getPool, onEmpty) {
  document.body.insertAdjacentHTML("beforeend", `
  <dialog id="pickDialog" aria-labelledby="pickName">
    <div class="pick" id="pickBox">
      <h2 id="pickTitle">How about this one?</h2>
      <p class="pick-name" id="pickName"></p>
      <p class="sub pick-cuisine" id="pickCuisine"></p>
      <div class="rating pick-rating"><span id="pickRating"></span></div>
      <dl class="detail pick-detail">
        <div><dt>Address</dt><dd id="pickAddress"></dd></div>
        <div><dt>Contact</dt><dd id="pickContact"></dd></div>
      </dl>
      <p class="pick-note" id="pickNote"></p>
      <div class="actions">
        <button class="btn" type="button" id="pickClose">Close</button>
        <button class="btn primary" type="button" id="pickAgain">Pick another</button>
      </div>
    </div>
  </dialog>`);
  const dlg = $("pickDialog"), box = $("pickBox");
  const reduce = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  let last = null, busy = false;

  const head = r => {
    $("pickName").textContent = r.name;
    $("pickCuisine").textContent = r.cuisine;
    $("pickRating").textContent = fmt(r.rating);
  };
  function land(r) {
    head(r);
    $("pickAddress").textContent = r.address;
    $("pickContact").innerHTML = contactHTML(r.contact);
    $("pickTitle").textContent = "How about this one?";
    box.classList.remove("shuffling", "landed");
    void box.offsetWidth;               // restart the landing animation
    box.classList.add("landed");
    busy = false;
  }
  function pick() {
    if (busy) return;
    const { pool, where } = getPool();
    if (!pool.length) { if (onEmpty) onEmpty(); return; }
    const options = pool.length > 1 ? pool.filter(r => r.restaurant_id !== last) : pool;
    const r = options[Math.floor(Math.random() * options.length)];
    last = r.restaurant_id;
    $("pickNote").textContent = `Picked from ${pool.length} restaurant${pool.length === 1 ? "" : "s"}${where ? " " + where : ""}.`;
    if (!dlg.open) dlg.showModal();
    if (reduce() || pool.length < 2) { land(r); return; }

    busy = true;
    box.classList.remove("landed");
    box.classList.add("shuffling");
    $("pickTitle").textContent = "Picking one for you...";
    $("pickAddress").textContent = "";
    $("pickContact").textContent = "";
    let n = 0;
    (function tick() {
      if (++n > 9) { land(r); return; }
      head(pool[Math.floor(Math.random() * pool.length)]);
      setTimeout(tick, 55 + n * 10);    // slows down like a wheel
    })();
  }
  $("surprise").addEventListener("click", pick);
  $("pickAgain").addEventListener("click", pick);
  $("pickClose").addEventListener("click", () => dlg.close());
}

/* ---------- Motion helpers ---------- */
const prefersReducedMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

/* Grey placeholder rows, shown only if the data takes longer than a moment to arrive */
function skeletonHTML(n) {
  return Array.from({ length: n }, () => `
    <div class="skel" aria-hidden="true">
      <span class="skel-text"><span class="skel-line"></span><span class="skel-line short"></span></span>
      <span class="skel-pin"></span>
    </div>`).join("");
}
async function withSkeleton(el, n, task) {
  const t = setTimeout(() => { el.hidden = false; el.setAttribute("aria-busy", "true"); el.innerHTML = skeletonHTML(n); }, 150);
  try { return await task(); } finally { clearTimeout(t); el.removeAttribute("aria-busy"); }
}

/* Details dropdown eases open and closed, and the rating pin hops on open */
document.addEventListener("click", e => {
  const summary = e.target.closest(".item > summary");
  if (!summary) return;
  const item = summary.parentElement;
  const body = item.querySelector(".detail");
  if (!body) return;
  e.preventDefault();
  if (item._anim) { item._anim.cancel(); item._anim = null; }
  item.classList.remove("closing");
  const opening = !item.open;
  const still = prefersReducedMotion() || !body.animate;
  if (opening) {
    item.open = true;
    const pin = item.querySelector(".rating");
    if (pin && !still) {
      pin.classList.remove("hop"); void pin.offsetWidth; pin.classList.add("hop");
      pin.addEventListener("animationend", () => pin.classList.remove("hop"), { once: true });
    }
  }
  if (still) { if (!opening) item.open = false; return; }

  const cs = getComputedStyle(body);
  const props = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom", "borderTopWidth", "borderBottomWidth"];
  const full = {}, none = {};
  props.forEach(p => { full[p] = cs[p]; none[p] = "0px"; });
  body.style.overflow = "hidden";
  if (!opening) item.classList.add("closing");
  const frames = opening ? [{ ...none, opacity: 0 }, { ...full, opacity: 1 }] : [{ ...full, opacity: 1 }, { ...none, opacity: 0 }];
  const anim = body.animate(frames, { duration: opening ? 280 : 200, easing: opening ? "cubic-bezier(0.2, 0.8, 0.2, 1)" : "ease-in" });
  item._anim = anim;
  anim.onfinish = () => {
    body.style.overflow = ""; item._anim = null;
    if (!opening) { item.open = false; item.classList.remove("closing"); }
  };
  anim.oncancel = () => { body.style.overflow = ""; };
});