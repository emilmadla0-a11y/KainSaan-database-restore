/* KainSaan listings page: search, filter, sort, and 20 restaurants per page (read only). */
const PAGE_SIZE = 20;
let restaurants = [];
let page = 1;

function fillCuisines() {
  const cuisines = [...new Set(restaurants.map(r => r.cuisine))].sort();
  $("cuisine").innerHTML = '<option value="">All cuisines</option>' +
    cuisines.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

function getShown() {
  const q = $("search").value.trim().toLowerCase();
  const cuisine = $("cuisine").value;
  return restaurants
    .filter(r => (!cuisine || r.cuisine === cuisine) &&
      (!q || r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)))
    .sort((a, b) => {
      const by = $("sort").value;
      if (by === "name") return a.name.localeCompare(b.name);
      const diff = by === "rating_asc" ? a.rating - b.rating : b.rating - a.rating;
      return diff || a.name.localeCompare(b.name);
    });
}

function pageNumbers(total, current) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const nums = [...new Set([1, total, current - 1, current, current + 1])]
    .filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => { if (i && n - nums[i - 1] > 1) out.push("..."); out.push(n); });
  return out;
}

function renderPager(total) {
  if (total <= 1) { $("pager").innerHTML = ""; return; }
  $("pager").innerHTML =
    `<button type="button" data-page="${page - 1}"${page === 1 ? " disabled" : ""}>Previous</button>` +
    pageNumbers(total, page).map(n => n === "..."
      ? '<span class="gap" aria-hidden="true">&hellip;</span>'
      : `<button type="button" data-page="${n}" aria-label="Page ${n}"${n === page ? ' aria-current="page"' : ""}>${n}</button>`).join("") +
    `<button type="button" data-page="${page + 1}"${page === total ? " disabled" : ""}>Next</button>`;
}

function syncUrl() {
  const p = new URLSearchParams(location.search);
  if (page > 1) p.set("page", page); else p.delete("page");
  const qs = p.toString();
  history.replaceState(null, "", location.pathname + (qs ? "?" + qs : ""));
}

function render(animate = false) {
  const all = getShown();
  const pages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  if (page > pages) page = pages;
  const start = (page - 1) * PAGE_SIZE;
  const shown = all.slice(start, start + PAGE_SIZE);

  $("list").classList.toggle("animate", animate);
  $("list").innerHTML = shown.map(itemHTML).join("");
  const none = all.length === 0;
  $("empty").hidden = !none;
  $("list").hidden = none;
  if (none) {
    $("emptyMsg").textContent = restaurants.length === 0
      ? "No restaurants have been added yet. Check back soon."
      : "No restaurants match your search. Try a different name or clear the cuisine filter.";
  }
  $("count").textContent = none ? "0 restaurants"
    : `Showing ${start + 1} to ${start + shown.length} of ${all.length} restaurant${all.length === 1 ? "" : "s"}`;
  renderPager(pages);
}

function goTo(n) {
  page = n;
  render(true);
  syncUrl();
  const cur = $("pager").querySelector('[aria-current="page"]');
  if (cur) cur.focus({ preventScroll: true });
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ($("count").scrollIntoView) $("count").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
}

async function load() {
  try { restaurants = await withSkeleton($("list"), 8, () => api.list()); }
  catch (e) { restaurants = []; $("count").textContent = "Could not load restaurants. Please try again later."; }
  fillCuisines();
  const params = new URLSearchParams(location.search);
  const want = params.get("cuisine");
  if (want && [...$("cuisine").options].some(o => o.value === want)) $("cuisine").value = want;
  if (params.get("q")) $("search").value = params.get("q");
  page = Math.max(1, parseInt(params.get("page"), 10) || 1);
  render(true);
}

initSurprise(
  () => ({ pool: getShown(), where: $("cuisine").value ? "in " + $("cuisine").value : "" }),
  () => { $("count").textContent = "Nothing to pick from. Clear your search or cuisine filter first."; }
);
const resetPage = animate => () => { page = 1; render(animate); syncUrl(); };
$("search").addEventListener("input", resetPage(false));
$("cuisine").addEventListener("change", resetPage(true));
$("sort").addEventListener("change", resetPage(true));
$("pager").addEventListener("click", e => {
  const b = e.target.closest("button[data-page]");
  if (b && !b.disabled) goTo(Number(b.dataset.page));
});
load();