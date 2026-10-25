"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:4000/api";
  const TOKEN = "hostelHubAccessToken";
  const USER = "hostelHubUser";
  const $ = (id) => document.getElementById(id);
  const filter = $("dateFilter"), exportButton = $("exportReport");
  const statuses = [
    {name:"Pending", cls:"status-pending"},
    {name:"Confirmed", cls:"status-confirmed"},
    {name:"Completed", cls:"status-completed"},
    {name:"Cancelled", cls:"status-cancelled"}
  ];
  let bookings = [], totals = {hostels:0,agents:0}, chart = null, failed = false;

  async function api(path) {
    const token = sessionStorage.getItem(TOKEN);
    if (!token) { window.location.replace("admin-login.html"); throw new Error("Please sign in as an administrator."); }
    let response;
    try {
      response = await fetch(API + path, {headers:{Authorization:"Bearer " + token}});
    } catch (_) { throw new Error("Cannot reach the Hostel Hub API. Make sure the backend is running on port 4000."); }
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN); sessionStorage.removeItem(USER);
      window.location.replace("admin-login.html"); throw new Error("Your session expired. Please sign in again.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data && data.error && data.error.message || "Could not load report data.");
    return data;
  }
  function fmtDate(value) {
    const d = new Date(value);
    return isNaN(d.getTime()) ? "Unavailable" : d.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function countStatus(name) { return bookings.filter(b => b.status === name).length; }

  async function load() {
    failed = false;
    $("bookingPeriod").textContent = "Loading live data…";
    try {
      const period = filter.value || "30";
      const data = await api("/admin/reports/analytics?days=" + encodeURIComponent(period));
      totals.hostels = Number(data.totalHostels || 0);
      totals.agents = Number(data.totalAgents || 0);
      bookings = Array.isArray(data.bookings) ? data.bookings : [];
      render();
      const footer = document.querySelector(".page-footer p:last-child");
      if (footer) footer.textContent = "Live database · Figures refresh when the report period changes.";
    } catch (err) {
      failed = true;
      $("bookingPeriod").textContent = err.message;
      $("statusBreakdown").textContent = err.message;
      $("reportTableBody").innerHTML = '<tr><td colspan="3">' + escapeHtml(err.message) + "</td></tr>";
      console.error("Reports & Analytics:", err);
    }
  }
  function render() {
    if (failed) return;
    $("totalHostels").textContent = totals.hostels;
    $("totalAgents").textContent = totals.agents;
    $("totalBookings").textContent = bookings.length;
    $("completedBookings").textContent = countStatus("Completed");
    $("bookingPeriod").textContent = filter.value === "all" ? "Across all recorded dates" : "Within the last " + filter.value + " days";

    const counts = statuses.map(s => ({name:s.name,cls:s.cls,count:countStatus(s.name)}));
    $("statusBreakdown").innerHTML = "";
    $("reportTableBody").innerHTML = "";
    counts.forEach(s => {
      const pct = bookings.length ? Math.round(s.count / bookings.length * 100) : 0;
      const item = document.createElement("div");
      item.className = "status-item";
      item.innerHTML = '<div class="status-item-top"><span><span class="status-dot ' + s.cls + '"></span>' + s.name + '</span><strong>' + s.count + ' (' + pct + '%)</strong></div><div class="status-track"><div class="status-fill ' + s.cls + '" style="width:' + pct + '%"></div></div>';
      $("statusBreakdown").appendChild(item);
      const row = document.createElement("tr");
      row.innerHTML = '<td><span class="table-status"><span class="status-dot ' + s.cls + '"></span>' + s.name + '</span></td><td>' + s.count + '</td><td><div class="percentage-wrapper"><div class="percentage-track"><div class="percentage-fill ' + s.cls + '" style="width:' + pct + '%"></div></div><span>' + pct + '%</span></div></td>';
      $("reportTableBody").appendChild(row);
    });
    renderChart();
    if (window.lucide) window.lucide.createIcons();
  }
  function getBuckets() {
    const period = filter.value, now = new Date(), out = [];
    if (period === "all") {
      for (let i=11;i>=0;i--) {
        const start = new Date(now.getFullYear(),now.getMonth()-i,1);
        out.push({label:start.toLocaleDateString("en-NG",{month:"short",year:"2-digit"}),start:start,end:new Date(start.getFullYear(),start.getMonth()+1,1)});
      }
    } else {
      for (let i=Number(period)-1;i>=0;i--) {
        const start = new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate()-i);
        const end = new Date(start); end.setDate(end.getDate()+1);
        out.push({label:period==="7" ? start.toLocaleDateString("en-NG",{weekday:"short"}) : start.toLocaleDateString("en-NG",{day:"numeric",month:"short"}),start:start,end:end});
      }
    }
    return out;
  }
  function renderChart() {
    const canvas = $("bookingChart");
    if (!canvas || typeof Chart === "undefined") return;
    const buckets = getBuckets();
    const values = buckets.map(bucket => bookings.filter(b => {
      const date = new Date(b.createdAt);
      return !isNaN(date.getTime()) && date >= bucket.start && date < bucket.end;
    }).length);
    if (chart) chart.destroy();
    chart = new Chart(canvas,{type:"line",data:{labels:buckets.map(b=>b.label),datasets:[{label:"Inspection requests",data:values,borderColor:"#2563eb",backgroundColor:"rgba(37,99,235,0.10)",borderWidth:3,fill:true,tension:0.35,pointRadius:filter.value==="7"?3:0,pointHoverRadius:5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{maxRotation:0,autoSkip:true,maxTicksLimit:8}},y:{beginAtZero:true,ticks:{precision:0},grid:{color:"#edf0f5"}}}}});
  }
  function exportCsv() {
    if (failed) return;
    const rows = [["Hostel Hub - Live Inspection Report"],["Generated on",new Date().toLocaleString("en-NG")],["Selected period",filter.value==="all"?"All time":"Last "+filter.value+" days"],["Total hostels",totals.hostels],["Total agents",totals.agents],["Inspection requests",bookings.length],["Completed inspections",countStatus("Completed")],[],["Booking reference","Status","Date"]];
    bookings.forEach(b=>rows.push([b.id,b.status,fmtDate(b.createdAt)]));
    const csv = rows.map(row=>row.map(v=>'"'+String(v==null?"":v).replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
    const link = document.createElement("a"); link.href=url; link.download="hostel-hub-report-"+new Date().toISOString().slice(0,10)+".csv";
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  }
  const sidebar=$("sidebar"), toggle=$("menuToggle"), overlay=$("sidebarOverlay");
  toggle && toggle.addEventListener("click",()=>{sidebar.classList.toggle("open");overlay.classList.toggle("active");});
  overlay && overlay.addEventListener("click",()=>{sidebar.classList.remove("open");overlay.classList.remove("active");});
  filter && filter.addEventListener("change",load);
  exportButton && exportButton.addEventListener("click",exportCsv);
  load();
  if (window.lucide) window.lucide.createIcons();
});
