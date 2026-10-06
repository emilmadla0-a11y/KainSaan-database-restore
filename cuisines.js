/* KainSaan cuisines page: each cuisine links to the Restaurants page, filtered. */
(async function () {
  let list = [];
  try { list = await withSkeleton($("list"), 6, () => api.list()); } catch (e) {
    $("count").textContent = "Could not load restaurants. Please try again later.";
  }
  const groups = {};
  for (const r of list) {
    const g = groups[r.cuisine] || (groups[r.cuisine] = { name: r.cuisine, count: 0, top: r });
    g.count++;
    if (r.rating > g.top.rating) g.top = r;
  }
  const rows = Object.values(groups).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  $("empty").hidden = rows.length > 0;
  $("list").hidden = rows.length === 0;
  $("count").textContent = rows.length ? `${rows.length} cuisine${rows.length === 1 ? "" : "s"}` : "";
  $("list").classList.add("animate");
  $("list").innerHTML = rows.map((g, i) => `
    <a class="cuisine-row" style="--i:${i}" href="restaurants.html?cuisine=${encodeURIComponent(g.name)}">
      <span class="item-main">
        <span class="name">${esc(g.name)}</span>
        <span class="sub">${g.count} restaurant${g.count === 1 ? "" : "s"}</span>
      </span>
      <span class="cuisine-top">Top rated: ${esc(g.top.name)} (${fmt(g.top.rating)})</span>
    </a>`).join("");
})();