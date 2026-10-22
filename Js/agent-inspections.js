
document.addEventListener("DOMContentLoaded", () => {
  const INSPECTIONS_KEY = "hostelHubAgentInspections";
  const PROFILE_KEY = "hostelHubAgentProfile";

  const $ = (id) => document.getElementById(id);

  let inspections = [];
  let toastTimer;

  // Sample requests are displayed only when the browser has no
  // inspection data saved yet.
  const demoInspections = [
    {
      id: "inspection-1",
      studentName: "Adebayo Samuel",
      hostelName: "Peace Estate Hostel",
      email: "samuel@example.com",
      phone: "08012345678",
      preferredDate: "2026-10-15",
      preferredTime: "10:00",
      message: "I would like to inspect an available room.",
      status: "Pending"
    },
    {
      id: "inspection-2",
      studentName: "Oluwaseun Grace",
      hostelName: "Royal Court Lodge",
      email: "grace@example.com",
      phone: "08087654321",
      preferredDate: "2026-10-17",
      preferredTime: "12:00",
      message: "Please confirm if the room is still available.",
      status: "Pending"
    }
  ];

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

  $("inspectionList").addEventListener("click", (event) => {
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

    const previousStatus = item.status;

    item.status = action === "complete" ? "Completed" : "Pending";

    if (!saveInspections()) {
      item.status = previousStatus;
      renderInspections();
      return;
    }

    renderInspections();

    showToast(
      item.status === "Completed"
        ? "Inspection marked as completed."
        : "Inspection moved back to pending."
    );
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

  // Initialise inspection data.
  // Do not overwrite an existing, even empty, saved array.
  
// Initialise inspection data.
// Use demo requests only when no saved data exists.

const saved = readArray(INSPECTIONS_KEY, null);

if (saved === null) {
  inspections = demoInspections.map((item) => ({ ...item }));
  saveInspections();
} else {
  inspections = saved;
}

updateAvatar();
renderInspections();


  updateAvatar();
  renderInspections();
});
