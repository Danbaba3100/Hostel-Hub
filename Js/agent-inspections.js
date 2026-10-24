
document.addEventListener("DOMContentLoaded", () => {
  const PROFILE_KEY = "hostelHubAgentProfile";
  const API_BASE = window.HOSTEL_HUB_API_BASE || "http://localhost:4000/api";
  const TOKEN_KEY = "hostelHubAccessToken";
  const USER_KEY = "hostelHubUser";

  async function apiRequest(path, options = {}) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace("login.html");
      throw new Error("Please sign in as an agent to view inspection requests.");
    }

    const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
    if (options.body !== undefined) headers["Content-Type"] = "application/json";

    let response;
    try {
      response = await fetch(API_BASE + path, { ...options, headers });
    } catch {
      throw new Error("Cannot reach the Hostel Hub API. Make sure the backend is running.");
    }

    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace("login.html");
      throw new Error("Your session expired. Please sign in again.");
    }

    const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error?.message || "Could not complete the request.");
    }
    return payload;
  }

  const $ = (id) => document.getElementById(id);

  let inspections = [];
  let toastTimer;


  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function readArray(key, fallback) {
    try {
      const saved = localStorage.getItem(key);

      if (saved === null) return fallback;

      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return fallback;
    }
  }

  function saveInspections() {
    try {
      localStorage.setItem(INSPECTIONS_KEY, JSON.stringify(inspections));
      return true;
    } catch (error) {
      console.error("Could not save inspections:", error);
      showToast("Unable to save changes in browser storage.");
      return false;
    }
  }

  function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      $("toast").classList.remove("show");
    }, 3500);
  }

  function formatDate(dateString) {
    if (!dateString) return "Not specified";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "Not specified";

    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function formatTime(timeString) {
    if (!timeString) return "Not specified";

    const parts = timeString.split(":");

    if (parts.length < 2) return escapeHTML(timeString);

    const date = new Date();
    date.setHours(Number(parts[0]), Number(parts[1]), 0, 0);

    return new Intl.DateTimeFormat("en-NG", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(date);
  }

  function getToday() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function updateAvatar() {
    try {
      const profile = JSON.parse(
        localStorage.getItem(PROFILE_KEY) || "{}"
      );

      const name = String(profile.agentFullName || "").trim();

      $("headerAvatar").textContent = name
        ? name.charAt(0).toUpperCase()
        : "A";
    } catch {
      $("headerAvatar").textContent = "A";
    }
  }

  function updateStats() {
    const today = getToday();

    $("totalRequests").textContent = inspections.length;

    $("pendingRequests").textContent = inspections.filter(
      (item) => item.status === "Pending"
    ).length;

    $("completedRequests").textContent = inspections.filter(
      (item) => item.status === "Completed"
    ).length;

    $("todayRequests").textContent = inspections.filter(
      (item) => item.preferredDate === today
    ).length;

    $("inspectionNavCount").textContent = inspections.filter(
      (item) => item.status === "Pending"
    ).length;
  }

  function getFilteredInspections() {
    const query = $("inspectionSearch").value.trim().toLowerCase();
    const status = $("inspectionStatusFilter").value;
    const dateFilter = $("inspectionDateFilter").value;
    const today = getToday();

    return inspections.filter((item) => {
      const searchableText = [
        item.studentName,
        item.hostelName,
        item.phone,
        item.email
      ].join(" ").toLowerCase();

      const matchesSearch = searchableText.includes(query);
      const matchesStatus = status === "all" || item.status === status;

      let matchesDate = true;

      if (dateFilter === "today") {
        matchesDate = item.preferredDate === today;
      } else if (dateFilter === "upcoming") {
        matchesDate =
          Boolean(item.preferredDate) &&
          item.preferredDate > today;
      } else if (dateFilter === "past") {
        matchesDate =
          Boolean(item.preferredDate) &&
          item.preferredDate < today;
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }

  function getWhatsAppNumber(phone) {
    let number = String(phone || "").replace(/\D/g, "");

    if (number.startsWith("0")) {
      number = `234${number.slice(1)}`;
    } else if (number.startsWith("234")) {
      // Already has Nigeria's country code.
    } else if (number.length === 10) {
      number = `234${number}`;
    }

    return number;
  }

  function openWhatsApp(item) {
    const number = getWhatsAppNumber(item.phone);

    if (!number || number.length < 12) {
      showToast("This student's phone number is missing or invalid.");
      return;
    }

    const message =
      `Hello ${item.studentName}, this is the agent for ${item.hostelName}. ` +
      `I received your inspection request for ${formatDate(item.preferredDate)} ` +
      `at ${formatTime(item.preferredTime)}. Let's confirm the viewing details.`;

    const url =
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function renderInspections() {
    const filtered = getFilteredInspections();

    $("inspectionList").innerHTML = filtered.map((item) => {
      const firstLetter = String(item.studentName || "S")
        .trim()
        .charAt(0)
        .toUpperCase();

      const completed = item.status === "Completed";

      return `
        <article class="inspection-card">
          <div class="inspection-main">
            <div class="student-avatar">${escapeHTML(firstLetter)}</div>

            <div class="student-info">
              <h3>${escapeHTML(item.studentName || "Student")}</h3>

              <p>
                <strong>Hostel:</strong>
                ${escapeHTML(item.hostelName || "Not specified")}
              </p>

              <p>
                <strong>Email:</strong>
                ${escapeHTML(item.email || "Not provided")}
              </p>

              <p>
                <strong>Phone:</strong>
                ${escapeHTML(item.phone || "Not provided")}
              </p>

              <p>
                <strong>Preferred date:</strong>
                ${escapeHTML(formatDate(item.preferredDate))}
              </p>

              <p>
                <strong>Preferred time:</strong>
                ${escapeHTML(formatTime(item.preferredTime))}
              </p>

              <p class="request-message">
                <strong>Message:</strong>
                ${escapeHTML(item.message || "No additional message.")}
              </p>
            </div>
          </div>

          <div class="inspection-actions">
            <span class="status-badge ${completed ? "status-completed" : "status-pending"}">
              ${completed ? "✓ Completed" : "Pending"}
            </span>

            ${
              completed
                ? `<button class="btn btn-outline" type="button"
                     data-action="reopen" data-id="${escapeHTML(item.id)}">
                     Reopen
                   </button>`
                : `<button class="btn btn-outline" type="button"
                     data-action="complete" data-id="${escapeHTML(item.id)}">
                     Mark completed
                   </button>`
            }

            <button class="btn btn-whatsapp" type="button"
              data-action="whatsapp" data-id="${escapeHTML(item.id)}">
              WhatsApp
            </button>
          </div>
        </article>
      `;
    }).join("");

    const hasResults = filtered.length > 0;

    $("emptyState").hidden = hasResults;

    $("emptyTitle").textContent = inspections.length
      ? "No matching requests"
      : "No inspection requests yet";

    $("emptyDescription").textContent = inspections.length
      ? "Try adjusting your search or filters."
      : "When students request hostel inspections, their requests will appear here.";

    $("resultsCount").textContent =
      `${filtered.length} ${filtered.length === 1 ? "request" : "requests"}`;

    $("footerText").textContent =
      `Showing ${filtered.length} of ${inspections.length} requests`;

    $("clearFiltersLink").hidden =
      !$("inspectionSearch").value &&
      $("inspectionStatusFilter").value === "all" &&
      $("inspectionDateFilter").value === "all";

    updateStats();
  }

  function clearFilters() {
    $("inspectionSearch").value = "";
    $("inspectionStatusFilter").value = "all";
    $("inspectionDateFilter").value = "all";

    renderInspections();
  }

  $("inspectionSearch").addEventListener("input", renderInspections);
  $("inspectionStatusFilter").addEventListener("change", renderInspections);
  $("inspectionDateFilter").addEventListener("change", renderInspections);

  $("clearFiltersBtn").addEventListener("click", clearFilters);
  $("clearFiltersLink").addEventListener("click", clearFilters);

  $("inspectionList").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const { action, id } = button.dataset;
    const item = inspections.find((inspection) => inspection.id === id);

    if (!item) {
      showToast("Inspection request not found.");
      return;
    }

    if (action === "whatsapp") {
      openWhatsApp(item);
      return;
    }

    const nextStatus = action === "complete" ? "completed" : "pending";
    button.disabled = true;

    try {
      const payload = await apiRequest(`/inspections/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      const updated = payload?.inspection;
      if (updated) {
        const index = inspections.findIndex((inspection) => inspection.id === id);
        if (index !== -1) inspections[index] = updated;
      }
      renderInspections();
      showToast(nextStatus === "completed"
        ? "Inspection marked as completed."
        : "Inspection moved back to pending.");
    } catch (error) {
      button.disabled = false;
      showToast(error.message || "Could not update this inspection.");
    }
  });

  // Mobile sidebar
  const sidebar = $("sidebar");
  const overlay = $("sidebarOverlay");
  const menuToggle = $("menuToggle");

  function openSidebar() {
    sidebar.classList.add("open");
    overlay.classList.add("show");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  menuToggle.addEventListener("click", () => {
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
  });

  overlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSidebar();
  });

  async function loadInspections() {
    $("inspectionList").innerHTML = "";
    $("emptyTitle").textContent = "Loading inspection requests...";
    $("emptyDescription").textContent = "Fetching real inspection requests from Hostel Hub.";
    $("emptyState").hidden = false;

    try {
      const payload = await apiRequest("/inspections/mine");
      inspections = Array.isArray(payload?.inspections) ? payload.inspections : [];
      renderInspections();
    } catch (error) {
      inspections = [];
      renderInspections();
      $("emptyTitle").textContent = "Could not load inspection requests";
      $("emptyDescription").textContent = error.message || "Please refresh and try again.";
      showToast(error.message || "Could not load inspection requests.");
    }
  }

  updateAvatar();
  loadInspections();
});
