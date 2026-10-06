/* KainSaan admin: add, edit, and delete restaurants. Data calls live in api.js. */

/* ---------- State and elements ---------- */
let restaurants = [];
let editingId = null;
let deletingId = null;
let trashed = [];
let purgeTarget = null;

const $ = id => document.getElementById(id);
const rowsEl = $("rows"), countEl = $("count"), emptyEl = $("empty"), emptyMsg = $("emptyMsg");
const tableWrap = document.querySelector(".table-wrap");
const form = $("form"), formDialog = $("formDialog"), confirmDialog = $("confirmDialog");
const purgeDialog = $("purgeDialog");

const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Rendering ---------- */
function render() {
  const q = $("search").value.trim().toLowerCase();
  const shown = restaurants.filter(r =>
    [r.name, r.cuisine, r.address].some(v => v.toLowerCase().includes(q))
  );

  rowsEl.innerHTML = shown.map(r => `
    <tr data-id="${r.restaurant_id}">
      <td class="idcell">${r.restaurant_id}</td>
      <td class="nm name">${esc(r.name)}</td>
      <td class="cu">${esc(r.cuisine)}</td>
      <td class="ad">${esc(r.address)}</td>
      <td class="rt"><div class="rating" title="Rating ${Number(r.rating).toFixed(1)} out of 5"><span>${Number(r.rating).toFixed(1)}</span></div></td>
      <td class="ct">${esc(r.contact)}</td>
      <td class="ac">
        <div class="row-actions">
          <button class="btn small" data-edit="${r.restaurant_id}" type="button">Edit</button>
          <button class="btn small" data-delete="${r.restaurant_id}" type="button">Delete</button>
        </div>
      </td>
    </tr>`).join("");

  $("cuisineList").innerHTML = [...new Set(restaurants.map(r => r.cuisine))].sort().map(c => `<option value="${esc(c)}">`).join("");
  const none = shown.length === 0;
  tableWrap.hidden = none;
  emptyEl.hidden = !none;
  if (none) {
    emptyMsg.textContent = restaurants.length === 0
      ? "No restaurants yet. Select Add restaurant to save your first one."
      : `No restaurants match "${$("search").value.trim()}". Try a different name, cuisine, or address.`;
  }
  countEl.textContent = `${shown.length} of ${restaurants.length} restaurant${restaurants.length === 1 ? "" : "s"}`;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
}

const reduceMotion = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);

/* Soft yellow flash on the row that just changed */
function flashRow(id, scroll) {
  const tr = rowsEl.querySelector(`tr[data-id="${id}"]`);
  if (!tr) return;
  if (tr.scrollIntoView) tr.scrollIntoView({ block: scroll ? "center" : "nearest", behavior: reduceMotion() ? "auto" : "smooth" });
  tr.classList.remove("flash"); void tr.offsetWidth; tr.classList.add("flash");
  tr.addEventListener("animationend", () => tr.classList.remove("flash"), { once: true });
}

async function load() {
  try {
    restaurants = await api.list();
  } catch (e) {
    restaurants = [];
    toast("Could not load restaurants. Check that the server is running.", true);
  }
  render();
  await loadTrash();
}

async function loadTrash() {
  try {
    trashed = await api.trash();
  } catch (e) {
    trashed = [];
  }
  renderTrash();
}

function renderTrash() {
  const trashRows = $("trashRows");
  trashRows.innerHTML = trashed.map(r => `
    <tr>
      <td class="idcell">${r.restaurant_id}</td>
      <td class="nm name">${esc(r.name)}</td>
      <td class="cu">${esc(r.cuisine)}</td>
      <td class="ad">${esc(new Date(r.deleted_at).toLocaleString())}</td>
      <td class="ac">
        <div class="row-actions">
          <button class="btn small" data-restore="${esc(r.trash_id)}" type="button">Restore</button>
          <button class="btn small danger" data-purge="${esc(r.trash_id)}" type="button">Delete permanently</button>
        </div>
      </td>
    </tr>`).join("");
  const none = trashed.length === 0;
  $("trashWrap").hidden = none;
  $("trashEmpty").hidden = !none;
  $("emptyTrashBtn").hidden = none;
  $("trashCount").textContent = `${trashed.length} deleted restaurant${trashed.length === 1 ? "" : "s"}`;
}

/* ---------- Form ---------- */
function openForm(r) {
  editingId = r ? r.restaurant_id : null;
  $("formTitle").textContent = r ? "Edit restaurant" : "Add restaurant";
  form.reset();
  clearErrors();
  if (r) for (const k of ["name", "cuisine", "address", "rating", "contact"]) form.elements[k].value = r[k];
  formDialog.showModal();
  form.elements.name.focus();
}

function clearErrors() {
  form.querySelectorAll(".err").forEach(e => (e.textContent = ""));
  form.querySelectorAll("input").forEach(i => i.classList.remove("invalid"));
}

