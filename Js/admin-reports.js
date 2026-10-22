
/* ========================================
   HOSTEL HUB - REPORTS & ANALYTICS
======================================== */

// Demonstration data.
// Replace this with Supabase data when the backend is connected.

const reportData = {
    totalHostels: 24,
    totalAgents: 12,

    bookings: [
        { id: 1, status: "Completed", daysAgo: 1 },
        { id: 2, status: "Confirmed", daysAgo: 1 },
        { id: 3, status: "Pending", daysAgo: 2 },
        { id: 4, status: "Completed", daysAgo: 3 },
        { id: 5, status: "Cancelled", daysAgo: 4 },
        { id: 6, status: "Confirmed", daysAgo: 5 },
        { id: 7, status: "Pending", daysAgo: 6 },
        { id: 8, status: "Completed", daysAgo: 8 },
        { id: 9, status: "Confirmed", daysAgo: 10 },
        { id: 10, status: "Pending", daysAgo: 12 },
        { id: 11, status: "Completed", daysAgo: 14 },
        { id: 12, status: "Cancelled", daysAgo: 16 },
        { id: 13, status: "Confirmed", daysAgo: 18 },
        { id: 14, status: "Completed", daysAgo: 20 },
        { id: 15, status: "Pending", daysAgo: 23 },
        { id: 16, status: "Confirmed", daysAgo: 26 },
        { id: 17, status: "Completed", daysAgo: 29 },
        { id: 18, status: "Pending", daysAgo: 35 },
        { id: 19, status: "Confirmed", daysAgo: 42 },
        { id: 20, status: "Completed", daysAgo: 50 },
        { id: 21, status: "Cancelled", daysAgo: 65 },
        { id: 22, status: "Pending", daysAgo: 75 },
        { id: 23, status: "Completed", daysAgo: 100 },
        { id: 24, status: "Confirmed", daysAgo: 150 }
    ]
};

const reportStatus = [
    {
        name: "Pending",
        color: "#f59e0b",
        className: "status-pending"
    },
    {
        name: "Confirmed",
        color: "#3b82f6",
        className: "status-confirmed"
    },
    {
        name: "Completed",
        color: "#22c55e",
        className: "status-completed"
    },
    {
        name: "Cancelled",
        color: "#ef4444",
        className: "status-cancelled"
    }
];

let bookingChart = null;

// ========================================
// ELEMENTS
// ========================================

const dateFilter = document.getElementById("dateFilter");
const exportButton = document.getElementById("exportReport");

const totalHostelsElement = document.getElementById("totalHostels");
const totalAgentsElement = document.getElementById("totalAgents");
const totalBookingsElement = document.getElementById("totalBookings");
const completedBookingsElement = document.getElementById("completedBookings");

const bookingPeriodElement = document.getElementById("bookingPeriod");
const statusBreakdownElement = document.getElementById("statusBreakdown");
const reportTableBody = document.getElementById("reportTableBody");

// ========================================
// DATE HELPERS
// ========================================

function getBookingDate(booking) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - booking.daysAgo);

    return date;
}

