// Hostel Hub - persistent complaints management
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API_BASE = "https://hostel-hub-api-a4ie.onrender.com/api";
    const TOKEN_KEY = "hostelHubAccessToken";
    const USER_KEY = "hostelHubUser";
    const el = (id) => document.getElementById(id);

    const tableBody = el("complaintsTableBody");
    const searchInput = el("complaintSearch");
    const statusFilter = el("statusFilter");
    const categoryFilter = el("categoryFilter");
    const priorityFilter = el("priorityFilter");
    const emptyState = el("emptyState");
    const complaintCount = el("complaintCount");
    const modal = el("complaintModal");
    const modalTitle = el("modalTitle");
    const complaintDetails = el("complaintDetails");
    const closeModalButton = el("closeModal");
    const dismissButton = el("dismissComplaint");
    const reviewButton = el("reviewComplaint");
    const resolveButton = el("resolveComplaint");
    const toast = el("toast");
    const sidebar = el("sidebar");
    const menuToggle = el("menuToggle");
    const sidebarOverlay = el("sidebarOverlay");

    let complaints = [];
    let selectedComplaintId = null;
    let toastTimer = null;
    let previousFocusedElement = null;
    let loading = false;

    async function apiRequest(path, options = {}) {
        const token = sessionStorage.getItem(TOKEN_KEY);
        if (!token) {
            window.location.replace("admin-login.html");
            throw new Error("Please sign in as an administrator.");
        }
        let response;
        try {
            response = await fetch(API_BASE + path, {
                ...options,
                headers: {
                    Authorization: "Bearer " + token,
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            });
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
        if (!response.ok) {
            if (response.status === 403) throw new Error("Administrator access is required.");
            throw new Error(payload?.error?.message || "The complaint request could not be completed.");
        }
        return payload;
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }

    function formatDate(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime())
            ? "Unavailable"
            : date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
    }

    function showToast(message, isError = false) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.toggle("toast-error", isError);
        toast.classList.add("show");
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove("show"), 3500);
    }

    function statusClass(status) {
        return ({
            "Pending": "status-pending",
            "Under Review": "status-review",
            "Resolved": "status-resolved",
            "Dismissed": "status-dismissed"
        })[status] || "status-pending";
    }

    function priorityClass(priority) {
        return ({
            "High": "priority-high",
            "Medium": "priority-medium",
            "Low": "priority-low"
        })[priority] || "priority-medium";
    }

    function updateStatistics() {
        el("totalComplaints").textContent = complaints.length;
        el("pendingComplaints").textContent = complaints.filter((item) => item.status === "Pending").length;
        el("reviewComplaints").textContent = complaints.filter((item) => item.status === "Under Review").length;
        el("resolvedComplaints").textContent = complaints.filter((item) => item.status === "Resolved").length;
    }

    function getFilteredComplaints() {
        const term = searchInput.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;
        const selectedCategory = categoryFilter.value;
        const selectedPriority = priorityFilter.value;
        return complaints.filter((item) => {
            const text = [
                item.referenceCode, item.subject, item.description, item.reportedAgainst,
                item.targetType, item.category, item.reporter, item.reporterEmail,
                item.status, item.priority
            ].join(" ").toLowerCase();
            return text.includes(term)
                && (selectedStatus === "all" || item.status === selectedStatus)
                && (selectedCategory === "all" || item.category === selectedCategory)
                && (selectedPriority === "all" || item.priority === selectedPriority);
        });
    }

    function renderComplaints() {
        if (!tableBody) return;
        const filtered = getFilteredComplaints();
        tableBody.innerHTML = filtered.map((item) => `
            <tr>
                <td>
                    <span class="complaint-id">${escapeHTML(item.referenceCode)}</span>
                    <span class="complaint-subject">${escapeHTML(item.subject)}</span>
                </td>
                <td>
                    <span class="reported-name">${escapeHTML(item.reportedAgainst)}</span>
                    <span class="table-muted">${escapeHTML(item.targetType)}</span>
                </td>
                <td><span class="category-label">${escapeHTML(item.category)}</span></td>
                <td>${escapeHTML(formatDate(item.date))}</td>
                <td><span class="priority-badge ${priorityClass(item.priority)}">${escapeHTML(item.priority)}</span></td>
                <td><span class="status-badge ${statusClass(item.status)}">${escapeHTML(item.status)}</span></td>
                <td>
                    <button type="button" class="action-btn" data-action="view" data-id="${escapeHTML(item.id)}">
                        <i data-lucide="eye"></i> View
                    </button>
                </td>
            </tr>
        `).join("");

        if (emptyState) {
            emptyState.hidden = filtered.length !== 0;
            const heading = emptyState.querySelector("h3");
            const description = emptyState.querySelector("p");
            if (heading) heading.textContent = loading ? "Loading reports…" : "No complaints found";
            if (description) description.textContent = loading
                ? "Fetching reports from the database."
                : complaints.length ? "Try changing your search or filters." : "New reports submitted through the report form will appear here.";
        }
        if (complaintCount) {
            complaintCount.textContent = loading ? "Loading complaints…" : `Showing ${filtered.length} of ${complaints.length} complaints`;
        }
        updateStatistics();
        if (window.lucide) window.lucide.createIcons();
    }

    async function loadComplaints() {
        loading = true;
        renderComplaints();
        try {
            const payload = await apiRequest("/admin/complaints");
            complaints = Array.isArray(payload.reports) ? payload.reports : [];
            const badge = document.querySelector(".demo-badge");
            if (badge) {
                badge.textContent = "Live Database";
                badge.classList.add("live-badge");
            }
        } catch (error) {
            showToast(error.message, true);
        } finally {
            loading = false;
            renderComplaints();
        }
    }

    function openComplaintModal(id) {
        const item = complaints.find((complaint) => complaint.id === id);
        if (!item || !modal || !complaintDetails) return;
        selectedComplaintId = item.id;
        previousFocusedElement = document.activeElement;
        modalTitle.textContent = item.referenceCode;

        complaintDetails.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item"><label>Report reference</label><p>${escapeHTML(item.referenceCode)}</p></div>
                <div class="detail-item"><label>Date submitted</label><p>${escapeHTML(formatDate(item.date))}</p></div>
                <div class="detail-item full-width"><label>Subject</label><p>${escapeHTML(item.subject)}</p></div>
                <div class="detail-item"><label>Reported against</label><p>${escapeHTML(item.reportedAgainst)}</p></div>
                <div class="detail-item"><label>Report type</label><p>${escapeHTML(item.targetType)}</p></div>
                <div class="detail-item"><label>Category</label><p>${escapeHTML(item.category)}</p></div>
                <div class="detail-item"><label>Reporter</label><p>${escapeHTML(item.reporter)}</p></div>
                <div class="detail-item"><label>Reporter email</label><p>${escapeHTML(item.reporterEmail || "Not provided")}</p></div>
                <div class="detail-item"><label>Reporter phone</label><p>${escapeHTML(item.reporterPhone || "Not provided")}</p></div>
                <div class="detail-item"><label>Priority</label>
                    <select id="complaintPriority" class="modal-select" aria-label="Complaint priority">
                        <option value="High" ${item.priority === "High" ? "selected" : ""}>High</option>
                        <option value="Medium" ${item.priority === "Medium" ? "selected" : ""}>Medium</option>
                        <option value="Low" ${item.priority === "Low" ? "selected" : ""}>Low</option>
                    </select>
                </div>
                <div class="detail-item"><label>Current status</label><p><span class="status-badge ${statusClass(item.status)}">${escapeHTML(item.status)}</span></p></div>
                <div class="detail-item full-width"><label>Description</label><p class="detail-description">${escapeHTML(item.description)}</p></div>
                <div class="detail-item full-width"><label for="complaintAdminNote">Internal admin note (optional)</label>
                    <textarea id="complaintAdminNote" class="modal-note" maxlength="2000" rows="3" placeholder="Add the action taken or details for other administrators…"></textarea>
                </div>
            </div>
        `;
        const note = el("complaintAdminNote");
        if (note) note.value = item.adminNote || "";

        dismissButton.disabled = item.status === "Dismissed";
        reviewButton.disabled = item.status === "Under Review";
        resolveButton.disabled = item.status === "Resolved";
        [dismissButton, reviewButton, resolveButton].forEach((button) => {
            if (!button) return;
            button.style.opacity = button.disabled ? "0.5" : "1";
            button.style.cursor = button.disabled ? "not-allowed" : "pointer";
        });

        modal.hidden = false;
        document.body.style.overflow = "hidden";
        if (window.lucide) window.lucide.createIcons();
        closeModalButton?.focus();
    }

    function closeComplaintModal() {
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = "";
        selectedComplaintId = null;
        if (previousFocusedElement && typeof previousFocusedElement.focus === "function") previousFocusedElement.focus();
    }

    async function updateComplaintStatus(newStatus) {
        if (!selectedComplaintId) return;
        const item = complaints.find((complaint) => complaint.id === selectedComplaintId);
        if (!item) return;
        const prioritySelect = el("complaintPriority");
        const noteInput = el("complaintAdminNote");
        const statusKey = ({
            "Pending": "pending",
            "Under Review": "under_review",
            "Resolved": "resolved",
            "Dismissed": "dismissed"
        })[newStatus];
        const buttons = [dismissButton, reviewButton, resolveButton];
        buttons.forEach((button) => { if (button) button.disabled = true; });
        try {
            const payload = await apiRequest("/admin/complaints/" + encodeURIComponent(item.id) + "/status", {
                method: "PATCH",
                body: JSON.stringify({
                    status: statusKey,
                    priority: prioritySelect ? prioritySelect.value.toLowerCase() : item.priorityKey,
                    adminNote: noteInput ? noteInput.value.trim() : item.adminNote
                })
            });
            const updated = payload.report;
            complaints = complaints.map((complaint) => complaint.id === updated.id ? updated : complaint);
            renderComplaints();
            closeComplaintModal();
            showToast(payload.message || `${item.referenceCode} updated successfully.`);
        } catch (error) {
            showToast(error.message, true);
            buttons.forEach((button) => { if (button) button.disabled = false; });
        }
    }

    tableBody?.addEventListener("click", (event) => {
        const button = event.target.closest('[data-action="view"]');
        if (button) openComplaintModal(button.dataset.id);
    });
    closeModalButton?.addEventListener("click", closeComplaintModal);
    modal?.addEventListener("click", (event) => { if (event.target === modal) closeComplaintModal(); });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal && !modal.hidden) closeComplaintModal();
    });
    dismissButton?.addEventListener("click", () => updateComplaintStatus("Dismissed"));
    reviewButton?.addEventListener("click", () => updateComplaintStatus("Under Review"));
    resolveButton?.addEventListener("click", () => updateComplaintStatus("Resolved"));
    searchInput?.addEventListener("input", renderComplaints);
    statusFilter?.addEventListener("change", renderComplaints);
    categoryFilter?.addEventListener("change", renderComplaints);
    priorityFilter?.addEventListener("change", renderComplaints);

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
    menuToggle?.addEventListener("click", () => sidebar?.classList.contains("open") ? closeSidebar() : openSidebar());
    sidebarOverlay?.addEventListener("click", closeSidebar);
    document.querySelectorAll(".sidebar-nav a").forEach((link) => link.addEventListener("click", closeSidebar));

    loadComplaints();
    if (window.lucide) window.lucide.createIcons();
});
