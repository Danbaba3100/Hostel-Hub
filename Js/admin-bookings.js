document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.HOSTEL_HUB_API_BASE || "http://localhost:4000/api";
    const TOKEN_KEY = "hostelHubAccessToken";
    const USER_KEY = "hostelHubUser";
    let bookings = [];

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
        const value = String(timeString || "");
        if (/\b(am|pm)\b/i.test(value)) return value;
        const match = value.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return value;
        const date = new Date();
        date.setHours(Number(match[1]), Number(match[2]), 0, 0);
        return date.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });
    }

    async function apiRequest(path, options = {}) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.replace("admin-login.html");
            throw new Error("Please sign in as an administrator.");
        }
        const headers = { Authorization: "Bearer " + token, ...(options.headers || {}) };
        if (options.body !== undefined) headers["Content-Type"] = "application/json";
        let response;
        try {
            response = await fetch(API_BASE + path, { ...options, headers });
        } catch {
            throw new Error("Cannot reach the Hostel Hub API. Make sure the backend is running on port 4000.");
        }
        if (response.status === 401) {
            sessionStorage.removeItem(TOKEN_KEY);
            sessionStorage.removeItem(USER_KEY);
            window.location.replace("admin-login.html");
            throw new Error("Your session expired. Please sign in again.");
        }
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error((payload && payload.error && payload.error.message) || "The request could not be completed.");
        return payload;
    }

    function normalizeBooking(item) {
        const rawStatus = String(item.status || "pending").toLowerCase();
        return {
            id: item.id,
            referenceCode: item.referenceCode || item.reference_code || item.id,
            student: item.student || item.studentName || item.student_name || "Unknown student",
            email: item.email || item.studentEmail || item.student_email || "",
            phone: item.phone || item.studentPhone || item.student_phone || "",
            hostel: item.hostel || item.hostelName || item.hostel_name || "Unknown hostel",
            location: item.location || item.hostelLocation || item.hostel_location || "",
            date: item.date || item.preferredDate || item.preferred_date || "",
            time: item.time || item.preferredTime || item.preferred_time || "",
            status: rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1),
            note: item.note || item.message || ""
        };
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

    async function updateBookingStatus(bookingId, action) {
        const booking = bookings.find((item) => item.id === bookingId);

        if (!booking) {
            showToast("Booking could not be found.");
            return;
        }

        const transitions = {
            confirm: { from: "Pending", to: "Confirmed", apiStatus: "confirmed", message: "Booking confirmed." },
            complete: { from: "Confirmed", to: "Completed", apiStatus: "completed", message: "Inspection marked as completed." },
            cancel: { from: ["Pending", "Confirmed"], to: "Cancelled", apiStatus: "cancelled", message: "Booking cancelled." }
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

        try {
            await apiRequest("/admin/inspections/" + encodeURIComponent(booking.id) + "/status", {
                method: "PATCH",
                body: JSON.stringify({ status: transition.apiStatus })
            });
            booking.status = transition.to;
            closeBookingModal();
            updateStats();
            renderBookings();
            showToast(transition.message);
        } catch (error) {
            showToast(error.message);
        }
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

    async function loadBookings() {
        try {
            const payload = await apiRequest("/admin/inspections");
            bookings = (Array.isArray(payload.bookings) ? payload.bookings : []).map(normalizeBooking);
            updateStats();
            renderBookings();
            console.log("Hostel Hub: admin inspection bookings loaded", bookings.length);
        } catch (error) {
            bookings = [];
            updateStats();
            renderBookings();
            showToast(error.message);
            console.error("Hostel Hub: could not load admin inspection bookings.", error);
        }
    }

    updateDateTime();
    if (window.lucide) window.lucide.createIcons();
    loadBookings();

    console.log("Hostel Hub Booking Management connected to the API.");
});
