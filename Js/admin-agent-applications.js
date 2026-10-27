document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const API = "https://hostel-hub-api-a4ie.onrender.com/api";
  const tokenKey = "hostelHubAccessToken";
  const userKey = "hostelHubUser";
  const el = (id) => document.getElementById(id);
  const tbody = el("applicationTableBody");
  const empty = el("applicationEmpty");
  const search = el("applicationSearch");
  const statusFilter = el("applicationStatus");
  const count = el("applicationCount");
  const summary = el("applicationSummary");
  const modal = el("reviewModal");
  const note = el("reviewNote");
  const toast = el("applicationToast");
  let applications = [];
  let selected = null;
  let toastTimer;

  async function api(path, options = {}) {
    const token = sessionStorage.getItem(tokenKey);
    if (!token) { location.replace("admin-login.html"); throw new Error("Sign in as an administrator first."); }
    let response;
    try {
      response = await fetch(API + path, { ...options, headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...(options.headers || {}) } });
    } catch { throw new Error("Cannot reach the Hostel Hub API. Make sure the backend is running on port 4000."); }
    if (response.status === 401) { sessionStorage.removeItem(tokenKey); sessionStorage.removeItem(userKey); location.replace("admin-login.html"); throw new Error("Your session expired. Sign in again."); }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || "The request could not be completed.");
    return payload;
  }

  function showToast(message) {
    toast.textContent = message; toast.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
  }
  function node(tag, className, text) {
    const n = document.createElement(tag); if (className) n.className = className; n.textContent = text || ""; return n;
  }
  function date(value) {
    const d = new Date(value); return Number.isNaN(d.getTime()) ? "Unavailable" : d.toLocaleDateString("en-NG", {day:"numeric",month:"short",year:"numeric"});
  }
  function render() {
    const term = search.value.trim().toLowerCase();
    const filter = statusFilter.value;
    const shown = applications.filter(a => (filter === "all" || a.status === filter) && [a.name,a.email,a.phone].some(v => String(v || "").toLowerCase().includes(term)));
    tbody.replaceChildren();
    shown.forEach(a => {
      const tr = document.createElement("tr");
      const person = node("td"); const strong = node("div","agent-name",a.name); const id = node("div","agent-id",a.id); person.append(strong,id);
      const contact = node("td"); contact.append(node("div","email",a.email),node("div","phone",a.phone || "Phone not provided"));
      const submitted = node("td","",date(a.submittedAt));
      const status = node("td"); const badge = node("span","status-badge " + (a.status === "approved" ? "status-active" : a.status === "pending" ? "status-pending" : "status-suspended"),a.status.charAt(0).toUpperCase()+a.status.slice(1)); status.append(badge);
      const action = node("td"); const group = node("div","action-group");
      if (a.status === "pending") { const b=node("button","approve-button","Review"); b.type="button"; b.addEventListener("click",()=>openReview(a)); group.append(b); }
      else { group.append(node("span","","Reviewed " + date(a.reviewedAt || a.submittedAt))); }
      action.append(group); tr.append(person,contact,submitted,status,action); tbody.append(tr);
    });
    empty.hidden = shown.length > 0;
    count.textContent = shown.length + " application" + (shown.length === 1 ? "" : "s");
    summary.textContent = "Showing " + shown.length + " of " + applications.length + " applications";
    if (window.lucide?.createIcons) window.lucide.createIcons();
  }
  function closeReview() { modal.hidden = true; selected = null; document.body.style.overflow = ""; }
  function openReview(application) {
    selected = application; note.value = application.note || "";
    el("reviewApplicant").textContent = application.name + " · " + application.email;
    modal.hidden = false; document.body.style.overflow = "hidden";
  }
  async function decide(status) {
    if (!selected || selected.status !== "pending") return;
    const message = status === "approved" ? "Approve this application? The agent will be able to sign in." : "Reject this application? The account will remain unable to sign in.";
    if (!confirm(message)) return;
    const buttons = [el("approveApplication"),el("rejectApplication")]; buttons.forEach(b=>b.disabled=true);
    try {
      const result = await api("/admin/agent-applications/" + encodeURIComponent(selected.id) + "/review", {method:"PATCH",body:JSON.stringify({status,note:note.value.trim()})});
      showToast(result.message || "Application reviewed.");
      closeReview(); await load();
    } catch (error) { showToast(error.message); }
    finally { buttons.forEach(b=>b.disabled=false); }
  }
  async function load() {
    tbody.replaceChildren(); summary.textContent = "Loading applications…"; count.textContent = "Loading…";
    try {
      const me = await api("/auth/me");
      if (!me.user || me.user.role !== "admin") { location.replace("admin-login.html"); return; }
      const data = await api("/admin/agent-applications");
      applications = Array.isArray(data.applications) ? data.applications : [];
      render();
    } catch (error) { showToast(error.message); count.textContent = "Unavailable"; summary.textContent = "Could not load applications."; empty.hidden = false; }
  }
  search.addEventListener("input",render); statusFilter.addEventListener("change",render);
  el("refreshApplications").addEventListener("click",load);
  el("closeReview").addEventListener("click",closeReview); el("cancelReview").addEventListener("click",closeReview);
  modal.addEventListener("click",e=>{if(e.target===modal)closeReview();});
  el("approveApplication").addEventListener("click",()=>decide("approved"));
  el("rejectApplication").addEventListener("click",()=>decide("rejected"));
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeReview();});
  const currentDate=el("currentDate"); if(currentDate)currentDate.textContent=new Date().toLocaleDateString("en-NG",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const sidebar=el("sidebar"), overlay=el("sidebarOverlay"), toggle=el("menuToggle");
  toggle?.addEventListener("click",()=>{sidebar.classList.toggle("open");overlay.classList.toggle("show");toggle.setAttribute("aria-expanded",String(sidebar.classList.contains("open")));});
  overlay?.addEventListener("click",()=>{sidebar.classList.remove("open");overlay.classList.remove("show");toggle?.setAttribute("aria-expanded","false");});
  if(window.lucide?.createIcons)window.lucide.createIcons();
  load();
});