function formatDate(date) {
    return date.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getSelectedPeriod() {
    return dateFilter.value;
}

function getFilteredBookings() {
    const period = getSelectedPeriod();

    if (period === "all") {
        return [...reportData.bookings];
    }

    const days = Number(period);

    return reportData.bookings.filter((booking) => {
        return booking.daysAgo < days;
    });
}

// ========================================
// UPDATE STATISTICS
// ========================================

function updateStatistics(bookings) {
    totalHostelsElement.textContent = reportData.totalHostels;
    totalAgentsElement.textContent = reportData.totalAgents;
    totalBookingsElement.textContent = bookings.length;

    const completed = bookings.filter((booking) => {
        return booking.status === "Completed";
    }).length;

    completedBookingsElement.textContent = completed;

    const period = getSelectedPeriod();

    bookingPeriodElement.textContent =
        period === "all"
            ? "Across all recorded dates"
            : `Within the last ${period} days`;
}

// ========================================
// BOOKING STATUS BREAKDOWN
// ========================================

function renderStatusBreakdown(bookings) {
    statusBreakdownElement.innerHTML = "";

    reportStatus.forEach((status) => {
        const count = bookings.filter((booking) => {
            return booking.status === status.name;
        }).length;

        const percentage = bookings.length
            ? Math.round((count / bookings.length) * 100)
            : 0;

        const item = document.createElement("div");
        item.className = "status-item";

        const top = document.createElement("div");
        top.className = "status-item-top";

        const label = document.createElement("span");

        const dot = document.createElement("span");
        dot.className = `status-dot ${status.className}`;

        const name = document.createElement("span");
        name.textContent = status.name;

        label.append(dot, name);

        const value = document.createElement("strong");
        value.textContent = `${count} (${percentage}%)`;

        top.append(label, value);

        const track = document.createElement("div");
        track.className = "status-track";

        const fill = document.createElement("div");
        fill.className = `status-fill ${status.className}`;
        fill.style.width = `${percentage}%`;

        track.appendChild(fill);
        item.append(top, track);

        statusBreakdownElement.appendChild(item);
    });
}

// ========================================
// BOOKING SUMMARY TABLE
// ========================================

function renderReportTable(bookings) {
    reportTableBody.innerHTML = "";

    reportStatus.forEach((status) => {
        const count = bookings.filter((booking) => {
            return booking.status === status.name;
        }).length;

        const percentage = bookings.length
            ? Math.round((count / bookings.length) * 100)
            : 0;

        const row = document.createElement("tr");

        const statusCell = document.createElement("td");
        const statusLabel = document.createElement("span");
        statusLabel.className = "table-status";

        const dot = document.createElement("span");
        dot.className = `status-dot ${status.className}`;

        const name = document.createElement("span");
        name.textContent = status.name;

        statusLabel.append(dot, name);
        statusCell.appendChild(statusLabel);

        const countCell = document.createElement("td");
        countCell.textContent = count;

        const percentageCell = document.createElement("td");
        percentageCell.className = "percentage-cell";

        const wrapper = document.createElement("div");
        wrapper.className = "percentage-wrapper";

        const track = document.createElement("div");
        track.className = "percentage-track";

        const fill = document.createElement("div");
        fill.className = `percentage-fill ${status.className}`;
        fill.style.width = `${percentage}%`;

        track.appendChild(fill);

        const percentageText = document.createElement("span");
        percentageText.textContent = `${percentage}%`;

        wrapper.append(track, percentageText);
        percentageCell.appendChild(wrapper);

        row.append(statusCell, countCell, percentageCell);
        reportTableBody.appendChild(row);
    });
}

// ========================================
// BOOKING ACTIVITY CHART
// Requires Chart.js from admin-reports.html
// ========================================

function getChartBuckets() {
    const period = getSelectedPeriod();
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    if (period === "7") {
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(today);
            date.setDate(today.getDate() - (6 - index));

            return {
                key: date.toDateString(),
                label: date.toLocaleDateString("en-NG", {
                    weekday: "short"
                }),
                date
            };
        });
    }

    if (period === "30" || period === "90") {
        const days = Number(period);
        const interval = period === "30" ? 5 : 15;
        const buckets = [];

        for (let end = days - 1; end >= 0; end -= interval) {
            const startOffset = Math.max(0, end - interval + 1);

            const start = new Date(today);
            start.setDate(today.getDate() - end);

            const finish = new Date(today);
            finish.setDate(today.getDate() - startOffset);

            buckets.push({
                startOffset,
                endOffset: end,
                label: `${start.getDate()} ${start.toLocaleDateString("en-NG", {
                    month: "short"
                })}`,
                start,
                finish
            });
        }

        return buckets.reverse();
    }

    // All-time view: group bookings by month.
    const buckets = [];

    for (let offset = 11; offset >= 0; offset--) {
        const date = new Date(
            today.getFullYear(),
            today.getMonth() - offset,
            1,
            12
        );

        buckets.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString("en-NG", {
                month: "short",
                year: "2-digit"
            })
        });
    }

    return buckets;
}

