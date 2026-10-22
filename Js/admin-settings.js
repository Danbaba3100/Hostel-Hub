
// =========================================
// HOSTEL HUB - ADMIN SETTINGS
// =========================================

document.addEventListener("DOMContentLoaded", () => {
    // =========================================
    // ELEMENTS
    // =========================================

    const sidebar = document.getElementById("sidebar");
    const menuToggle = document.getElementById("menuToggle");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const toast = document.getElementById("toast");

    const profileForm = document.getElementById("profileForm");
    const notificationForm = document.getElementById("notificationForm");
    const passwordForm = document.getElementById("passwordForm");
    const generalForm = document.getElementById("generalForm");

    let toastTimeout;

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
    // SETTINGS TABS
    // =========================================

    const tabButtons = document.querySelectorAll(".settings-tab");
    const settingsPanels = document.querySelectorAll(".settings-panel");

    function activateTab(sectionName) {
        const targetPanel = document.getElementById(sectionName);

        if (!targetPanel || !targetPanel.classList.contains("settings-panel")) {
            return;
        }

        tabButtons.forEach((button) => {
            const isActive = button.dataset.section === sectionName;

            button.classList.toggle("active", isActive);
            button.setAttribute("aria-selected", String(isActive));
        });

        settingsPanels.forEach((panel) => {
            const isActive = panel.id === sectionName;

            panel.classList.toggle("active", isActive);
            panel.hidden = !isActive;
        });
    }

    tabButtons.forEach((button) => {
        button.addEventListener("click", () => {
            activateTab(button.dataset.section);
        });
    });

    // =========================================
    // PROFILE DISPLAY
    // =========================================

    const adminName = document.getElementById("adminName");
    const adminEmail = document.getElementById("adminEmail");
    const adminPhone = document.getElementById("adminPhone");

    const profileDisplayName = document.getElementById("profileDisplayName");
    const profileAvatar = document.getElementById("profileAvatar");

    function updateProfileDisplay(name) {
        const cleanName = name.trim() || "Administrator";

        if (profileDisplayName) {
            profileDisplayName.textContent = cleanName;
        }

        if (profileAvatar) {
            const initials = cleanName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join("");

            profileAvatar.textContent = initials || "A";
        }
    }

    function loadProfile() {
        try {
            const savedProfile = localStorage.getItem("hostelHubAdminProfile");

            if (!savedProfile) {
                updateProfileDisplay(adminName?.value || "Administrator");
                return;
            }

            const profile = JSON.parse(savedProfile);

            if (adminName && typeof profile.name === "string") {
                adminName.value = profile.name;
            }

            if (adminEmail && typeof profile.email === "string") {
                adminEmail.value = profile.email;
            }

            if (adminPhone && typeof profile.phone === "string") {
                adminPhone.value = profile.phone;
            }

            updateProfileDisplay(adminName?.value || "Administrator");
        } catch (error) {
            console.error("Could not load the saved profile:", error);
            showToast("Could not load saved profile settings.", "error");
        }
    }

    if (adminName) {
        adminName.addEventListener("input", () => {
            updateProfileDisplay(adminName.value);
        });
    }

    if (profileForm) {
        profileForm.addEventListener("submit", (event) => {
            event.preventDefault();

            if (!profileForm.reportValidity()) return;

            const profile = {
                name: adminName?.value.trim() || "Administrator",
                email: adminEmail?.value.trim() || "",
                phone: adminPhone?.value.trim() || ""
            };

            try {
                localStorage.setItem(
                    "hostelHubAdminProfile",
                    JSON.stringify(profile)
                );

                updateProfileDisplay(profile.name);

                showToast("Profile settings saved on this browser.");
            } catch (error) {
                console.error("Could not save the profile:", error);
                showToast("Unable to save profile settings.", "error");
            }
        });
    }

    loadProfile();

    // =========================================
    // NOTIFICATION PREFERENCES
    // =========================================

    if (notificationForm) {
        const notificationInputs = notificationForm.querySelectorAll(
            'input[type="checkbox"]'
        );

        function loadNotificationPreferences() {
            try {
                const savedPreferences = localStorage.getItem(
                    "hostelHubNotificationPreferences"
                );

                if (!savedPreferences) return;

                const preferences = JSON.parse(savedPreferences);

                notificationInputs.forEach((input) => {
                    if (Object.prototype.hasOwnProperty.call(
                        preferences,
                        input.id
                    )) {
                        input.checked = Boolean(preferences[input.id]);
                    }
                });
            } catch (error) {
                console.error("Could not load notification preferences:", error);
            }
        }

        notificationForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const preferences = {};

            notificationInputs.forEach((input) => {
                preferences[input.id] = input.checked;
            });

            try {
                localStorage.setItem(
                    "hostelHubNotificationPreferences",
                    JSON.stringify(preferences)
                );

                showToast("Notification preferences saved.");
            } catch (error) {
                console.error("Could not save notification preferences:", error);
                showToast("Unable to save notification preferences.", "error");
            }
        });

        loadNotificationPreferences();
    }

    // =========================================
    // PASSWORD FORM
    // =========================================

    if (passwordForm) {
        passwordForm.addEventListener("submit", (event) => {
            event.preventDefault();

            if (!passwordForm.reportValidity()) return;

            const currentPassword = document.getElementById("currentPassword");
            const newPassword = document.getElementById("newPassword");
            const confirmPassword = document.getElementById("confirmPassword");

            if (!currentPassword || !newPassword || !confirmPassword) {
                showToast("Please check the password form fields.", "error");
                return;
            }

            if (
                !currentPassword.value ||
                !newPassword.value ||
                !confirmPassword.value
            ) {
                showToast("Please complete all password fields.", "error");
                return;
            }

            if (newPassword.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity("Passwords do not match.");
                confirmPassword.reportValidity();
                confirmPassword.setCustomValidity("");
                return;
            }

            if (newPassword.value === currentPassword.value) {
                showToast(
                    "Your new password must differ from your current password.",
                    "error"
                );
                return;
            }

            // Do not save passwords in localStorage.
            // A real password change requires connected authentication.

            showToast(
                "Password changes will work after authentication is connected.",
                "error"
            );
        });

        const confirmPassword = document.getElementById("confirmPassword");

        if (confirmPassword) {
            confirmPassword.addEventListener("input", () => {
                confirmPassword.setCustomValidity("");
            });
        }
    }

    // =========================================
    // GENERAL SETTINGS
    // =========================================

    const platformName = document.getElementById("platformName");
    const dateFormat = document.getElementById("dateFormat");
    const compactDashboard = document.getElementById("compactDashboard");

    function loadGeneralSettings() {
        try {
            const savedSettings = localStorage.getItem(
                "hostelHubGeneralSettings"
            );

            if (!savedSettings) return;

            const settings = JSON.parse(savedSettings);

            if (platformName && typeof settings.platformName === "string") {
                platformName.value = settings.platformName;
            }

            if (dateFormat && typeof settings.dateFormat === "string") {
                const validOption = Array.from(dateFormat.options).some(
                    (option) => option.value === settings.dateFormat
                );

                if (validOption) {
                    dateFormat.value = settings.dateFormat;
                }
            }

            if (compactDashboard && typeof settings.compactDashboard === "boolean") {
                compactDashboard.checked = settings.compactDashboard;
            }
        } catch (error) {
            console.error("Could not load general settings:", error);
        }
    }

    if (generalForm) {
        generalForm.addEventListener("submit", (event) => {
            event.preventDefault();

            if (!generalForm.reportValidity()) return;

            const settings = {
                platformName: platformName?.value.trim() || "Hostel Hub",
                dateFormat: dateFormat?.value || "en-GB",
                compactDashboard: compactDashboard?.checked || false
            };

            try {
                localStorage.setItem(
                    "hostelHubGeneralSettings",
                    JSON.stringify(settings)
                );

                showToast("General settings saved on this browser.");
            } catch (error) {
                console.error("Could not save general settings:", error);
                showToast("Unable to save general settings.", "error");
            }
        });
    }

    loadGeneralSettings();

    // =========================================
    // MOBILE SIDEBAR
    // =========================================

    function openSidebar() {
        sidebar?.classList.add("open");
        sidebarOverlay?.classList.add("active");

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "true");
        }
    }

    function closeSidebar() {
        sidebar?.classList.remove("open");
        sidebarOverlay?.classList.remove("active");

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
        }
    }

    if (menuToggle) {
        menuToggle.addEventListener("click", () => {
            if (sidebar?.classList.contains("open")) {
                closeSidebar();
            } else {
                openSidebar();
            }
        });
    }

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", closeSidebar);
    }

    document.querySelectorAll(".sidebar-nav a").forEach((link) => {
        link.addEventListener("click", () => {
            closeSidebar();
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    // =========================================
    // LUCIDE ICONS
    // =========================================

    if (window.lucide) {
        window.lucide.createIcons();
    }
});
