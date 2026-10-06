/* KainSaan home page: top rated picks, cuisines, and Surprise me. */
(async function () {
  let list = [];
  try { list = await withSkeleton($("topList"), 6, () => api.list()); } catch (e) {}

  const top = [...list].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name)).slice(0, 6);
  $("topList").classList.add("animate");
  $("topList").innerHTML = top.map(itemHTML).join("");
  $("seeAll").textContent = `See all ${list.length} restaurant${list.length === 1 ? "" : "s"}`;

  const counts = {};
  list.forEach(r => { counts[r.cuisine] = (counts[r.cuisine] || 0) + 1; });
  $("chips").innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([c, n], i) => `<a class="chip" style="--i:${i}" href="restaurants.html?cuisine=${encodeURIComponent(c)}">${esc(c)} <span>${n}</span></a>`)
    .join("");

  // The tags pop in one after another when they scroll into view
  const chips = $("chips");
  if (!prefersReducedMotion() && "IntersectionObserver" in window) {
    chips.classList.add("pre");
    const io = new IntersectionObserver(entries => {
      if (entries.some(x => x.isIntersecting)) { chips.classList.remove("pre"); chips.classList.add("go"); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(chips);
  }

  $("homeEmpty").hidden = list.length > 0;
  $("homeContent").hidden = list.length === 0;

  initSurprise(() => ({ pool: list, where: "" }), () => {});
})();