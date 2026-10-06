/* A small jeepney drives under the nav when you move between pages.
   It only runs after clicking a link inside the site, never on a refresh or first visit. */
(function () {
  if (window.__kainsaanMotion) return;   // safe if the script is accidentally included twice
  window.__kainsaanMotion = true;
  var KEY = "kainsaan_drive";
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fileOf = function (u) { return u.pathname.split("/").pop() || "index.html"; };

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin === location.origin && fileOf(url) !== fileOf(location)) {
      try { sessionStorage.setItem(KEY, "1"); } catch (err) {}
    }
  });

  document.addEventListener("DOMContentLoaded", function () {
    var go = null;
    try { go = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch (err) {}
    if (!go || still) return;
    var header = document.querySelector(".top"), bar = document.querySelector(".topbar");
    if (!header || !bar) return;
    var h = header.getBoundingClientRect(), b = bar.getBoundingClientRect();
    var road = h.height < 160 ? h.height : b.bottom - h.top + 10;   // wheels sit on this line
    var img = document.createElement("img");
    img.src = "jeepney.png";
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.className = "jeepney";
    img.style.top = Math.max(0, road - 34) + "px";
    header.appendChild(img);
    img.addEventListener("animationend", function () { img.remove(); });
  });
})();