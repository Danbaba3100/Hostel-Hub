
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "hostelHubAgentListings";
  const INSPECTIONS_KEY = "hostelHubAgentInspections";

  const $ = (id) => document.getElementById(id);

  const form = $("listingForm");
  const modal = $("listingModal");
  const tableBody = $("listingsTableBody");
  const emptyState = $("listingsEmpty");
  const toast = $("toast");

  let editingId = null;
  let toastTimeout = null;
  let listings = [];
  let inspections = [];

  // --------------------------------------------------
  // Demo data
  // --------------------------------------------------

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
      description:
        "A student-friendly hostel with convenient access to local shops and transport.",
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
      description:
        "A one-bedroom accommodation option with a private living area.",
      facilities: ["Water supply", "Electricity", "Security", "Kitchen"],
      photos: [],
      video: "",
      status: "Inactive",
      createdAt: "2026-09-18"
    }
  ];

  const demoInspections = [
    {
      id: "inspection-1",
      studentName: "Adebayo Samuel",
      email: "samuel@example.com",
      phone: "08012345678",
      hostelName: "Peace Estate Hostel",
      preferredDate: "2026-10-15",
      preferredTime: "10:00 AM",
      message: "I would like to inspect an available room.",
      status: "Pending"
    },
    {
      id: "inspection-2",
      studentName: "Oluwaseun Grace",
      email: "grace@example.com",
      phone: "08087654321",
      hostelName: "Royal Court Lodge",
      preferredDate: "2026-10-17",
      preferredTime: "12:00 PM",
      message: "Please confirm if the room is still available.",
      status: "Pending"
    }
  ];

  // --------------------------------------------------
  // Storage
  // --------------------------------------------------

  function readStorage(key, fallback) {
    try {
      const saved = localStorage.getItem(key);

      if (saved === null) {
        return fallback;
      }

      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.warn(`Could not read ${key} from storage.`, error);
      return fallback;
    }
  }

  function saveListings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    } catch (error) {
      console.error("Could not save listings.", error);
      showToast("Your changes could not be saved in browser storage.");
    }
  }

  function saveInspections() {
    try {
      localStorage.setItem(
        INSPECTIONS_KEY,
        JSON.stringify(inspections)
      );
    } catch (error) {
      console.error("Could not save inspections.", error);
      showToast("Inspection changes could not be saved.");
    }
  }

  function initialiseData() {
    listings = readStorage(STORAGE_KEY, null);
    inspections = readStorage(INSPECTIONS_KEY, null);

    if (listings === null) {
      listings = demoListings.map((item) => ({ ...item }));
      saveListings();
    }

    if (inspections === null || inspections.length === 0) {
      inspections = demoInspections.map((item) => ({ ...item }));
      saveInspections();
    }
  }

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  function money(amount) {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0
    }).format(Number(amount) || 0);
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

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function makeId(prefix) {
    if (
      window.crypto &&
      typeof window.crypto.randomUUID === "function"
    ) {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 9)}`;
  }

  function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }

  function formatDate(dateString) {
    if (!dateString) return "Date not selected";

    const date = new Date(`${dateString}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    return date.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function statusClass(status) {
    const classes = {
      Published: "status-published",
      "Pending Approval": "status-pending-approval",
      Rejected: "status-rejected",
      Inactive: "status-inactive"
    };

    return classes[status] || "status-inactive";
  }

  function selectedFacilities() {
    return Array.from(
      form.querySelectorAll('input[name="facilities"]:checked')
    ).map((checkbox) => checkbox.value);
  }

  function setFieldValue(id, value) {
    const field = $(id);

    if (field) {
      field.value = value ?? "";
    }
  }

  // --------------------------------------------------
  // Dashboard statistics
  // --------------------------------------------------

  function renderStats() {
    $("totalListings").textContent = listings.length;

    $("publishedListings").textContent = listings.filter(
      (item) => item.status === "Published"
    ).length;

    $("pendingListings").textContent = listings.filter(
      (item) => item.status === "Pending Approval"
    ).length;

    $("totalInspections").textContent = inspections.length;

    const pendingCount = inspections.filter(
      (item) => item.status === "Pending"
    ).length;

    $("inspectionNavCount").textContent = pendingCount;

    $("inspectionCountLabel").textContent =
      `${inspections.length} ${
        inspections.length === 1 ? "request" : "requests"
      }`;
  }

  // --------------------------------------------------
  // Listings table
  // --------------------------------------------------

  function renderListings() {
    const searchTerm = $("listingSearch").value.trim().toLowerCase();
    const statusFilter = $("listingStatusFilter").value;

    const filteredListings = listings.filter((listing) => {
      const matchesSearch =
        listing.name.toLowerCase().includes(searchTerm) ||
        listing.location.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" || listing.status === statusFilter;

      return matchesSearch && matchesStatus;
    });

    tableBody.innerHTML = filteredListings.map((listing) => {
      const firstPhoto = listing.photos?.[0];

      // This prototype stores filenames, not uploaded image data.
      const thumbnail = firstPhoto
        ? `<div class="hostel-thumb" title="${escapeHTML(firstPhoto)}">▧</div>`
        : `<div class="hostel-thumb">⌂</div>`;

      const canDeactivate = listing.status !== "Inactive";
      const toggleTitle = canDeactivate
        ? "Deactivate listing"
        : "Reactivate listing";
      const toggleIcon = canDeactivate ? "⊘" : "↻";

      return `
        <tr>
          <td>
            <div class="hostel-cell">
              ${thumbnail}
              <div>
                <strong>${escapeHTML(listing.name)}</strong>
                <small>${escapeHTML(listing.type || "Hostel")}</small>
              </div>
            </div>
          </td>
          <td class="price-cell">${money(listing.price)}</td>
          <td>${escapeHTML(listing.location)}</td>
          <td>
            <span class="status-badge ${statusClass(listing.status)}">
              ${escapeHTML(listing.status)}
            </span>
          </td>
          <td>
            <div class="action-group">
              <button class="action-btn" type="button"
                data-action="edit" data-id="${escapeHTML(listing.id)}"
                title="Edit listing"
                aria-label="Edit ${escapeHTML(listing.name)}">✎</button>

              <button class="action-btn" type="button"
                data-action="toggle" data-id="${escapeHTML(listing.id)}"
                title="${toggleTitle}" aria-label="${toggleTitle}">
                ${toggleIcon}
              </button>

              <button class="action-btn danger" type="button"
                data-action="delete" data-id="${escapeHTML(listing.id)}"
                title="Delete listing"
                aria-label="Delete ${escapeHTML(listing.name)}">×</button>
            </div>
          </td>
        </tr>
      `;
    }).join("");

    emptyState.hidden = filteredListings.length > 0;

    $("listingsTableFooter").textContent =
      `Showing ${filteredListings.length} of ${listings.length} listings`;

    renderStats();
  }

  function refreshDashboard() {
    renderListings();
    renderInspections();
    renderStats();
  }

  // --------------------------------------------------
  // Add/edit modal
  // --------------------------------------------------

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
      setFieldValue("hostelName", listing.name);
      setFieldValue("hostelLocation", listing.location);
      setFieldValue("hostelPrice", listing.price);
      setFieldValue("hostelCautionFee", listing.cautionFee);
      setFieldValue("hostelAgencyFee", listing.agencyFee);
      setFieldValue("hostelAgreementFee", listing.agreementFee);
      setFieldValue("hostelServiceCharge", listing.serviceCharge);
      setFieldValue("hostelType", listing.type);
      setFieldValue("hostelRooms", listing.rooms);
      setFieldValue("hostelDistance", listing.distance);
      setFieldValue("hostelAvailability", listing.availability);
      setFieldValue("hostelDescription", listing.description);

      const facilities = listing.facilities || [];

      form.querySelectorAll('input[name="facilities"]').forEach((checkbox) => {
        checkbox.checked = facilities.includes(checkbox.value);
      });

      displayExistingFiles(listing);
    }

    updateTotalCostPreview();

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

    updateTotalCostPreview();
  }

  function displayExistingFiles(listing) {
    const photos = listing.photos || [];

    if (photos.length) {
      $("selectedPhotos").innerHTML = photos.map((name) => `
        <div class="selected-file">
          <span>▧ ${escapeHTML(name)}</span>
        </div>
      `).join("");
    }

    if (listing.video) {
      $("selectedVideo").innerHTML = `
        <div class="selected-file">
          <span>▶ ${escapeHTML(listing.video)}</span>
        </div>
      `;
    }
  }

  // --------------------------------------------------
  // Live estimated upfront cost
  // --------------------------------------------------

  function updateTotalCostPreview() {
    const getAmount = (id) => {
      const field = $(id);

      if (!field || field.value === "") {
        return 0;
      }

      const amount = Number(field.value);

      return Number.isFinite(amount) && amount >= 0 ? amount : 0;
    };

    const listing = {
      price: getAmount("hostelPrice"),
      cautionFee: getAmount("hostelCautionFee"),
      agencyFee: getAmount("hostelAgencyFee"),
      agreementFee: getAmount("hostelAgreementFee"),
      serviceCharge: getAmount("hostelServiceCharge")
    };

    $("estimatedTotalCost").textContent =
      money(calculateTotalCost(listing));
  }

  [
    "hostelPrice",
    "hostelCautionFee",
    "hostelAgencyFee",
    "hostelAgreementFee",
    "hostelServiceCharge"
  ].forEach((id) => {
    $(id).addEventListener("input", updateTotalCostPreview);
  });

  // --------------------------------------------------
  // Save a new listing or edit an existing one
  // --------------------------------------------------

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
      showToast("Please enter a valid hostel name, location, and rent.");
      return;
    }

    if (!Number.isInteger(rooms) || rooms < 1) {
      showToast("Available rooms must be a whole number greater than zero.");
      return;
    }

    const existing = editingId
      ? listings.find((item) => item.id === editingId)
      : null;

    const photoFiles = Array.from($("hostelPhotos").files || []);
    const videoFile = $("hostelVideo").files?.[0] || null;
    const newPhotoNames = photoFiles.map((file) => file.name);

    const listing = {
      id: existing ? existing.id : makeId("listing"),
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
      facilities: selectedFacilities(),
      photos: [
        ...(existing?.photos || []),
        ...newPhotoNames
      ],
      video: videoFile
        ? videoFile.name
        : existing?.video || "",
      status: "Pending Approval",
      createdAt:
        existing?.createdAt || new Date().toISOString().slice(0, 10)
    };

    if (existing) {
      const index = listings.findIndex((item) => item.id === existing.id);
      listings[index] = listing;
    } else {
      listings.unshift(listing);
    }

    saveListings();
    closeModal();
    refreshDashboard();

    showToast(
      existing
        ? "Changes saved. Your listing is now pending admin approval."
        : "Listing added. It is now pending admin approval."
    );
  });

  // --------------------------------------------------
  // Listing actions
  // --------------------------------------------------

  tableBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;
    const listing = listings.find((item) => item.id === id);

    if (!listing) {
      showToast("That listing could not be found.");
      return;
    }

    if (action === "edit") {
      openModal(listing);
      return;
    }

    if (action === "toggle") {
      if (listing.status === "Inactive") {
        listing.status = "Pending Approval";
        showToast("Listing reactivated and sent for admin approval.");
      } else {
        listing.status = "Inactive";
        showToast("Listing deactivated.");
      }

      saveListings();
      refreshDashboard();
      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `Delete "${listing.name}"? This will remove it from this browser's saved listings.`
      );

      if (!confirmed) return;

      listings = listings.filter((item) => item.id !== id);

      saveListings();
      refreshDashboard();
      showToast("Listing deleted.");
    }
  });

  // --------------------------------------------------
  // Inspection requests
  // --------------------------------------------------

  function renderInspections() {
    const inspectionList = $("inspectionList");

    inspectionList.innerHTML = inspections.map((inspection) => {
      const initial = (inspection.studentName || "S")
        .trim()
        .charAt(0)
        .toUpperCase();

      let statusClassName = "";

      if (inspection.status === "Completed") {
        statusClassName = "completed";
      } else if (inspection.status === "Cancelled") {
        statusClassName = "cancelled";
      }

      const actionLabel = inspection.status === "Pending"
        ? "Mark completed"
        : "Mark pending";

      const safePhone = String(inspection.phone || "")
        .replace(/[^\d+]/g, "");

      return `
        <article class="inspection-card">
          <div class="inspection-main">
            <div class="student-avatar">${escapeHTML(initial)}</div>
            <div>
              <h3>${escapeHTML(inspection.studentName)}</h3>
              <p><strong>Hostel:</strong> ${escapeHTML(inspection.hostelName)}</p>
              <p><strong>Email:</strong> ${escapeHTML(inspection.email || "Not provided")}</p>
              <p><strong>Phone:</strong> ${escapeHTML(inspection.phone || "Not provided")}</p>
              <p><strong>Preferred date:</strong> ${escapeHTML(formatDate(inspection.preferredDate))}</p>
              <p><strong>Preferred time:</strong> ${escapeHTML(inspection.preferredTime || "Not specified")}</p>
              ${
                inspection.message
                  ? `<p><strong>Message:</strong> ${escapeHTML(inspection.message)}</p>`
                  : ""
              }
            </div>
          </div>

          <div class="inspection-side">
            <span class="inspection-status ${statusClassName}">
              ${escapeHTML(inspection.status)}
            </span>

            <button class="btn btn-outline" type="button"
              data-inspection-action="toggle"
              data-id="${escapeHTML(inspection.id)}">
              ${actionLabel}
            </button>

            ${
              safePhone
                ? `<button class="btn btn-primary" type="button"
                    data-inspection-action="whatsapp"
                    data-id="${escapeHTML(inspection.id)}">WhatsApp</button>`
                : ""
            }
          </div>
        </article>
      `;
    }).join("");

    $("inspectionsEmpty").hidden = inspections.length > 0;
  }

  $("inspectionList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-inspection-action]");

    if (!button) return;

    const { inspectionAction, id } = button.dataset;
    const inspection = inspections.find((item) => item.id === id);

    if (!inspection) return;

    if (inspectionAction === "toggle") {
      inspection.status = inspection.status === "Pending"
        ? "Completed"
        : "Pending";

      saveInspections();
      refreshDashboard();

      showToast(`Inspection marked ${inspection.status.toLowerCase()}.`);
      return;
    }

    if (inspectionAction === "whatsapp") {
      const phone = String(inspection.phone || "").replace(/\D/g, "");

      if (!phone) {
        showToast("This student does not have a valid phone number.");
        return;
      }

      const message = [
        `Hello ${inspection.studentName},`,
        `I am contacting you about your inspection request for ${inspection.hostelName}.`,
        `Preferred date: ${formatDate(inspection.preferredDate)}.`,
        `Preferred time: ${inspection.preferredTime || "Not specified"}.`,
        "Please let me know if you would like to confirm the inspection."
      ].join("\n");

      const whatsappUrl =
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  });

  // --------------------------------------------------
  // Search and filters
  // --------------------------------------------------

  $("listingSearch").addEventListener("input", renderListings);
  $("listingStatusFilter").addEventListener("change", renderListings);

  // --------------------------------------------------
  // Modal buttons
  // --------------------------------------------------

  $("addListingBtn").addEventListener("click", () => openModal());
  $("addListingBtnTop").addEventListener("click", () => openModal());
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

  // --------------------------------------------------
  // File selection display
  // --------------------------------------------------

  $("hostelPhotos").addEventListener("change", (event) => {
    const files = Array.from(event.target.files || []);

    $("selectedPhotos").innerHTML = files.map((file) => `
      <div class="selected-file">
        <span>▧ ${escapeHTML(file.name)}</span>
      </div>
    `).join("");

    if (files.length) {
      showToast(
        `${files.length} photo${files.length === 1 ? "" : "s"} selected.`
      );
    }
  });

  $("hostelVideo").addEventListener("change", (event) => {
    const file = event.target.files?.[0];

    $("selectedVideo").innerHTML = file
      ? `<div class="selected-file"><span>▶ ${escapeHTML(file.name)}</span></div>`
      : "";

    if (file) {
      showToast("Video selected.");
    }
  });

  // --------------------------------------------------
  // Mobile sidebar
  // --------------------------------------------------

  const sidebar = $("sidebar");
  const sidebarOverlay = $("sidebarOverlay");
  const menuToggle = $("menuToggle");

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    menuToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  menuToggle.addEventListener("click", () => {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  sidebarOverlay.addEventListener("click", closeSidebar);

  document.querySelectorAll(".nav-link[data-section]").forEach((link) => {
    link.addEventListener("click", () => {
      document.querySelectorAll(".nav-link[data-section]").forEach((item) => {
        item.classList.remove("active");
      });

      link.classList.add("active");
      closeSidebar();
    });
  });

  // --------------------------------------------------
  // Start dashboard
  // --------------------------------------------------

  initialiseData();
  refreshDashboard();
});
