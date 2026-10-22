document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // SAMPLE DATA
    // Replace this with API data in the future.
    // =========================================

    const hostels = [
        {
            id: "royal-court",
            name: "Royal Court Hostel",
            location: "Oke-Baale, Osogbo",
            price: 180000,
            status: "Available"
        },
        {
            id: "peace-lodge",
            name: "Peace Lodge",
            location: "Alekuwodo, Osogbo",
            price: 150000,
            status: "Under Review"
        },
        {
            id: "green-view",
            name: "Green View Hostel",
            location: "Lameco, Osogbo",
            price: 200000,
            status: "Available"
        },
        {
            id: "sunrise",
            name: "Sunrise Hostel",
            location: "Ogo-Oluwa, Osogbo",
            price: 160000,
            status: "Available"
        }
    ];

    const chartData = {
        7: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            bookings: [8, 13, 10, 16, 12, 16, 22],
            listings: [5, 7, 6, 9, 8, 8, 12],
            reports: [2, 4, 3, 5, 3, 4, 6]
        },
        30: {
            labels: ["Week 1", "Week 2", "Week 3", "Week 4", "Today"],
            bookings: [10, 15, 13, 19, 22],
            listings: [4, 7, 6, 10, 12],
            reports: [2, 3, 4, 4, 6]
        }
    };

    // =========================================
    // ELEMENTS
    // =========================================

    const tableBody = document.getElementById("hostelTableBody");
    const hostelSearch = document.getElementById("hostelSearch");
    const statusFilter = document.getElementById("statusFilter");
    const tableEmpty = document.getElementById("tableEmpty");
    const tableCount = document.getElementById("tableCount");
    const globalSearch = document.getElementById("globalSearch");

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");

    const toast = document.getElementById("toast");

    // =========================================
    // TOAST MESSAGE
    // =========================================

    let toastTimeout;

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimeout);

        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2800);
    }

    // =========================================
    // DATE AND TIME
    // =========================================

    function updateDateTime() {
        const now = new Date();

        document.getElementById("currentDate").textContent =
            now.toLocaleDateString("en-NG", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });

        document.getElementById("currentTime").textContent =
            now.toLocaleTimeString("en-NG", {
                hour: "2-digit",
                minute: "2-digit"
            });

        document.getElementById("currentYear").textContent =
            now.getFullYear();
    }

    updateDateTime();

    // =========================================
    // HOSTEL TABLE
    // =========================================

    function formatPrice(price) {
        return `₦${price.toLocaleString("en-NG")}/year`;
    }

    function getStatusClass(status) {
        if (status === "Available") {
            return "status-available";
        }

        if (status === "Under Review") {
            return "status-under-review";
        }

        return "status-rejected";
    }

    function renderHostels() {
        const searchTerm = hostelSearch.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        const filteredHostels = hostels.filter((hostel) => {
            const matchesSearch =
                hostel.name.toLowerCase().includes(searchTerm) ||
                hostel.location.toLowerCase().includes(searchTerm);

            const matchesStatus =
                selectedStatus === "all" ||
                hostel.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        tableBody.replaceChildren();

        filteredHostels.forEach((hostel) => {
            const row = document.createElement("tr");

            // Hostel name and icon
            const hostelCell = document.createElement("td");
            const hostelName = document.createElement("div");
            const hostelAvatar = document.createElement("span");
            const hostelText = document.createElement("span");

            hostelName.className = "hostel-name";
            hostelAvatar.className = "hostel-avatar";
            hostelAvatar.innerHTML = '<i data-lucide="house"></i>';
            hostelText.textContent = hostel.name;

            hostelName.append(hostelAvatar, hostelText);
            hostelCell.appendChild(hostelName);

            // Location
            const locationCell = document.createElement("td");
            locationCell.className = "location-cell";
            locationCell.textContent = hostel.location;

            // Price
            const priceCell = document.createElement("td");
            priceCell.textContent = formatPrice(hostel.price);

            // Status
            const statusCell = document.createElement("td");
            const statusBadge = document.createElement("span");

            statusBadge.className =
                `status-badge ${getStatusClass(hostel.status)}`;

            statusBadge.textContent = hostel.status;
            statusCell.appendChild(statusBadge);

            // Actions
            const actionsCell = document.createElement("td");
            const actions = document.createElement("div");
            const viewButton = document.createElement("button");
            const moreButton = document.createElement("button");

            actions.className = "row-actions";
            viewButton.className = "view-button";
            viewButton.type = "button";
            viewButton.textContent = "View";

           viewButton.addEventListener("click", () => {
    window.location.href =
        `admin-hostels.html?hostel=${encodeURIComponent(hostel.id)}`;
});

            moreButton.className = "more-button";
            moreButton.type = "button";
            moreButton.setAttribute(
                "aria-label",
                `More actions for ${hostel.name}`
            );
            moreButton.innerHTML = '<i data-lucide="more-vertical"></i>';

           moreButton.addEventListener("click", () => {
    window.location.href =
        `admin-hostels.html?hostel=${encodeURIComponent(hostel.id)}`;
});

            actions.append(viewButton, moreButton);
            actionsCell.appendChild(actions);

            row.append(
                hostelCell,
                locationCell,
                priceCell,
                statusCell,
                actionsCell
            );

            tableBody.appendChild(row);
        });

        tableEmpty.hidden = filteredHostels.length !== 0;

        tableCount.textContent =
            `Showing ${filteredHostels.length} of ${hostels.length} hostels`;

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    hostelSearch.addEventListener("input", renderHostels);
    statusFilter.addEventListener("change", renderHostels);

    document.getElementById("resetTable").addEventListener("click", () => {
        hostelSearch.value = "";
        statusFilter.value = "all";
        renderHostels();
    });

    // =========================================
    // GLOBAL SEARCH
    // =========================================

    document.getElementById("globalSearchForm")
        .addEventListener("submit", (event) => {
            event.preventDefault();

            const query = globalSearch.value.trim();

            if (!query) {
                showToast("Enter a hostel or location to search.");
                return;
            }

            hostelSearch.value = query;
            renderHostels();

            document.querySelector(".hostels-panel")
                .scrollIntoView({ behavior: "smooth", block: "start" });
        });

    // =========================================
    // CHART
    // =========================================

    const chartSvg = document.getElementById("activityChart");
    const chartLabels = document.getElementById("chartLabels");

    const chartConfig = [
        {
            key: "bookings",
            lineId: "bookingsLine",
            color: "#0b9b59"
        },
        {
            key: "listings",
            lineId: "listingsLine",
            color: "#2479e8"
        },
        {
            key: "reports",
            lineId: "reportsLine",
            color: "#9b5de5"
        }
    ];

    function renderChart(period = "7") {
        const data = chartData[period];
        const maxValue = 25;
        const width = 700;
        const top = 20;
        const bottom = 270;
        const height = bottom - top;

        chartLabels.replaceChildren();

        data.labels.forEach((label) => {
            const span = document.createElement("span");
            span.textContent = label;
            chartLabels.appendChild(span);
        });

        const pointsGroup = document.getElementById("chartPoints");
        pointsGroup.replaceChildren();

        chartConfig.forEach((series) => {
            const values = data[series.key];

            const points = values.map((value, index) => {
                const x = (index / (values.length - 1)) * width;
                const y = bottom - (value / maxValue) * height;

                return { x, y };
            });

            const line = document.getElementById(series.lineId);

            line.setAttribute(
                "points",
                points.map((point) => `${point.x},${point.y}`).join(" ")
            );

            points.forEach((point) => {
                const circle = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "circle"
                );

                circle.setAttribute("cx", point.x);
                circle.setAttribute("cy", point.y);
                circle.setAttribute("r", "4");
                circle.setAttribute("fill", series.color);
                circle.setAttribute("class", "chart-point");

                const title = document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "title"
                );

                title.textContent =
                    `${series.key}: ${values[points.indexOf(point)]}`;

                circle.appendChild(title);
                pointsGroup.appendChild(circle);
            });

            if (series.key === "bookings") {
                const area = document.getElementById("bookingsArea");
                const first = points[0];
                const last = points[points.length - 1];

                const path = [
                    `M${first.x} ${first.y}`,
                    ...points.slice(1).map((point) =>
                        `L${point.x} ${point.y}`
                    ),
                    `L${last.x} ${bottom}`,
                    `L${first.x} ${bottom}`,
                    "Z"
                ].join(" ");

                area.setAttribute("d", path);
            }
        });

        chartSvg.setAttribute(
            "aria-label",
            `Sample platform activity chart for the last ${period === "7" ? "7 days" : "30 days"}`
        );
    }

    document.getElementById("chartPeriod")
        .addEventListener("change", (event) => {
            renderChart(event.target.value);
        });

    renderChart();

    // =========================================
    // SIDEBAR ON MOBILE
    // =========================================

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

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

   




/* =========================================
   NAVIGATION PLACEHOLDERS
========================================= */

document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", (event) => {
        const page = button.dataset.page;

        // Allow existing pages to open normally
        if (
            page === "Hostel Management" ||
            page === "Agent Management" ||
            page === "Inspection Bookings" ||
            page === "Reports" ||
            page === "Settings" ||
            page === "User Management" ||
            page === "Complaints"
        ) {
            closeSidebar();
            return;
        }

        // Show a message only for unfinished pages
        event.preventDefault();

        showToast(
            `${page} page is coming next. This dashboard is a frontend prototype.`
        );

        closeSidebar();
    });
});


    // =========================================
    // TOPBAR BUTTONS
    // =========================================

    document.getElementById("notificationButton")
        .addEventListener("click", () => {
            showToast("Notifications will be connected to the backend later.");
        });

    document.getElementById("profileButton")
        .addEventListener("click", () => {
            showToast("Administrator profile settings will be added later.");
        });

    // Initial render
    renderHostels();

    if (window.lucide) {
        window.lucide.createIcons();
    }

    console.log("Hostel Hub Admin Dashboard loaded.");
});