function getChartData(bookings, buckets) {
    const period = getSelectedPeriod();

    return buckets.map((bucket) => {
        if (period === "7") {
            return bookings.filter((booking) => {
                return getBookingDate(booking).toDateString() === bucket.key;
            }).length;
        }

        if (period === "30" || period === "90") {
            return bookings.filter((booking) => {
                return (
                    booking.daysAgo >= bucket.startOffset &&
                    booking.daysAgo <= bucket.endOffset
                );
            }).length;
        }

        return bookings.filter((booking) => {
            const date = getBookingDate(booking);

            return (
                date.getFullYear() === bucket.year &&
                date.getMonth() === bucket.month
            );
        }).length;
    });
}

function renderBookingChart(bookings) {
    const canvas = document.getElementById("bookingChart");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Chart.js or the booking chart canvas is missing.");
        return;
    }

    const buckets = getChartBuckets();
    const labels = buckets.map((bucket) => bucket.label);
    const values = getChartData(bookings, buckets);

    if (bookingChart) {
        bookingChart.destroy();
    }

    bookingChart = new Chart(canvas, {
        type: "line",

        data: {
            labels,

            datasets: [{
                label: "Bookings",
                data: values,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.10)",
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointRadius: 3,
                pointHoverRadius: 6,
                pointBackgroundColor: "#2563eb"
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return `Bookings: ${context.parsed.y}`;
                        }
                    }
                }
            },

            scales: {
                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        precision: 0
                    },

                    grid: {
                        color: "#edf0f5"
                    }
                }
            }
        }
    });
}

// ========================================
// REFRESH REPORTS
// ========================================

function refreshReports() {
    const bookings = getFilteredBookings();

    updateStatistics(bookings);
    renderStatusBreakdown(bookings);
    renderReportTable(bookings);
    renderBookingChart(bookings);
}

// ========================================
// EXPORT REPORT AS CSV
// ========================================

function exportReportCSV() {
    const bookings = getFilteredBookings();

    const rows = [
        ["Hostel Hub - Booking Report"],
        ["Generated on", new Date().toLocaleString("en-NG")],
        ["Selected period", getSelectedPeriod() === "all"
            ? "All time"
            : `Last ${getSelectedPeriod()} days`],
        [],
        ["Booking ID", "Status", "Date"]
    ];

    bookings.forEach((booking) => {
        rows.push([
            booking.id,
            booking.status,
            formatDate(getBookingDate(booking))
        ]);
    });

    rows.push(
        [],
        ["Summary"],
        ["Total hostels", reportData.totalHostels],
        ["Total agents", reportData.totalAgents],
        ["Bookings in selected period", bookings.length],
        [
            "Completed inspections",
            bookings.filter((booking) => {
                return booking.status === "Completed";
            }).length
        ]
    );

    const csv = rows.map((row) => {
        return row.map((value) => {
            const safeValue = String(value ?? "").replace(/"/g, '""');
            return `"${safeValue}"`;
        }).join(",");
    }).join("\r\n");

    const blob = new Blob(
        ["\uFEFF" + csv],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `hostel-hub-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

// ========================================
// MOBILE SIDEBAR
// ========================================

const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function closeSidebar() {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
}

menuToggle?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
    sidebarOverlay?.classList.toggle("active");
});

sidebarOverlay?.addEventListener("click", closeSidebar);

// ========================================
// EVENT LISTENERS
// ========================================

dateFilter?.addEventListener("change", refreshReports);
exportButton?.addEventListener("click", exportReportCSV);

// ========================================
// INITIALIZE PAGE
// ========================================

document.addEventListener("DOMContentLoaded", () => {
    refreshReports();

    if (window.lucide) {
        window.lucide.createIcons();
    }
});
