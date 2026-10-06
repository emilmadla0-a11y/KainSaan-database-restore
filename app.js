/* KainSaan public page: browse and search restaurants (read only). */
let restaurants = [];

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fillCuisines() {
  const current = $("cuisine").value;
  const cuisines = [...new Set(restaurants.map(r => r.cuisine))].sort();
  $("cuisine").innerHTML = '<option value="">All cuisines</option>' +
    cuisines.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  $("cuisine").value = cuisines.includes(current) ? current : "";
}

function getShown() {
  const q = $("search").value.trim().toLowerCase();
  const cuisine = $("cuisine").value;
  return restaurants
    .filter(r => (!cuisine || r.cuisine === cuisine) &&
      (!q || r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)))
    .sort((a, b) => $("sort").value === "name"
      ? a.name.localeCompare(b.name)
      : b.rating - a.rating || a.name.localeCompare(b.name));
}

function render() {
  const shown = getShown();

  $("list").innerHTML = shown.map(r => `
    <details class="item">
      <summary>
        <span class="item-main">
          <span class="name">${esc(r.name)}</span>
          <span class="sub">${esc(r.cuisine)}</span>
        </span>
        <span class="rating" title="Rating ${Number(r.rating).toFixed(1)} out of 5"><span>${Number(r.rating).toFixed(1)}</span></span>
      </summary>
      <dl class="detail">
        <div><dt>Address</dt><dd>${esc(r.address)}</dd></div>
        <div><dt>Contact</dt><dd><a href="tel:${encodeURIComponent(r.contact.replace(/\s+/g, ""))}">${esc(r.contact)}</a></dd></div>
        <div><dt>Cuisine</dt><dd>${esc(r.cuisine)}</dd></div>
        <div><dt>Rating</dt><dd>${Number(r.rating).toFixed(1)} out of 5</dd></div>
      </dl>
    </details>`).join("");

  const none = shown.length === 0;
  $("empty").hidden = !none;
  $("list").hidden = none;
  if (none) {
    $("emptyMsg").textContent = restaurants.length === 0
      ? "No restaurants have been added yet. Check back soon."
      : "No restaurants match your search. Try a different name or clear the cuisine filter.";
  }
  $("count").textContent = `${shown.length} restaurant${shown.length === 1 ? "" : "s"}`;
}

async function load() {
  try {
    restaurants = await api.list();
  } catch (e) {
    restaurants = [];
    $("count").textContent = "Could not load restaurants. Please try again later.";
  }
  fillCuisines();
  const want = new URLSearchParams(location.search).get("cuisine");
  if (want && [...$("cuisine").options].some(o => o.value === want)) $("cuisine").value = want;
  render();
}

/* Surprise me: pick at random from whatever is currently shown */
let lastPick = null;
function surprise() {
  const pool = getShown();
  if (!pool.length) {
    $("count").textContent = "Nothing to pick from. Clear your search or cuisine filter first.";
    return;
  }
  const options = pool.length > 1 ? pool.filter(r => r.restaurant_id !== lastPick) : pool;
  const r = options[Math.floor(Math.random() * options.length)];
  lastPick = r.restaurant_id;
  $("pickName").textContent = r.name;
  $("pickCuisine").textContent = r.cuisine;
  $("pickRating").textContent = Number(r.rating).toFixed(1);
  $("pickAddress").textContent = r.address;
  $("pickContact").textContent = r.contact;
  $("pickContact").href = "tel:" + encodeURIComponent(r.contact.replace(/\s+/g, ""));
  const c = $("cuisine").value;
  $("pickNote").textContent = `Picked from ${pool.length} restaurant${pool.length === 1 ? "" : "s"}${c ? " in " + c : ""}.`;
  if (!$("pickDialog").open) $("pickDialog").showModal();
}
$("surprise").addEventListener("click", surprise);
$("pickAgain").addEventListener("click", surprise);
$("pickClose").addEventListener("click", () => $("pickDialog").close());

$("search").addEventListener("input", render);
$("cuisine").addEventListener("change", render);
$("sort").addEventListener("change", render);
load();