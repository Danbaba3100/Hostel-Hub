document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    // ==========================================
    // 1. SAMPLE HOSTEL DATA
    // ==========================================

    const hostels = [
        {
            id: "royal-court",
            name: "Royal Court Hostel",
            location: "Oke-Baale",
            price: 180000,
            agent: "Demo Agent One",
            status: "Approved",
            submitted: "2026-09-20"
        },
        {
            id: "peace-lodge",
            name: "Peace Lodge",
            location: "Alekuwodo",
            price: 150000,
            agent: "Demo Agent Two",
            status: "Under Review",
            submitted: "2026-10-02"
        },
        {
            id: "green-view",
            name: "Green View Hostel",
            location: "Lameco",
            price: 200000,
            agent: "Demo Agent Three",
            status: "Approved",
            submitted: "2026-09-28"
        },
        {
            id: "sunrise",
            name: "Sunrise Hostel",
            location: "Ogo-Oluwa",
            price: 160000,
            agent: "Demo Agent Four",
            status: "Rejected",
            submitted: "2026-10-05"
        }
    ];

    // ==========================================
    // 2. GET HTML ELEMENTS
    // ==========================================

    const tableBody = document.getElementById("hostelTableBody");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const locationFilter = document.getElementById("locationFilter");
    const emptyState = document.getElementById("emptyState");
    const resultCount = document.getElementById("resultCount");

    const modal = document.getElementById("reviewModal");
    const reviewContent = document.getElementById("reviewContent");
    const reviewNote = document.getElementById("reviewNote");
    const toast = document.getElementById("toast");

    const totalElement = document.getElementById("totalCount");
    const approvedElement = document.getElementById("approvedCount");
    const pendingElement = document.getElementById("pendingCount");
    const rejectedElement = document.getElementById("rejectedCount");

    const approveButton = document.getElementById("approveButton");
    const rejectButton = document.getElementById("rejectButton");

    const clearButton = document.getElementById("clearFilters");
    const emptyClearButton = document.getElementById("emptyClear");
    const exportButton = document.getElementById("exportButton");

    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const menuToggle = document.getElementById("menuToggle");

    // Stop if essential HTML elements are missing.
    if (
        !tableBody ||
        !searchInput ||
        !statusFilter ||
        !locationFilter
    ) {
        console.error(
            "Hostel Hub: Required elements are missing. Check the IDs in admin-hostels.html."
        );
        return;
    }

    let selectedHostelId = null;
    let lastFocusedElement = null;
    let toastTimer;

    // ==========================================
    // 3. TOAST NOTIFICATIONS
    // ==========================================

    function showToast(message) {
        if (!toast) {
            console.log(message);
            return;
        }

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(function () {
            toast.classList.remove("show");
        }, 3000);
    }

    // ==========================================
    // 4. HELPER FUNCTIONS
    // ==========================================

    function formatPrice(price) {
        return "₦" + Number(price).toLocaleString("en-NG") + "/year";
    }

    function formatDate(date) {
        return new Date(date + "T12:00:00").toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function getStatusClass(status) {
        if (status === "Approved") {
            return "status-approved";
        }

        if (status === "Under Review") {
            return "status-under-review";
        }

        return "status-rejected";
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    // ==========================================
    // 5. UPDATE STATISTICS
    // ==========================================

    function updateStats() {
        const total = hostels.length;

        const approved = hostels.filter(function (hostel) {
            return hostel.status === "Approved";
        }).length;

        const pending = hostels.filter(function (hostel) {
            return hostel.status === "Under Review";
        }).length;

        const rejected = hostels.filter(function (hostel) {
            return hostel.status === "Rejected";
        }).length;

        if (totalElement) totalElement.textContent = total;
        if (approvedElement) approvedElement.textContent = approved;
        if (pendingElement) pendingElement.textContent = pending;
        if (rejectedElement) rejectedElement.textContent = rejected;
    }

    // ==========================================
    // 6. SEARCH AND FILTER
    // ==========================================

    function getFilteredHostels() {
        const query = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedLocation = locationFilter.value.trim().toLowerCase();

        return hostels.filter(function (hostel) {
            const searchableText = (
                hostel.name + " " +
                hostel.location + " " +
                hostel.agent
            ).toLowerCase();

            const matchesSearch = searchableText.includes(query);

            const matchesStatus =
                selectedStatus === "all" ||
                hostel.status.toLowerCase() === selectedStatus.toLowerCase();

            const hostelLocation = hostel.location.toLowerCase();

            const matchesLocation =
                selectedLocation === "all" ||
                hostelLocation.includes(selectedLocation) ||
                selectedLocation.includes(hostelLocation);

            return matchesSearch && matchesStatus && matchesLocation;
        });
    }

    // ==========================================
    // 7. RENDER HOSTEL TABLE
    // ==========================================

    function renderTable() {
        const filteredHostels = getFilteredHostels();

        tableBody.replaceChildren();

        filteredHostels.forEach(function (hostel) {
            const row = document.createElement("tr");

            // Hostel name and submission date
            const hostelCell = createElement("td");
            const hostelInfo = createElement("div", "hostel-cell");

            const name = createElement("strong", "", hostel.name);
            const date = createElement(
                "small",
                "",
                "Submitted " + formatDate(hostel.submitted)
            );

            hostelInfo.append(name, date);
            hostelCell.appendChild(hostelInfo);

            // Location
            const locationCell = createElement(
                "td",
                "location-cell",
                hostel.location + ", Osogbo"
            );

            // Price
            const priceCell = createElement(
                "td",
                "",
                formatPrice(hostel.price)
            );

            // Agent
            const agentCell = createElement(
                "td",
                "agent-cell",
                hostel.agent
            );

            // Status
            const statusCell = createElement("td");
            const statusBadge = createElement(
                "span",
                "status " + getStatusClass(hostel.status),
                hostel.status
            );

            statusCell.appendChild(statusBadge);

            // Review action
            const actionsCell = createElement("td");
            const actions = createElement("div", "row-actions");

            const reviewButton = createElement(
                "button",
                "view-button",
                "Review"
            );

            reviewButton.type = "button";

            reviewButton.addEventListener("click", function () {
                openReview(hostel.id);
            });

            const moreButton = createElement(
                "button",
                "more-button",
                "⋮"
            );

            moreButton.type = "button";
            moreButton.setAttribute(
                "aria-label",
                "Review " + hostel.name
            );

            moreButton.addEventListener("click", function () {
                openReview(hostel.id);
            });

            actions.append(reviewButton, moreButton);
            actionsCell.appendChild(actions);

            row.append(
                hostelCell,
                locationCell,
                priceCell,
                agentCell,
                statusCell,
                actionsCell
            );

            tableBody.appendChild(row);
        });

        if (emptyState) {
            emptyState.hidden = filteredHostels.length !== 0;
        }

        if (resultCount) {
            resultCount.textContent =
                "Showing " + filteredHostels.length +
                " of " + hostels.length + " listings";
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        console.log(
            "Hostel Hub: Displayed " +
            filteredHostels.length +
            " of " + hostels.length + " sample hostels."
        );
    }

    // ==========================================
    // 8. OPEN REVIEW MODAL
    // ==========================================

    function openReview(hostelId) {
        if (!modal || !reviewContent) {
            showToast("The review modal is missing from the HTML.");
            return;
        }

        const hostel = hostels.find(function (item) {
            return item.id === hostelId;
        });

        if (!hostel) {
            showToast("Hostel not found.");
            return;
        }

        selectedHostelId = hostelId;
        lastFocusedElement = document.activeElement;

        if (reviewNote) {
            reviewNote.value = "";
        }

        const modalTitle = document.getElementById("modalTitle");

        if (modalTitle) {
            modalTitle.textContent = hostel.name;
        }

        reviewContent.replaceChildren();

        const details = [
            ["Hostel", hostel.name],
            ["Location", hostel.location + ", Osogbo"],
            ["Annual Price", formatPrice(hostel.price)],
            ["Agent", hostel.agent],
            ["Submission Date", formatDate(hostel.submitted)],
            ["Current Status", hostel.status]
        ];

        details.forEach(function (detail) {
            const row = createElement("div", "review-row");
            const label = createElement("span", "", detail[0]);
            const value = createElement("strong", "", detail[1]);

            row.append(label, value);
            reviewContent.appendChild(row);
        });

        const canReview = hostel.status === "Under Review";

        if (approveButton) approveButton.disabled = !canReview;
        if (rejectButton) rejectButton.disabled = !canReview;

        modal.hidden = false;

        const closeButton = document.getElementById("closeModal");

        if (closeButton) {
            closeButton.focus();
        }
    }

    // ==========================================
    // 9. CLOSE REVIEW MODAL
    // ==========================================

    function closeReview() {
        if (modal) {
            modal.hidden = true;
        }

        selectedHostelId = null;

        if (
            lastFocusedElement &&
            document.contains(lastFocusedElement)
        ) {
            lastFocusedElement.focus();
        }
    }

    const closeButton = document.getElementById("closeModal");
    const cancelButton = document.getElementById("cancelReview");

    if (closeButton) {
        closeButton.addEventListener("click", closeReview);
    }

    if (cancelButton) {
        cancelButton.addEventListener("click", closeReview);
    }

    if (modal) {
        modal.addEventListener("click", function (event) {
            if (event.target === modal) {
                closeReview();
            }
        });
    }

    // ==========================================
    // 10. APPROVE OR REJECT
    // ==========================================

    function decideListing(newStatus) {
        const hostel = hostels.find(function (item) {
            return item.id === selectedHostelId;
        });

        if (!hostel) {
            showToast("Please select a hostel first.");
            return;
        }

        if (hostel.status !== "Under Review") {
            showToast("Only listings under review can be decided.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to " +
            newStatus.toLowerCase() +
            " " + hostel.name + "?"
        );

        if (!confirmed) return;

        const note = reviewNote ? reviewNote.value.trim() : "";

        // Frontend demo only. No backend is connected yet.
        hostel.status = newStatus;

        console.log("Demo review decision:", {
            hostelId: hostel.id,
            status: newStatus,
            note: note
        });

        closeReview();
        updateStats();
        renderTable();

        showToast(
            hostel.name + " marked " +
            newStatus.toLowerCase() + " in demo mode."
        );
    }

    if (approveButton) {
        approveButton.addEventListener("click", function () {
            decideListing("Approved");
        });
    }

    if (rejectButton) {
        rejectButton.addEventListener("click", function () {
            decideListing("Rejected");
        });
    }

    // ==========================================
    // 11. CLEAR FILTERS
    // ==========================================

    function clearFilters() {
        searchInput.value = "";
        statusFilter.value = "all";
        locationFilter.value = "all";

        renderTable();
    }

    if (clearButton) {
        clearButton.addEventListener("click", clearFilters);
    }

    if (emptyClearButton) {
        emptyClearButton.addEventListener("click", clearFilters);
    }

    searchInput.addEventListener("input", renderTable);
    statusFilter.addEventListener("change", renderTable);
    locationFilter.addEventListener("change", renderTable);

    // ==========================================
    // 12. EXPORT CSV
    // ==========================================

    if (exportButton) {
        exportButton.addEventListener("click", function () {
            const filteredHostels = getFilteredHostels();

            if (filteredHostels.length === 0) {
                showToast("No listings available to export.");
                return;
            }

            const columns = [
                "Hostel",
                "Location",
                "Annual Price",
                "Agent",
                "Status",
                "Submission Date"
            ];

            function escapeCSV(value) {
                let text = String(value);

                // Reduce spreadsheet formula-injection risk.
                if (/^[\s]*[=+\-@]/.test(text)) {
                    text = "'" + text;
                }

                return '"' + text.replace(/"/g, '""') + '"';
            }

            const rows = filteredHostels.map(function (hostel) {
                return [
                    hostel.name,
                    hostel.location,
                    hostel.price,
                    hostel.agent,
                    hostel.status,
                    hostel.submitted
                ];
            });

            const csvContent = [columns, ...rows]
                .map(function (row) {
                    return row.map(escapeCSV).join(",");
                })
                .join("\r\n");

            const blob = new Blob(
                ["\uFEFF" + csvContent],
                { type: "text/csv;charset=utf-8;" }
            );

            const downloadURL = URL.createObjectURL(blob);
            const downloadLink = document.createElement("a");

            downloadLink.href = downloadURL;
            downloadLink.download = "hostel-hub-listings.csv";

            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();

            setTimeout(function () {
                URL.revokeObjectURL(downloadURL);
            }, 1000);

            showToast("Listings exported successfully.");
        });
    }

    // ==========================================
    // 13. MOBILE SIDEBAR
    // ==========================================

    function closeSidebar() {
        if (sidebar) {
            sidebar.classList.remove("open");
        }

        if (sidebarOverlay) {
            sidebarOverlay.classList.remove("show");
        }

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
        }
    }

    if (menuToggle && sidebar && sidebarOverlay) {
        menuToggle.addEventListener("click", function () {
            const isOpen = sidebar.classList.toggle("open");

            sidebarOverlay.classList.toggle("show", isOpen);

            menuToggle.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        });

        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (modal && !modal.hidden) {
                closeReview();
            }

            closeSidebar();
        }
    });

    // ==========================================
    // 14. INITIALISE PAGE
    // ==========================================

    updateStats();
    renderTable();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("Hostel Hub Admin Hostel Management loaded.");
});