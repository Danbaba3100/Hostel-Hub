document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================================
    // SAMPLE AGENT DATA
    // Replace with backend data later.
    // =========================================

    const agents = [
        {
            id: "AGT-001",
            name: "Samuel Adewale",
            email: "samuel.adewale@example.com",
            phone: "08012345678",
            location: "Oke-Baale, Osogbo",
            joined: "2026-08-12",
            status: "Active"
        },
        {
            id: "AGT-002",
            name: "Grace Oladipo",
            email: "grace.oladipo@example.com",
            phone: "08023456789",
            location: "Alekuwodo, Osogbo",
            joined: "2026-09-05",
            status: "Pending"
        },
        {
            id: "AGT-003",
            name: "David Okafor",
            email: "david.okafor@example.com",
            phone: "08034567890",
            location: "Lameco, Osogbo",
            joined: "2026-08-22",
            status: "Active"
        },
        {
            id: "AGT-004",
            name: "Mary Johnson",
            email: "mary.johnson@example.com",
            phone: "08045678901",
            location: "Ogo-Oluwa, Osogbo",
            joined: "2026-09-15",
            status: "Suspended"
        },
        {
            id: "AGT-005",
            name: "Daniel Ibrahim",
            email: "daniel.ibrahim@example.com",
            phone: "08056789012",
            location: "Igbona, Osogbo",
            joined: "2026-09-20",
            status: "Pending"
        }
    ];

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

    function getStatusClass(status) {
        const statusClasses = {
            Active: "status-active",
            Pending: "status-pending",
            Suspended: "status-suspended"
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

        activeAgents.textContent = agents.filter(
            (agent) => agent.status === "Active"
        ).length;

        pendingAgents.textContent = agents.filter(
            (agent) => agent.status === "Pending"
        ).length;

        suspendedAgents.textContent = agents.filter(
            (agent) => agent.status === "Suspended"
        ).length;
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
                agent.location
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

    function approveAgent(agentId) {
        const agent = getAgent(agentId);

        if (!agent || agent.status !== "Pending") {
            return false;
        }

        agent.status = "Active";

        updateStats();
        renderAgents();

        showToast(`${agent.name} has been approved.`);

        return true;
    }

    function suspendAgent(agentId) {
        const agent = getAgent(agentId);

        if (!agent || agent.status !== "Active") {
            return false;
        }

        const confirmed = window.confirm(
            `Are you sure you want to suspend ${agent.name}?`
        );

        if (!confirmed) {
            return false;
        }

        agent.status = "Suspended";

        updateStats();
        renderAgents();

        showToast(`${agent.name} has been suspended.`);

        return true;
    }

    function reactivateAgent(agentId) {
        const agent = getAgent(agentId);

        if (!agent || agent.status !== "Suspended") {
            return false;
        }

        agent.status = "Active";

        updateStats();
        renderAgents();

        showToast(`${agent.name}'s account has been reactivated.`);

        return true;
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

    addAgentForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(addAgentForm);

        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "").trim();
        const phone = String(formData.get("phone") || "").trim();
        const location = String(formData.get("location") || "").trim();
        const status = String(formData.get("status") || "Pending");

        if (!name || !email || !phone || !location) {
            showToast("Please complete all fields.");
            return;
        }

        if (!["Pending", "Active"].includes(status)) {
            showToast("Please select a valid account status.");
            return;
        }

        const duplicateEmail = agents.some(
            (agent) =>
                agent.email.toLowerCase() === email.toLowerCase()
        );

        if (duplicateEmail) {
            showToast("An agent with this email already exists.");
            return;
        }

        const highestId = agents.reduce((highest, agent) => {
            const number = Number(agent.id.replace("AGT-", ""));
            return Math.max(highest, number || 0);
        }, 0);

        const newAgent = {
            id: `AGT-${String(highestId + 1).padStart(3, "0")}`,
            name,
            email,
            phone,
            location,
            joined: new Date().toISOString().slice(0, 10),
            status
        };

        agents.unshift(newAgent);

        closeAddAgentModal();
        updateStats();
        renderAgents();

        showToast(`${name} has been added successfully.`);
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
            const pendingCount = agents.filter(
                (agent) => agent.status === "Pending"
            ).length;

            showToast(
                pendingCount > 0
                    ? `You have ${pendingCount} pending agent application(s).`
                    : "There are no pending agent applications."
            );
        });
    }

    // =========================================
    // INITIAL RENDER
    // =========================================

    updateStats();
    renderAgents();
    refreshIcons();

    console.log("Hostel Hub Agent Management loaded.");
});