function validate(d) {
  const errs = {};
  if (!d.name) errs.name = "Enter the restaurant's name.";
  if (!d.cuisine) errs.cuisine = "Enter the type of cuisine.";
  if (!d.address) errs.address = "Enter the address.";
  if (d.rating === "" || isNaN(d.rating) || d.rating < 0 || d.rating > 5) errs.rating = "Enter a rating from 0 to 5.";
  if (!d.contact || d.contact.length > 80) errs.contact = "Enter a phone number or how to reach the restaurant, or write Not listed.";
  return errs;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  clearErrors();
  const raw = Object.fromEntries(new FormData(form));
  const data = {
    name: raw.name.trim(),
    cuisine: raw.cuisine.trim(),
    address: raw.address.trim(),
    rating: raw.rating === "" ? "" : Number(raw.rating),
    contact: raw.contact.trim()
  };
  const errs = validate(data);
  if (Object.keys(errs).length) {
    for (const [k, msg] of Object.entries(errs)) {
      form.querySelector(`[data-for="${k}"]`).textContent = msg;
      form.elements[k].classList.add("invalid");
    }
    form.elements[Object.keys(errs)[0]].focus();
    return;
  }

  const saveBtn = $("saveBtn");
  saveBtn.disabled = true;
  try {
    const wasEditing = editingId !== null;
    const before = new Set(restaurants.map(r => r.restaurant_id));
    if (wasEditing) await api.update(editingId, data); else await api.create(data);
    formDialog.close();
    await load();
    flashRow(wasEditing ? editingId : restaurants.map(r => r.restaurant_id).find(id => !before.has(id)), !wasEditing);
    toast(wasEditing ? "Restaurant updated." : "Restaurant added.");
  } catch (err) {
    toast(err.message, true);
  } finally {
    saveBtn.disabled = false;
  }
});

/* ---------- Events ---------- */
$("addBtn").addEventListener("click", () => openForm(null));
$("cancelBtn").addEventListener("click", () => formDialog.close());
$("search").addEventListener("input", render);

rowsEl.addEventListener("click", e => {
  const editBtn = e.target.closest("[data-edit]");
  const delBtn = e.target.closest("[data-delete]");
  if (editBtn) {
    openForm(restaurants.find(r => r.restaurant_id === Number(editBtn.dataset.edit)));
  } else if (delBtn) {
    const r = restaurants.find(x => x.restaurant_id === Number(delBtn.dataset.delete));
    deletingId = r.restaurant_id;
    $("confirmText").textContent = `${r.name} will be removed from your list. This can't be undone.`;
    confirmDialog.showModal();
  }
});

$("trashRows").addEventListener("click", async e => {
  const purgeBtn = e.target.closest("[data-purge]");
  if (purgeBtn) {
    purgeTarget = purgeBtn.dataset.purge;
    const r = trashed.find(x => x.trash_id === purgeTarget);
    $("purgeText").textContent = `${r.name} will be deleted permanently. This can't be undone.`;
    $("purgeConfirmBtn").textContent = "Delete permanently";
    purgeDialog.showModal();
    return;
  }
  const btn = e.target.closest("[data-restore]");
  if (!btn) return;
  btn.disabled = true;
  try {
    const restored = await api.restore(btn.dataset.restore);
    await load();
    flashRow(restored.restaurant_id, true);
    toast(`Restaurant restored as ID ${restored.restaurant_id}.`);
  } catch (err) {
    btn.disabled = false;
    toast(err.message, true);
  }
});

$("emptyTrashBtn").addEventListener("click", () => {
  if (trashed.length === 0) return;
  purgeTarget = "all";
  $("purgeText").textContent = `All ${trashed.length} deleted restaurant${trashed.length === 1 ? "" : "s"} will be deleted permanently. This can't be undone.`;
  $("purgeConfirmBtn").textContent = "Empty trash";
  purgeDialog.showModal();
});

$("purgeCancelBtn").addEventListener("click", () => purgeDialog.close());

$("purgeConfirmBtn").addEventListener("click", async () => {
  try {
    if (purgeTarget === "all") await api.emptyTrash(); else await api.purge(purgeTarget);
    purgeDialog.close();
    await loadTrash();
    toast(purgeTarget === "all" ? "Trash emptied." : "Restaurant deleted permanently.");
  } catch (err) {
    toast(err.message, true);
  }
});

$("keepBtn").addEventListener("click", () => confirmDialog.close());
$("deleteBtn").addEventListener("click", async () => {
  try {
    await api.remove(deletingId);
    confirmDialog.close();
    const tr = rowsEl.querySelector(`tr[data-id="${deletingId}"]`);
    if (tr && !reduceMotion()) { tr.classList.add("removing"); await new Promise(res => setTimeout(res, 320)); }
    await load();
    toast("Restaurant deleted.");
  } catch (err) {
    toast(err.message, true);
  }
});

if (typeof USE_MOCK !== "undefined" && USE_MOCK) {
  $("mockNotice").hidden = false;
  $("trashSection").hidden = true;
}
load();