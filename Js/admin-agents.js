document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API_BASE = "http://localhost:4000/api";
    const TOKEN_KEY = "hostelHubAccessToken";
    const USER_KEY = "hostelHubUser";
    let agents = [];

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
            throw new Error(payload?.error?.message || "The agent request could not be completed.");
        }
        return payload;
    }

    // =========================================
    // ELEMENTS
    // =========================================

    const getElement = (id) => document.getElementById(id);

    const tableBody = getElement("agentTableBody");
    const agentSearch = getElement("agentSearch");
    const statusFilter = getElement("statusFilter");
    const emptyState = getElement("emptyState");
    const resultCount = getElement("resultCount");
    const tableSummary = getElement("tableSummary");

    const totalAgents = getElement("totalAgents");
    const activeAgents = getElement("activeAgents");
    const pendingAgents = getElement("pendingAgents");
    const suspendedAgents = getElement("suspendedAgents");

    const sidebar = getElement("sidebar");
    const menuToggle = getElement("menuToggle");
    const sidebarOverlay = getElement("sidebarOverlay");

    const agentModal = getElement("agentModal");
    const agentDetails = getElement("agentDetails");
    const modalActions = getElement("modalActions");

    const addAgentModal = getElement("addAgentModal");
    const addAgentForm = getElement("addAgentForm");

    const toast = getElement("toast");

    // Stop early if essential page elements are missing.
    const requiredElements = [
        tableBody,
        agentSearch,
        statusFilter,
        emptyState,
        resultCount,
        tableSummary,
        totalAgents,
        activeAgents,
        pendingAgents,
        suspendedAgents,
        agentModal,
        agentDetails,
        modalActions,
        addAgentModal,
        addAgentForm,
        toast
    ];

    if (requiredElements.some((element) => !element)) {
        console.error(
            "Hostel Hub: Required elements are missing from admin-agents.html. Check the element IDs."
        );
        return;
    }

    let toastTimer = null;
    let selectedAgentId = null;

    // =========================================
    // GENERAL HELPERS
    // =========================================

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add("show");

        if (toastTimer) {
            clearTimeout(toastTimer);
        }

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2800);
    }

    function refreshIcons() {
        if (
            window.lucide &&
            typeof window.lucide.createIcons === "function"
        ) {
            window.lucide.createIcons();
        }
    }

    function getInitials(name) {
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("");
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return "Date unavailable";
        return date.toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function getStatusClass(status) {
        const statusClasses = {
            Active: "status-active",
            Pending: "status-pending",
            Suspended: "status-suspended",
            Rejected: "status-suspended"
        };

        return statusClasses[status] || "";
    }

    function createButton(label, className, onClick) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = className;
        button.textContent = label;
        button.addEventListener("click", onClick);

        return button;
    }

    function createTextElement(tag, className, text) {
        const element = document.createElement(tag);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function getAgent(agentId) {
        return agents.find((agent) => agent.id === agentId);
    }

    function showLoadError(error) {
        showToast(error.message || "Could not load agent accounts.");
        tableBody.replaceChildren();
        emptyState.hidden = false;
        tableSummary.textContent = "Agent accounts could not be loaded.";
        resultCount.textContent = "Unavailable";
        [totalAgents, activeAgents, pendingAgents, suspendedAgents].forEach((el) => {
            el.textContent = "—";
        });
    }

    // =========================================
    // DATE
    // =========================================

    const currentDate = getElement("currentDate");

    if (currentDate) {
        currentDate.textContent = new Date().toLocaleDateString(
            "en-NG",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            }
        );
    }

    // =========================================
    // STATISTICS
    // =========================================

    function updateStats() {
        totalAgents.textContent = agents.length;
        activeAgents.textContent = agents.filter((agent) => agent.status === "Active").length;
        // New accounts are active by default; this backend does not have a pending-approval state.
        pendingAgents.textContent = agents.filter((agent) => agent.status === "Pending").length;
        suspendedAgents.textContent = agents.filter((agent) => agent.status === "Suspended").length;
        const pendingNote = pendingAgents.closest(".stat-card")?.querySelector("span");
        if (pendingNote) pendingNote.textContent = "Awaiting admin review";
        const activeNote = activeAgents.closest(".stat-card")?.querySelector("span");
        if (activeNote) activeNote.textContent = "Active registered accounts";
        const suspendedNote = suspendedAgents.closest(".stat-card")?.querySelector("span");
        if (suspendedNote) suspendedNote.textContent = "Inactive registered accounts";
    }

    // =========================================
    // AGENT TABLE
    // =========================================

    function renderAgents() {
        const searchTerm = agentSearch.value.trim().toLowerCase();
        const selectedStatus = statusFilter.value;

        const filteredAgents = agents.filter((agent) => {
            const searchableValues = [
                agent.id,
                agent.name,
                agent.email,
                agent.phone,
                agent.location
            ];

            const matchesSearch = searchableValues.some((value) =>
                String(value).toLowerCase().includes(searchTerm)
            );

            const matchesStatus =
                selectedStatus === "all" ||
                agent.status === selectedStatus;

            return matchesSearch && matchesStatus;
        });

        tableBody.replaceChildren();

        filteredAgents.forEach((agent) => {
            const row = document.createElement("tr");

            // Agent identity
            const identityCell = document.createElement("td");
            const identity = document.createElement("div");
            const avatar = createTextElement(
                "div",
                "agent-avatar",
                getInitials(agent.name)
            );
            const identityText = document.createElement("div");

            const name = createTextElement(
                "div",
                "agent-name",
                agent.name
            );

            const id = createTextElement(
                "div",
                "agent-id",
                agent.id
            );

            identity.className = "agent-identity";
            identityText.append(name, id);
            identity.append(avatar, identityText);
            identityCell.appendChild(identity);

            // Contact information
            const contactCell = document.createElement("td");
            const contact = document.createElement("div");

            contact.className = "contact-info";

            contact.append(
                createTextElement("div", "email", agent.email),
                createTextElement("div", "phone", agent.phone)
            );

            contactCell.appendChild(contact);

            // Location
            const locationCell = createTextElement(
                "td",
                "",
                agent.location || "Not provided"
            );

            // Date joined
            const dateCell = createTextElement(
                "td",
                "",
                formatDate(agent.joined)
            );

            // Status
            const statusCell = document.createElement("td");
            const statusBadge = createTextElement(
                "span",
                `status-badge ${getStatusClass(agent.status)}`,
                agent.status
            );

            statusCell.appendChild(statusBadge);

            // Actions
            const actionsCell = document.createElement("td");
            const actionGroup = document.createElement("div");

            actionGroup.className = "action-group";

            actionGroup.appendChild(
                createButton("View", "view-button", () => {
                    openAgentDetails(agent.id);
                })
            );

            if (agent.status === "Pending") {
                actionGroup.appendChild(
                    createButton("Approve", "approve-button", () => {
                        approveAgent(agent.id);
                    })
                );
            } else if (agent.status === "Active") {
                actionGroup.appendChild(
                    createButton("Suspend", "suspend-button", () => {
                        suspendAgent(agent.id);
                    })
                );
            } else if (agent.status === "Suspended") {
                actionGroup.appendChild(
                    createButton(
                        "Reactivate",
                        "reactivate-button",
                        () => {
                            reactivateAgent(agent.id);
                        }
                    )
                );
            }

            actionsCell.appendChild(actionGroup);

            row.append(
                identityCell,
                contactCell,
                locationCell,
                dateCell,
                statusCell,
                actionsCell
            );

            tableBody.appendChild(row);
        });

        emptyState.hidden = filteredAgents.length > 0;

        resultCount.textContent =
            `${filteredAgents.length} agent${filteredAgents.length === 1 ? "" : "s"}`;

        tableSummary.textContent =
            `Showing ${filteredAgents.length} of ${agents.length} agents`;

        refreshIcons();
    }

    // =========================================
    // MODAL VISIBILITY
    // =========================================

    function updatePageScroll() {
        const modalOpen =
            !agentModal.hidden || !addAgentModal.hidden;

        document.body.style.overflow = modalOpen ? "hidden" : "";
    }

    function closeAgentDetails() {
        agentModal.hidden = true;
        selectedAgentId = null;
        updatePageScroll();
    }

    function closeAddAgentModal() {
        addAgentModal.hidden = true;
        updatePageScroll();
    }

    // =========================================
    // AGENT DETAILS
    // =========================================

    function openAgentDetails(agentId) {
        const agent = getAgent(agentId);

        if (!agent) {
            showToast("Agent not found.");
            return;
        }

        selectedAgentId = agent.id;

        agentDetails.replaceChildren();
        modalActions.replaceChildren();

        // Profile header
        const profile = document.createElement("div");
        const avatar = createTextElement(
            "div",
            "agent-avatar",
            getInitials(agent.name)
        );

        const profileText = document.createElement("div");

        profile.className = "details-profile";

        profileText.append(
            createTextElement("h3", "", agent.name),
            createTextElement("p", "", agent.email)
        );

        profile.append(avatar, profileText);
        agentDetails.appendChild(profile);

        // Detail rows
        const details = [
            ["Agent ID", agent.id],
            ["Phone number", agent.phone],
            ["Location", agent.location],
            ["Date joined", formatDate(agent.joined)],
            ["Account status", agent.status]
        ];

        details.forEach(([label, value]) => {
            const row = document.createElement("div");

            row.className = "detail-row";

            row.append(
                createTextElement("span", "", label),
                createTextElement("strong", "", value)
            );

            agentDetails.appendChild(row);
        });

        // Modal actions
        modalActions.appendChild(
            createButton(
                "Close",
                "secondary-button",
                closeAgentDetails
            )
        );

        if (agent.status === "Pending") {
            modalActions.appendChild(
                createButton("Approve Agent", "primary-button", () => {
                    if (approveAgent(agent.id)) {
                        openAgentDetails(agent.id);
                    }
                })
            );
        } else if (agent.status === "Active") {
            modalActions.appendChild(
                createButton("Suspend Agent", "suspend-button", () => {
                    if (suspendAgent(agent.id)) {
                        openAgentDetails(agent.id);
                    }
                })
            );
        } else {
            modalActions.appendChild(
                createButton(
                    "Reactivate Agent",
                    "primary-button",
                    () => {
                        if (reactivateAgent(agent.id)) {
                            openAgentDetails(agent.id);
                        }
                    }
                )
            );
        }

        agentModal.hidden = false;
        updatePageScroll();
        refreshIcons();
    }

    // =========================================
    // STATUS ACTIONS
    // =========================================

    async function setAgentStatus(agentId, isActive) {
        const agent = getAgent(agentId);
        if (!agent) return false;
        try {
            const payload = await apiRequest("/admin/agents/" + encodeURIComponent(agentId) + "/status", {
                method: "PATCH",
                body: JSON.stringify({ isActive })
            });
            const index = agents.findIndex((item) => item.id === agentId);
            if (index >= 0 && payload.agent) agents[index] = payload.agent;
            updateStats();
            renderAgents();
            showToast(payload.message || (isActive ? "Agent reactivated." : "Agent suspended."));
            return true;
        } catch (error) {
            showToast(error.message);
            return false;
        }
    }

    async function approveAgent(agentId) {
        window.location.assign("admin-agent-applications.html");
        return false;
    }

    async function suspendAgent(agentId) {
        const agent = getAgent(agentId);
        if (!agent || agent.status !== "Active") return false;
        if (!window.confirm(`Are you sure you want to suspend ${agent.name}?`)) return false;
        return setAgentStatus(agentId, false);
    }

    async function reactivateAgent(agentId) {
        const agent = getAgent(agentId);
        if (!agent || agent.status !== "Suspended") return false;
        return setAgentStatus(agentId, true);
    }

    // =========================================
    // SEARCH AND FILTERS
    // =========================================

    agentSearch.addEventListener("input", renderAgents);
    statusFilter.addEventListener("change", renderAgents);

    const resetFilters = getElement("resetFilters");

    if (resetFilters) {
        resetFilters.addEventListener("click", () => {
            agentSearch.value = "";
            statusFilter.value = "all";
            renderAgents();
        });
    }

    // =========================================
    // ADD AGENT MODAL
    // =========================================

    const addAgentButton = getElement("addAgentButton");
    const closeAddModalButton = getElement("closeAddModal");
    const cancelAddAgentButton = getElement("cancelAddAgent");

    if (addAgentButton) {
        addAgentButton.addEventListener("click", () => {
            addAgentForm.reset();
            addAgentModal.hidden = false;
            updatePageScroll();
            refreshIcons();
        });
    }

    if (closeAddModalButton) {
        closeAddModalButton.addEventListener(
            "click",
            closeAddAgentModal
        );
    }

    if (cancelAddAgentButton) {
        cancelAddAgentButton.addEventListener(
            "click",
            closeAddAgentModal
        );
    }

    addAgentForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = addAgentForm.querySelector('button[type="submit"]');
        const formData = new FormData(addAgentForm);
        const fullName = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "").trim().toLowerCase();
        const phone = String(formData.get("phone") || "").trim();
        if (submitButton) submitButton.disabled = true;
        try {
            const payload = await apiRequest("/admin/agents/invitations", {
                method: "POST",
                body: JSON.stringify({ fullName, email, ...(phone ? { phone } : {}) })
            });
            closeAddAgentModal();
            addAgentForm.reset();
            showToast("Invitation created. Copy the private link from the next prompt.");
            window.prompt("Share this one-time agent invitation link privately. It expires in 48 hours:", payload.invitation.invitationUrl);
        } catch (error) {
            showToast(error.message || "Could not create the agent invitation.");
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });

    // =========================================
    // CLOSE BUTTONS AND OVERLAYS
    // =========================================

    const closeModalButton = getElement("closeModal");

    if (closeModalButton) {
        closeModalButton.addEventListener(
            "click",
            closeAgentDetails
        );
    }

    agentModal.addEventListener("click", (event) => {
        if (event.target === agentModal) {
            closeAgentDetails();
        }
    });

    addAgentModal.addEventListener("click", (event) => {
        if (event.target === addAgentModal) {
            closeAddAgentModal();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeAgentDetails();
            closeAddAgentModal();
            closeSidebar();
        }
    });

    // =========================================
    // MOBILE SIDEBAR
    // =========================================

    function openSidebar() {
        if (!sidebar || !sidebarOverlay || !menuToggle) {
            return;
        }

        sidebar.classList.add("open");
        sidebarOverlay.classList.add("show");
        menuToggle.setAttribute("aria-expanded", "true");
    }

    function closeSidebar() {
        if (!sidebar || !sidebarOverlay || !menuToggle) {
            return;
        }

        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("show");
        menuToggle.setAttribute("aria-expanded", "false");
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            if (sidebar && sidebar.classList.contains("open")) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    // =========================================
    // NOTIFICATIONS
    // =========================================

    const notificationButton = getElement("notificationButton");

    if (notificationButton) {
        notificationButton.addEventListener("click", () => {
            const suspendedCount = agents.filter((agent) => agent.status === "Suspended").length;
            showToast(`${agents.length} registered agents; ${suspendedCount} suspended account(s).`);
        });
    }

    // =========================================
    // INITIAL LOAD FROM THE LIVE DATABASE
    // =========================================

    async function start() {
        try {
            const me = await apiRequest("/auth/me");
            if (!me.user || me.user.role !== "admin") {
                sessionStorage.removeItem(TOKEN_KEY);
                sessionStorage.removeItem(USER_KEY);
                window.location.replace("admin-login.html");
                return;
            }
            const result = await apiRequest("/admin/agents");
            agents = Array.isArray(result.agents) ? result.agents : [];
            updateStats();
            renderAgents();
            const prototypeNote = document.querySelector(".prototype-note");
            if (prototypeNote) prototypeNote.textContent = "Live database · Agent accounts";
            const addModal = getElement("addAgentModal");
            if (addModal) addModal.hidden = true;
            if (addAgentButton) addAgentButton.setAttribute("aria-label", "Create a secure agent invitation");
            refreshIcons();
        } catch (error) {
            showLoadError(error);
        }
    }

    [totalAgents, activeAgents, pendingAgents, suspendedAgents].forEach((el) => { el.textContent = "…"; });
    tableSummary.textContent = "Loading agent accounts…";
    start();
    refreshIcons();

    console.log("Hostel Hub Agent Management loading live account data.");
});