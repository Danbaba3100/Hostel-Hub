document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // SAMPLE BOOKING DATA
    // Demo data only. Not connected to a backend.
    // =========================================

    const bookings = [
        {
            id: "HH-BK-1001",
            student: "Adebayo Samuel",
            email: "samuel@example.com",
            phone: "08012345678",
            hostel: "Royal Court Hostel",
            location: "Oke-Baale, Osogbo",
            date: "2026-10-15",
            time: "10:00",
            status: "Pending",
            note: "Interested in a self-contained room."
        },
        {
            id: "HH-BK-1002",
            student: "Grace Adeola",
            email: "grace@example.com",
            phone: "08023456789",
            hostel: "Peace Lodge",
            location: "Alekuwodo, Osogbo",
            date: "2026-10-12",
            time: "12:30",
            status: "Confirmed",
            note: "Would like to inspect the available rooms."
        },
        {
            id: "HH-BK-1003",
            student: "Oluwaseun David",
            email: "david@example.com",
            phone: "08034567890",
            hostel: "Green View Hostel",
            location: "Lameco, Osogbo",
            date: "2026-10-08",
            time: "14:00",
            status: "Completed",
            note: "Inspection completed."
        },
        {
            id: "HH-BK-1004",
            student: "Mary Johnson",
            email: "mary@example.com",
            phone: "08045678901",
            hostel: "Sunrise Hostel",
            location: "Ogo-Oluwa, Osogbo",
            date: "2026-10-18",
            time: "09:30",
            status: "Pending",
            note: "Please confirm the inspection time."
        },
        {
            id: "HH-BK-1005",
            student: "Tunde Ibrahim",
            email: "tunde@example.com",
            phone: "08056789012",
            hostel: "Royal Court Hostel",
            location: "Oke-Baale, Osogbo",
            date: "2026-10-10",
            time: "11:00",
            status: "Cancelled",
            note: "Student cancelled the request."
        },
        {
            id: "HH-BK-1006",
            student: "Esther Peter",
            email: "esther@example.com",
            phone: "08067890123",
            hostel: "Green View Hostel",
            location: "Lameco, Osogbo",
            date: "2026-10-20",
            time: "13:00",
            status: "Confirmed",
            note: "Interested in a room close to campus."
        }
    ];

    // =========================================
    // ELEMENTS
    // =========================================

    const tableBody = document.getElementById("bookingTableBody");
    const bookingSearch = document.getElementById("bookingSearch");
    const globalSearch = document.getElementById("globalSearch");
    const statusFilter = document.getElementById("statusFilter");
    const dateFilter = document.getElementById("dateFilter");
    const emptyState = document.getElementById("emptyState");
    const resultCount = document.getElementById("resultCount");
    const bookingModal = document.getElementById("bookingModal");
    const bookingDetails = document.getElementById("bookingDetails");
    const modalActions = document.getElementById("modalActions");
    const toast = document.getElementById("toast");

    const requiredElements = [
        tableBody,
        bookingSearch,
        globalSearch,
        statusFilter,
        dateFilter,
        emptyState,
        resultCount,
        bookingModal,
        bookingDetails,
        modalActions,
        toast
    ];

    if (requiredElements.some((element) => !element)) {
        console.error(
            "Hostel Hub: A required element is missing from admin-bookings.html. Check the element IDs."
        );
        return;
    }

    let toastTimeout;
    let selectedBookingId = null;

    // =========================================
    // HELPERS
    // =========================================

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2800);
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatDate(dateString) {
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

    function formatTime(timeString) {
        const [hours, minutes] = timeString.split(":").map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);

        return date.toLocaleTimeString("en-NG", {
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function getStatusClass(status) {
        const classes = {
            Pending: "status-pending",
            Confirmed: "status-confirmed",
            Completed: "status-completed",
            Cancelled: "status-cancelled"
        };

        return classes[status] || "status-pending";
    }

    function updateStats() {
        document.getElementById("totalBookings").textContent =
            bookings.length;

        document.getElementById("pendingBookings").textContent =
            bookings.filter((booking) => booking.status === "Pending").length;

        document.getElementById("confirmedBookings").textContent =
            bookings.filter((booking) => booking.status === "Confirmed").length;

        document.getElementById("completedBookings").textContent =
            bookings.filter((booking) => booking.status === "Completed").length;
    }

    function updateDateTime() {
        const now = new Date();
        const dateElement = document.getElementById("currentDate");
        const timeElement = document.getElementById("currentTime");
        const yearElement = document.getElementById("currentYear");

        if (dateElement) {
            dateElement.textContent = now.toLocaleDateString("en-NG", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        }

        if (timeElement) {
            timeElement.textContent = now.toLocaleTimeString("en-NG", {
                hour: "2-digit",
                minute: "2-digit"
            });
        }

        if (yearElement) {
            yearElement.textContent = now.getFullYear();
        }
    }

    // =========================================
    // RENDER BOOKINGS
    // =========================================

    function renderBookings() {
        const searchTerm = bookingSearch.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedDate = dateFilter.value;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filteredBookings = bookings.filter((booking) => {
            const searchableText = [
                booking.id,
                booking.student,
                booking.email,
                booking.phone,
                booking.hostel,
                booking.location
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                booking.status === selectedStatus;

            const inspectionDate = new Date(`${booking.date}T00:00:00`);

            const matchesDate =
                selectedDate === "all" ||
                (selectedDate === "upcoming" && inspectionDate >= today) ||
                (selectedDate === "past" && inspectionDate < today);

            return matchesSearch && matchesStatus && matchesDate;
        });

        tableBody.replaceChildren();

        filteredBookings.forEach((booking) => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <span class="booking-id">${escapeHTML(booking.id)}</span>
                </td>
                <td>
                    <div class="student-cell">
                        <strong>${escapeHTML(booking.student)}</strong>
                        <small>${escapeHTML(booking.email)}</small>
                    </div>
                </td>
                <td>
                    <div class="student-cell">
                        <strong>${escapeHTML(booking.hostel)}</strong>
                        <small>${escapeHTML(booking.location)}</small>
                    </div>
                </td>
                <td>
                    <div class="student-cell">
                        <strong>${escapeHTML(formatDate(booking.date))}</strong>
                        <small>${escapeHTML(formatTime(booking.time))}</small>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${getStatusClass(booking.status)}">
                        ${escapeHTML(booking.status)}
                    </span>
                </td>
                <td>
                    <div class="row-actions">
                        <button class="action-button" type="button"
                            data-action="view"
                            data-id="${escapeHTML(booking.id)}">
                            View
                        </button>
                    </div>
                </td>
            `;

            tableBody.appendChild(row);
        });

        emptyState.hidden = filteredBookings.length > 0;

        resultCount.textContent =
            `Showing ${filteredBookings.length} of ${bookings.length} bookings`;

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // =========================================
    // BOOKING DETAILS MODAL
    // =========================================

    function openBookingDetails(bookingId) {
        const booking = bookings.find((item) => item.id === bookingId);

        if (!booking) {
            showToast("Booking could not be found.");
            return;
        }

        selectedBookingId = booking.id;

        bookingDetails.innerHTML = `
            <div class="detail-row">
                <span>Booking ID</span>
                <strong>${escapeHTML(booking.id)}</strong>
            </div>
            <div class="detail-row">
                <span>Student</span>
                <strong>${escapeHTML(booking.student)}</strong>
            </div>
            <div class="detail-row">
                <span>Email</span>
                <strong>${escapeHTML(booking.email)}</strong>
            </div>
            <div class="detail-row">
                <span>Phone</span>
                <strong>${escapeHTML(booking.phone)}</strong>
            </div>
            <div class="detail-row">
                <span>Hostel</span>
                <strong>${escapeHTML(booking.hostel)}</strong>
            </div>
            <div class="detail-row">
                <span>Location</span>
                <strong>${escapeHTML(booking.location)}</strong>
            </div>
            <div class="detail-row">
                <span>Inspection date</span>
                <strong>${escapeHTML(formatDate(booking.date))}</strong>
            </div>
            <div class="detail-row">
                <span>Inspection time</span>
                <strong>${escapeHTML(formatTime(booking.time))}</strong>
            </div>
            <div class="detail-row">
                <span>Status</span>
                <strong>
                    <span class="status-badge ${getStatusClass(booking.status)}">
                        ${escapeHTML(booking.status)}
                    </span>
                </strong>
            </div>
            <div class="detail-row">
                <span>Note</span>
                <strong>${escapeHTML(booking.note || "No note provided.")}</strong>
            </div>
        `;

        modalActions.replaceChildren();

        if (booking.status === "Pending") {
            addModalButton("Confirm booking", "confirm", "primary-button");
            addModalButton("Cancel booking", "cancel", "danger-button");
        } else if (booking.status === "Confirmed") {
            addModalButton("Mark completed", "complete", "primary-button");
            addModalButton("Cancel booking", "cancel", "danger-button");
        }

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "secondary-button";
        closeButton.textContent = "Close";
        closeButton.addEventListener("click", closeBookingModal);
        modalActions.appendChild(closeButton);

        bookingModal.hidden = false;
        document.body.style.overflow = "hidden";

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    function addModalButton(label, action, className) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = label;

        button.addEventListener("click", () => {
            updateBookingStatus(selectedBookingId, action);
        });

        modalActions.appendChild(button);
    }

    function closeBookingModal() {
        bookingModal.hidden = true;
        document.body.style.overflow = "";
        selectedBookingId = null;
    }

    // =========================================
    // UPDATE STATUS
    // =========================================

    function updateBookingStatus(bookingId, action) {
        const booking = bookings.find((item) => item.id === bookingId);

        if (!booking) {
            showToast("Booking could not be found.");
            return;
        }

        const transitions = {
            confirm: {
                from: "Pending",
                to: "Confirmed",
                message: "Booking confirmed."
            },
            complete: {
                from: "Confirmed",
                to: "Completed",
                message: "Inspection marked as completed."
            },
            cancel: {
                from: ["Pending", "Confirmed"],
                to: "Cancelled",
                message: "Booking cancelled."
            }
        };

        const transition = transitions[action];

        if (!transition) {
            return;
        }

        const allowedStatuses = Array.isArray(transition.from)
            ? transition.from
            : [transition.from];

        if (!allowedStatuses.includes(booking.status)) {
            showToast("This action is not available for the current status.");
            return;
        }

        const confirmationMessage = {
            confirm: "Confirm this inspection booking?",
            complete: "Mark this inspection as completed?",
            cancel: "Cancel this inspection booking?"
        };

        if (!window.confirm(confirmationMessage[action])) {
            return;
        }

        booking.status = transition.to;

        closeBookingModal();
        updateStats();
        renderBookings();
        showToast(transition.message);
    }

    // =========================================
    // EVENT LISTENERS
    // =========================================

    bookingSearch.addEventListener("input", renderBookings);
    statusFilter.addEventListener("change", renderBookings);
    dateFilter.addEventListener("change", renderBookings);

    tableBody.addEventListener("click", (event) => {
        const button = event.target.closest("[data-action='view']");

        if (!button) {
            return;
        }

        openBookingDetails(button.dataset.id);
    });

    document.getElementById("closeModal")
        .addEventListener("click", closeBookingModal);

    bookingModal.addEventListener("click", (event) => {
        if (event.target === bookingModal) {
            closeBookingModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !bookingModal.hidden) {
            closeBookingModal();
        }
    });

    document.getElementById("resetFilters")
        .addEventListener("click", () => {
            bookingSearch.value = "";
            globalSearch.value = "";
            statusFilter.value = "all";
            dateFilter.value = "all";
            renderBookings();
            showToast("Filters have been reset.");
        });

    document.getElementById("globalSearchForm")
        .addEventListener("submit", (event) => {
            event.preventDefault();

            bookingSearch.value = globalSearch.value.trim();
            renderBookings();
        });

    document.getElementById("notificationButton")
        .addEventListener("click", () => {
            showToast("Notifications will be connected to the backend later.");
        });

    document.getElementById("profileButton")
        .addEventListener("click", () => {
            showToast("Administrator profile settings will be added later.");
        });

    // =========================================
    // MOBILE SIDEBAR
    // =========================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    function closeSidebar() {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
        menuToggle.setAttribute("aria-expanded", "false");
    }

    function openSidebar() {
        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        menuToggle.setAttribute("aria-expanded", "true");
    }

    menuToggle.addEventListener("click", () => {
        if (sidebar.classList.contains("open")) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });

    sidebarOverlay.addEventListener("click", closeSidebar);

    document.querySelectorAll(".sidebar-nav [data-page]")
        .forEach((link) => {
            link.addEventListener("click", (event) => {
                event.preventDefault();
                showToast(
                    `${link.dataset.page} page is coming next. This dashboard is a frontend prototype.`
                );
                closeSidebar();
            });
        });

    // =========================================
    // INITIALISE
    // =========================================

    updateDateTime();
    updateStats();
    renderBookings();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("Hostel Hub Booking Management loaded.");
});
