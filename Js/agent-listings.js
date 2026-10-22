
document.addEventListener("DOMContentLoaded", () => {
  const LISTINGS_KEY = "hostelHubAgentListings";
  const INSPECTIONS_KEY = "hostelHubAgentInspections";
  const PROFILE_KEY = "hostelHubAgentProfile";

  const $ = (id) => document.getElementById(id);

  const form = $("listingForm");
  const modal = $("listingModal");
  const tableBody = $("listingsTableBody");

  let listings = [];
  let inspections = [];
  let editingId = null;
  let toastTimer = null;

  const demoListings = [
    {
      id: "listing-1",
      name: "Peace Estate Hostel",
      location: "Oke Baale, Osogbo",
      price: 250000,
      cautionFee: 20000,
      agencyFee: 15000,
      agreementFee: 10000,
      serviceCharge: 5000,
      type: "Self-contained",
      rooms: 8,
      distance: "5 minutes by bike",
      availability: "Available",
      description: "A student-friendly hostel with convenient access to local shops and transport.",
      facilities: ["Water supply", "Electricity", "Security"],
      photos: [],
      video: "",
      status: "Published",
      createdAt: "2026-09-10"
    },
    {
      id: "listing-2",
      name: "Royal Court Lodge",
      location: "Ogo-Oluwa, Osogbo",
      price: 180000,
      cautionFee: 10000,
      agencyFee: 12000,
      agreementFee: 8000,
      serviceCharge: 0,
      type: "Single room",
      rooms: 5,
      distance: "10 minutes by bike",
      availability: "Available",
      description: "A simple accommodation option with good road access.",
      facilities: ["Water supply", "Electricity", "Prepaid meter"],
      photos: [],
      video: "",
      status: "Pending Approval",
      createdAt: "2026-09-15"
    },
    {
      id: "listing-3",
      name: "Grace Villa",
      location: "Alekuwodo, Osogbo",
      price: 300000,
      cautionFee: 25000,
      agencyFee: 20000,
      agreementFee: 10000,
      serviceCharge: 5000,
      type: "One-bedroom apartment",
      rooms: 3,
      distance: "7 minutes by bike",
      availability: "Limited availability",
      description: "A one-bedroom accommodation option with a private living area.",
      facilities: ["Water supply", "Electricity", "Security", "Kitchen"],
      photos: [],
      video: "",
      status: "Inactive",
      createdAt: "2026-09-18"
    }
  ];

  // -----------------------------------------
  // Helpers
  // -----------------------------------------

  function money(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function makeId() {
    if (window.crypto?.randomUUID) {
      return `listing-${window.crypto.randomUUID()}`;
    }

    return `listing-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      $("toast").classList.remove("show");
    }, 3500);
  }

  function readArray(key, fallback) {
    try {
      const stored = localStorage.getItem(key);

      if (stored === null) {
        return fallback;
      }

      const parsed = JSON.parse(stored);

      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.error(`Could not read ${key}:`, error);
      return fallback;
    }
  }

  function saveListings() {
    try {
      localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
      return true;
    } catch (error) {
      console.error("Could not save hostel listings:", error);
      showToast("Could not save your changes in browser storage.");
      return false;
    }
  }

  function formatStatus(status) {
    return status || "Pending Approval";
  }

  function getStatusClass(status) {
    const classes = {
      "Published": "status-published",
      "Pending Approval": "status-pending",
      "Rejected": "status-rejected",
      "Inactive": "status-inactive"
    };

    return classes[formatStatus(status)] || "status-inactive";
  }

  function calculateTotalCost(listing) {
    return (
      Number(listing.price || 0) +
      Number(listing.cautionFee || 0) +
      Number(listing.agencyFee || 0) +
      Number(listing.agreementFee || 0) +
      Number(listing.serviceCharge || 0)
    );
  }

  function updateCostPreview() {
    const amount = (id) => {
      const value = Number($(id).value);
      return Number.isFinite(value) && value >= 0 ? value : 0;
    };

    const total = calculateTotalCost({
      price: amount("hostelPrice"),
      cautionFee: amount("hostelCautionFee"),
      agencyFee: amount("hostelAgencyFee"),
      agreementFee: amount("hostelAgreementFee"),
      serviceCharge: amount("hostelServiceCharge")
    });

    $("estimatedTotalCost").textContent = money(total);
  }

  // -----------------------------------------
  // Initial data
  // -----------------------------------------

  function initialiseData() {
    const savedListings = readArray(LISTINGS_KEY, null);

    if (savedListings === null) {
      listings = demoListings.map((listing) => ({ ...listing }));
      saveListings();
    } else {
      listings = savedListings;
    }

    inspections = readArray(INSPECTIONS_KEY, []);

    updateHeaderAvatar();
    updateInspectionCount();
  }

  function updateHeaderAvatar() {
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

  function updateInspectionCount() {
    const pending = inspections.filter(
      (inspection) => inspection.status === "Pending"
    ).length;

    $("inspectionNavCount").textContent = pending;
  }

  // -----------------------------------------
  // Statistics
  // -----------------------------------------

  function renderStats() {
    $("totalListings").textContent = listings.length;

    $("publishedListings").textContent = listings.filter(
      (listing) => listing.status === "Published"
    ).length;

    $("pendingListings").textContent = listings.filter(
      (listing) => listing.status === "Pending Approval"
    ).length;

    $("inactiveListings").textContent = listings.filter(
      (listing) => listing.status === "Inactive"
    ).length;
  }

  // -----------------------------------------
  // Filtering and search
  // -----------------------------------------

  function getFilteredListings() {
    const query = $("listingSearch").value.trim().toLowerCase();
    const status = $("listingStatusFilter").value;
    const type = $("listingTypeFilter").value;

    return listings.filter((listing) => {
      const name = String(listing.name || "").toLowerCase();
      const location = String(listing.location || "").toLowerCase();

      const matchesSearch =
        name.includes(query) || location.includes(query);

      const matchesStatus =
        status === "all" || formatStatus(listing.status) === status;

      const matchesType =
        type === "all" || listing.type === type;

      return matchesSearch && matchesStatus && matchesType;
    });
  }

  // -----------------------------------------
  // Render listing table
  // -----------------------------------------

  function renderListings() {
    const filtered = getFilteredListings();

    tableBody.innerHTML = filtered.map((listing) => {
      const status = formatStatus(listing.status);
      const firstPhoto = listing.photos?.[0];

      const thumbnail = firstPhoto
        ? `<div class="hostel-thumb" title="${escapeHTML(firstPhoto)}">▧</div>`
        : `<div class="hostel-thumb">⌂</div>`;

      const toggleLabel = status === "Inactive"
        ? "Reactivate listing"
        : "Deactivate listing";

      const toggleIcon = status === "Inactive" ? "↻" : "⊘";

      return `
        <tr>
          <td>
            <div class="hostel-cell">
              ${thumbnail}
              <div>
                <strong>${escapeHTML(listing.name || "Untitled hostel")}</strong>
                <small>${escapeHTML(listing.type || "Hostel")}</small>
              </div>
            </div>
          </td>

          <td class="price-cell">${money(listing.price)}</td>

          <td class="location-cell">
            ${escapeHTML(listing.location || "Not specified")}
          </td>

          <td>
            <span class="availability-text">
              ${escapeHTML(listing.availability || "Not specified")}
            </span>
          </td>

          <td>
            <span class="status-badge ${getStatusClass(status)}">
              ${escapeHTML(status)}
            </span>
          </td>

          <td>
            <div class="action-group">
              <button class="action-btn" type="button"
                data-action="edit" data-id="${escapeHTML(listing.id)}"
                title="Edit listing" aria-label="Edit listing">✎</button>

              <button class="action-btn" type="button"
                data-action="toggle" data-id="${escapeHTML(listing.id)}"
                title="${toggleLabel}" aria-label="${toggleLabel}">${toggleIcon}</button>

              <button class="action-btn danger" type="button"
                data-action="delete" data-id="${escapeHTML(listing.id)}"
                title="Delete listing" aria-label="Delete listing">×</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    const hasListings = filtered.length > 0;

    $("listingsEmpty").hidden = hasListings;
    $("tableFooterText").textContent =
      `Showing ${filtered.length} of ${listings.length} listings`;

    $("resultsCount").textContent =
      `${filtered.length} ${filtered.length === 1 ? "listing" : "listings"}`;

    if (!hasListings) {
      const hasAnyListings = listings.length > 0;

      $("emptyTitle").textContent = hasAnyListings
        ? "No matching listings"
        : "You haven't added any listings yet";

      $("emptyDescription").textContent = hasAnyListings
        ? "Try changing your search or filters to find a hostel."
        : "Add your first hostel to start managing your properties on Hostel Hub.";

      $("emptyAddListingBtn").textContent = hasAnyListings
        ? "＋ Add New Listing"
        : "＋ Add Your First Listing";
    }

    renderStats();
  }

  // -----------------------------------------
  // Modal controls
  // -----------------------------------------

  function setValue(id, value) {
    $(id).value = value ?? "";
  }

  function renderExistingFiles(listing) {
    $("selectedPhotos").innerHTML = (listing.photos || []).map((photo) => `
      <div class="selected-file">▧ ${escapeHTML(photo)}</div>
    `).join("");

    $("selectedVideo").innerHTML = listing.video
      ? `<div class="selected-file">▶ ${escapeHTML(listing.video)}</div>`
      : "";
  }

  function openModal(listing = null) {
    editingId = listing ? listing.id : null;

    form.reset();

    $("listingModalTitle").textContent = listing
      ? "Edit Hostel Listing"
      : "Add New Hostel";

    $("saveListingBtn").textContent = listing
      ? "Save Changes for Approval"
      : "Submit for Approval";

    $("selectedPhotos").innerHTML = "";
    $("selectedVideo").innerHTML = "";

    if (listing) {
      setValue("hostelName", listing.name);
      setValue("hostelType", listing.type);
      setValue("hostelRooms", listing.rooms);
      setValue("hostelLocation", listing.location);
      setValue("hostelDistance", listing.distance);
      setValue("hostelAvailability", listing.availability);
      setValue("hostelDescription", listing.description);
      setValue("hostelPrice", listing.price);
      setValue("hostelCautionFee", listing.cautionFee);
      setValue("hostelAgencyFee", listing.agencyFee);
      setValue("hostelAgreementFee", listing.agreementFee);
      setValue("hostelServiceCharge", listing.serviceCharge);

      const facilities = listing.facilities || [];

      form.querySelectorAll('input[name="facilities"]').forEach((checkbox) => {
        checkbox.checked = facilities.includes(checkbox.value);
      });

      renderExistingFiles(listing);
    }

    updateCostPreview();

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    $("closeListingModal").focus();
  }

  function closeModal() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    form.reset();
    editingId = null;

    $("selectedPhotos").innerHTML = "";
    $("selectedVideo").innerHTML = "";

    updateCostPreview();
  }

  // -----------------------------------------
  // Live total cost calculator
  // -----------------------------------------

  [
    "hostelPrice",
    "hostelCautionFee",
    "hostelAgencyFee",
    "hostelAgreementFee",
    "hostelServiceCharge"
  ].forEach((id) => {
    $(id).addEventListener("input", updateCostPreview);
  });

  // -----------------------------------------
  // Save new or edited listing
  // -----------------------------------------

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const name = $("hostelName").value.trim();
    const location = $("hostelLocation").value.trim();
    const price = Number($("hostelPrice").value);
    const rooms = Number($("hostelRooms").value);

    if (!name || !location || !Number.isFinite(price) || price < 0) {
      showToast("Enter a valid hostel name, location, and annual rent.");
      return;
    }

    if (!Number.isInteger(rooms) || rooms < 1) {
      showToast("Available rooms must be a whole number greater than zero.");
      return;
    }

    const feeIds = [
      "hostelCautionFee",
      "hostelAgencyFee",
      "hostelAgreementFee",
      "hostelServiceCharge"
    ];

    const feesValid = feeIds.every((id) => {
      const field = $(id);

      return field.value === "" ||
        (Number.isFinite(Number(field.value)) && Number(field.value) >= 0);
    });

    if (!feesValid) {
      showToast("Additional fees cannot be negative.");
      return;
    }

    const existing = editingId
      ? listings.find((item) => item.id === editingId)
      : null;

    const photoFiles = Array.from($("hostelPhotos").files || []);
    const videoFile = $("hostelVideo").files?.[0] || null;

    const listing = {
      id: existing ? existing.id : makeId(),
      name,
      location,
      price,
      cautionFee: Number($("hostelCautionFee").value) || 0,
      agencyFee: Number($("hostelAgencyFee").value) || 0,
      agreementFee: Number($("hostelAgreementFee").value) || 0,
      serviceCharge: Number($("hostelServiceCharge").value) || 0,
      type: $("hostelType").value,
      rooms,
      distance: $("hostelDistance").value.trim(),
      availability: $("hostelAvailability").value,
      description: $("hostelDescription").value.trim(),
      facilities: Array.from(
        form.querySelectorAll('input[name="facilities"]:checked')
      ).map((checkbox) => checkbox.value),
      photos: [
        ...(existing?.photos || []),
        ...photoFiles.map((file) => file.name)
      ],
      video: videoFile ? videoFile.name : existing?.video || "",
      status: "Pending Approval",
      createdAt: existing?.createdAt ||
        new Date().toISOString().slice(0, 10)
    };

    if (existing) {
      const index = listings.findIndex((item) => item.id === existing.id);
      listings[index] = listing;
    } else {
      listings.unshift(listing);
    }

    if (!saveListings()) {
      // Restore the last persisted version on a storage failure.
      listings = readArray(LISTINGS_KEY, []);
      renderListings();
      return;
    }

    closeModal();
    renderListings();

    showToast(
      existing
        ? "Changes saved. Your listing is pending admin approval."
        : "Hostel added. Your listing is pending admin approval."
    );
  });

  // -----------------------------------------
  // Edit, deactivate, reactivate, delete
  // -----------------------------------------

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;
    const listing = listings.find((item) => item.id === id);

    if (!listing) {
      showToast("Listing could not be found.");
      return;
    }

    if (action === "edit") {
      openModal(listing);
      return;
    }

    if (action === "toggle") {
      const previousStatus = listing.status;

      listing.status = previousStatus === "Inactive"
        ? "Pending Approval"
        : "Inactive";

      if (!saveListings()) {
        listing.status = previousStatus;
        return;
      }

      renderListings();

      showToast(
        listing.status === "Inactive"
          ? "Listing deactivated."
          : "Listing reactivated and sent for admin approval."
      );

      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete "${listing.name}"? This removes it from the saved listings in this browser.`
      );

      if (!confirmed) return;

      const previousListings = [...listings];

      listings = listings.filter((item) => item.id !== id);

      if (!saveListings()) {
        listings = previousListings;
        renderListings();
        return;
      }

      renderListings();
      showToast("Listing deleted.");
    }
  });

  // -----------------------------------------
  // Search and filters
  // -----------------------------------------

  $("listingSearch").addEventListener("input", renderListings);
  $("listingStatusFilter").addEventListener("change", renderListings);
  $("listingTypeFilter").addEventListener("change", renderListings);

  $("clearFiltersBtn").addEventListener("click", () => {
    $("listingSearch").value = "";
    $("listingStatusFilter").value = "all";
    $("listingTypeFilter").value = "all";

    renderListings();
  });

  // -----------------------------------------
  // Open and close modal
  // -----------------------------------------

  $("addListingBtn").addEventListener("click", () => openModal());
  $("emptyAddListingBtn").addEventListener("click", () => openModal());

  $("closeListingModal").addEventListener("click", closeModal);
  $("cancelListingBtn").addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("open")) {
      closeModal();
    }
  });

  // -----------------------------------------
  // Show selected media filenames
  // -----------------------------------------

  $("hostelPhotos").addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);

    $("selectedPhotos").innerHTML = files.map((file) => `
      <div class="selected-file">▧ ${escapeHTML(file.name)}</div>
    `).join("");

    if (files.length) {
      showToast(`${files.length} photo${files.length === 1 ? "" : "s"} selected.`);
    }
  });

  $("hostelVideo").addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    $("selectedVideo").innerHTML = file
      ? `<div class="selected-file">▶ ${escapeHTML(file.name)}</div>`
      : "";

    if (file) {
      showToast("Video selected.");
    }
  });

  // -----------------------------------------
  // Mobile sidebar
  // -----------------------------------------

  const sidebar = $("sidebar");
  const sidebarOverlay = $("sidebarOverlay");
  const menuToggle = $("menuToggle");

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }

  menuToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebarOverlay.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  // -----------------------------------------
  // Start page
  // -----------------------------------------

  initialiseData();
  renderListings();
});
