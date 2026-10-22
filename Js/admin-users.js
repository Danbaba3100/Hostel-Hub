
// =========================================
// HOSTEL HUB - COMPLAINTS MANAGEMENT
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // ELEMENTS
    // =========================================

    const tableBody = document.getElementById("complaintsTableBody");
    const searchInput = document.getElementById("complaintSearch");
    const statusFilter = document.getElementById("statusFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const priorityFilter = document.getElementById("priorityFilter");
    const emptyState = document.getElementById("emptyState");
    const complaintCount = document.getElementById("complaintCount");

    const modal = document.getElementById("complaintModal");
    const modalTitle = document.getElementById("modalTitle");
    const complaintDetails = document.getElementById("complaintDetails");
    const closeModalButton = document.getElementById("closeModal");

    const dismissButton = document.getElementById("dismissComplaint");
    const reviewButton = document.getElementById("reviewComplaint");
    const resolveButton = document.getElementById("resolveComplaint");

    const toast = document.getElementById("toast");

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    let selectedComplaintId = null;
    let toastTimeout;
    let previousFocusedElement = null;

    // =========================================
    // SAMPLE COMPLAINT DATA
    // =========================================

    const sampleComplaints = [
        {
            id: "CMP-1001",
            subject: "Hostel room differs from advertised pictures",
            description:
                "The room shown during the initial enquiry looks different from the room presented during inspection. I would like the listing to be reviewed.",
            reportedAgainst: "Royal Gardens Hostel",
            targetType: "Hostel",
            category: "Hostel",
            reporter: "Student Visitor",
            date: "2026-10-08",
            priority: "High",
            status: "Pending"
        },
        {
            id: "CMP-1002",
            subject: "Agent requested an extra inspection fee",
            description:
                "An agent requested an additional fee that was not mentioned when the inspection was arranged. Please review the details.",
            reportedAgainst: "Sample Agent A",
            targetType: "Agent",
            category: "Payment",
            reporter: "Anonymous Visitor",
            date: "2026-10-07",
            priority: "High",
            status: "Under Review"
        },
        {
            id: "CMP-1003",
            subject: "Incorrect hostel address",
            description:
                "The address displayed on the listing appears to point to a different street. The location details may need correction.",
            reportedAgainst: "Green View Hostel",
            targetType: "Hostel",
            category: "Hostel",
            reporter: "Student Visitor",
            date: "2026-10-06",
            priority: "Medium",
            status: "Pending"
        },
        {
            id: "CMP-1004",
            subject: "Possible misleading payment request",
            description:
                "I received a payment request before I could verify the accommodation. I would like the request and listing checked.",
            reportedAgainst: "Sample Agent B",
            targetType: "Agent",
            category: "Fraud",
            reporter: "Anonymous Visitor",
            date: "2026-10-05",
            priority: "High",
            status: "Under Review"
        },
        {
            id: "CMP-1005",
            subject: "Outdated room availability",
            description:
                "The listing indicates that rooms are available, but I was informed that the rooms have already been occupied.",
            reportedAgainst: "Sunrise Student Lodge",
            targetType: "Hostel",
            category: "Hostel",
            reporter: "Student Visitor",
            date: "2026-10-04",
            priority: "Low",
            status: "Resolved"
        },
        {
            id: "CMP-1006",
            subject: "Agent did not attend scheduled inspection",
            description:
                "The inspection was scheduled, but the agent did not arrive. Please review the booking and contact details.",
            reportedAgainst: "Sample Agent C",
            targetType: "Agent",
            category: "Agent",
            reporter: "Anonymous Visitor",
            date: "2026-10-03",
            priority: "Medium",
            status: "Pending"
        },
        {
            id: "CMP-1007",
            subject: "Duplicate listing concern",
            description:
                "Two listings appear to advertise the same accommodation with different details. Please check whether both listings are valid.",
            reportedAgainst: "Unity Student Hostel",
            targetType: "Hostel",
            category: "Other",
            reporter: "Student Visitor",
            date: "2026-10-02",
            priority: "Low",
            status: "Dismissed"
        }
    ];

    let complaints = sampleComplaints.map((complaint) => ({ ...complaint }));

    // =========================================
    // TOAST NOTIFICATIONS
    // =========================================

    function showToast(message, type = "success") {
        if (!toast) return;

        clearTimeout(toastTimeout);

        toast.textContent = message;
        toast.className = `toast show ${type}`;

        toastTimeout = setTimeout(() => {
            toast.className = "toast";
        }, 3000);
    }

    // =========================================
    // SAFE HTML OUTPUT
    // =========================================

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

    // =========================================
    // DATE FORMATTING
    // =========================================

    function formatDate(dateString) {
        const date = new Date(`${dateString}T00:00:00`);

        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    // =========================================
    // BADGE CLASSES
    // =========================================

    function getStatusClass(status) {
        const classes = {
            "Pending": "status-pending",
            "Under Review": "status-review",
            "Resolved": "status-resolved",
            "Dismissed": "status-dismissed"
        };

        return classes[status] || "status-dismissed";
    }

    function getPriorityClass(priority) {
        const classes = {
            "High": "priority-high",
            "Medium": "priority-medium",
            "Low": "priority-low"
        };

        return classes[priority] || "priority-low";
    }

    // =========================================
    // STATISTICS
    // =========================================

    function updateStatistics() {
        const total = complaints.length;
        const pending = complaints.filter(
            (item) => item.status === "Pending"
        ).length;
        const underReview = complaints.filter(
            (item) => item.status === "Under Review"
        ).length;
        const resolved = complaints.filter(
            (item) => item.status === "Resolved"
        ).length;

        document.getElementById("totalComplaints").textContent = total;
        document.getElementById("pendingComplaints").textContent = pending;
        document.getElementById("reviewComplaints").textContent = underReview;
        document.getElementById("resolvedComplaints").textContent = resolved;
    }

    // =========================================
    // SEARCH AND FILTERS
    // =========================================

    function getFilteredComplaints() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedCategory = categoryFilter.value;
        const selectedPriority = priorityFilter.value;

        return complaints.filter((complaint) => {
            const searchableText = [
                complaint.id,
                complaint.subject,
                complaint.description,
                complaint.reportedAgainst,
                complaint.targetType,
                complaint.category,
                complaint.reporter,
                complaint.status,
                complaint.priority
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                complaint.status === selectedStatus;

            const matchesCategory =
                selectedCategory === "all" ||
                complaint.category === selectedCategory;

            const matchesPriority =
                selectedPriority === "all" ||
                complaint.priority === selectedPriority;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesCategory &&
                matchesPriority
            );
        });
    }

    // =========================================
    // RENDER COMPLAINTS TABLE
    // =========================================

    function renderComplaints() {
        if (!tableBody) return;

        const filteredComplaints = getFilteredComplaints();

        tableBody.innerHTML = filteredComplaints.map((complaint) => `
            <tr>
                <td>
                    <span class="complaint-id">
                        ${escapeHTML(complaint.id)}
                    </span>
                    <span class="complaint-subject">
                        ${escapeHTML(complaint.subject)}
                    </span>
                </td>

                <td>
                    <span class="reported-name">
                        ${escapeHTML(complaint.reportedAgainst)}
                    </span>
                    <span class="table-muted">
                        ${escapeHTML(complaint.targetType)}
                    </span>
                </td>

                <td>
                    <span class="category-label">
                        ${escapeHTML(complaint.category)}
                    </span>
                </td>

                <td>${escapeHTML(formatDate(complaint.date))}</td>

                <td>
                    <span class="priority-badge ${getPriorityClass(complaint.priority)}">
                        ${escapeHTML(complaint.priority)}
                    </span>
                </td>

                <td>
                    <span class="status-badge ${getStatusClass(complaint.status)}">
                        ${escapeHTML(complaint.status)}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="action-btn"
                        data-action="view"
                        data-id="${escapeHTML(complaint.id)}"
                        aria-label="View complaint ${escapeHTML(complaint.id)}"
                    >
                        <i data-lucide="eye"></i>
                        View
                    </button>
                </td>
            </tr>
        `).join("");

        if (emptyState) {
            emptyState.hidden = filteredComplaints.length !== 0;
        }

        if (complaintCount) {
            complaintCount.textContent =
                `Showing ${filteredComplaints.length} of ${complaints.length} complaints`;
        }

        updateStatistics();

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // =========================================
    // COMPLAINT DETAILS MODAL
    // =========================================

    function openComplaintModal(complaintId) {
        const complaint = complaints.find(
            (item) => item.id === complaintId
        );

        if (!complaint || !modal || !complaintDetails) return;

        selectedComplaintId = complaint.id;
        previousFocusedElement = document.activeElement;

        modalTitle.textContent = complaint.id;

        complaintDetails.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Complaint ID</label>
                    <p>${escapeHTML(complaint.id)}</p>
                </div>

                <div class="detail-item">
                    <label>Date submitted</label>
                    <p>${escapeHTML(formatDate(complaint.date))}</p>
                </div>

                <div class="detail-item full-width">
                    <label>Complaint subject</label>
                    <p>${escapeHTML(complaint.subject)}</p>
                </div>

                <div class="detail-item">
                    <label>Reported against</label>
                    <p>${escapeHTML(complaint.reportedAgainst)}</p>
                </div>

                <div class="detail-item">
                    <label>Report type</label>
                    <p>${escapeHTML(complaint.targetType)}</p>
                </div>

                <div class="detail-item">
                    <label>Category</label>
                    <p>${escapeHTML(complaint.category)}</p>
                </div>

                <div class="detail-item">
                    <label>Reporter</label>
                    <p>${escapeHTML(complaint.reporter)}</p>
                </div>

                <div class="detail-item">
                    <label>Priority</label>
                    <p>
                        <span class="priority-badge ${getPriorityClass(complaint.priority)}">
                            ${escapeHTML(complaint.priority)}
                        </span>
                    </p>
                </div>

                <div class="detail-item">
                    <label>Current status</label>
                    <p>
                        <span class="status-badge ${getStatusClass(complaint.status)}">
                            ${escapeHTML(complaint.status)}
                        </span>
                    </p>
                </div>

                <div class="detail-item full-width">
                    <label>Description</label>
                    <p class="detail-description">${escapeHTML(complaint.description)}</p>
                </div>
            </div>
        `;

        // Disable actions that would repeat the current state.
        reviewButton.disabled = complaint.status === "Under Review";
        resolveButton.disabled = complaint.status === "Resolved";
        dismissButton.disabled = complaint.status === "Dismissed";

        [dismissButton, reviewButton, resolveButton].forEach((button) => {
            button.style.opacity = button.disabled ? "0.5" : "1";
            button.style.cursor = button.disabled ? "not-allowed" : "pointer";
        });

        modal.hidden = false;
        document.body.style.overflow = "hidden";

        if (window.lucide) {
            window.lucide.createIcons();
        }

        closeModalButton?.focus();
    }

    function closeComplaintModal() {
        if (!modal) return;

        modal.hidden = true;
        document.body.style.overflow = "";
        selectedComplaintId = null;

        if (
            previousFocusedElement &&
            typeof previousFocusedElement.focus === "function"
        ) {
            previousFocusedElement.focus();
        }
    }

    if (tableBody) {
        tableBody.addEventListener("click", (event) => {
            const button = event.target.closest('[data-action="view"]');

            if (!button) return;

            openComplaintModal(button.dataset.id);
        });
    }

    closeModalButton?.addEventListener("click", closeComplaintModal);

    if (modal) {
        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeComplaintModal();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal && !modal.hidden) {
            closeComplaintModal();
        }
    });

    // =========================================
    // UPDATE COMPLAINT STATUS
    // =========================================

    function updateComplaintStatus(newStatus) {
        if (!selectedComplaintId) return;

        const complaint = complaints.find(
            (item) => item.id === selectedComplaintId
        );

        if (!complaint) return;

        if (complaint.status === newStatus) {
            showToast(`Complaint is already ${newStatus.toLowerCase()}.`);
            return;
        }

        complaint.status = newStatus;

        renderComplaints();
        closeComplaintModal();

        showToast(
            `${complaint.id} marked as ${newStatus.toLowerCase()}.`
        );
    }

    dismissButton?.addEventListener("click", () => {
        updateComplaintStatus("Dismissed");
    });

    reviewButton?.addEventListener("click", () => {
        updateComplaintStatus("Under Review");
    });

    resolveButton?.addEventListener("click", () => {
        updateComplaintStatus("Resolved");
    });

    // =========================================
    // FILTER EVENTS
    // =========================================

    searchInput?.addEventListener("input", renderComplaints);
    statusFilter?.addEventListener("change", renderComplaints);
    categoryFilter?.addEventListener("change", renderComplaints);
    priorityFilter?.addEventListener("change", renderComplaints);

    // =========================================
    // MOBILE SIDEBAR
    // =========================================

    function openSidebar() {
        sidebar?.classList.add("open");
        sidebarOverlay?.classList.add("active");
        menuToggle?.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        sidebarOverlay?.classList.remove("active");
        menuToggle?.setAttribute("aria-expanded", "false");
    }

    menuToggle?.addEventListener("click", () => {
        if (sidebar?.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarOverlay?.addEventListener("click", closeSidebar);

    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
        link.addEventListener("click", closeSidebar);
    });

    // =========================================
    // INITIALIZE PAGE
    // =========================================

    renderComplaints();

    if (window.lucide) {
        window.lucide.createIcons();
    }
});
