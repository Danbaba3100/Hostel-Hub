
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "hostelHubAgentProfile";

  const $ = (id) => document.getElementById(id);

  const form = $("profileForm");
  const toast = $("toast");

  let toastTimer = null;
  let savedProfile = null;

  const fields = [
    "agentFullName",
    "agentEmail",
    "agentPhone",
    "agentWhatsApp",
    "agentAddress",
    "agentBio",
    "agencyName",
    "agencyType",
    "agencyWebsite"
  ];

  const defaultProfile = {
    agentFullName: "",
    agentEmail: "",
    agentPhone: "",
    agentWhatsApp: "",
    agentAddress: "",
    agentBio: "",
    agencyName: "",
    agencyType: "Independent Agent",
    agencyWebsite: ""
  };

  // -----------------------------------------
  // Notifications
  // -----------------------------------------

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  }

  // -----------------------------------------
  // Read and save profile information
  // -----------------------------------------

  function loadProfile() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        savedProfile = {
          ...defaultProfile,
          ...parsed
        };
      } else {
        savedProfile = { ...defaultProfile };
      }
    } catch (error) {
      console.error("Could not load agent profile:", error);
      savedProfile = { ...defaultProfile };
      showToast("Could not load saved profile information.");
    }

    populateForm(savedProfile);
    updateProfileSummary(savedProfile);
  }

  function populateForm(profile) {
    fields.forEach((id) => {
      const field = $(id);

      if (field) {
        field.value = profile[id] ?? "";
      }
    });
  }

  function getFormData() {
    const profile = {};

    fields.forEach((id) => {
      profile[id] = $(id).value.trim();
    });

    return profile;
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      savedProfile = { ...profile };
      return true;
    } catch (error) {
      console.error("Could not save agent profile:", error);
      showToast("Profile could not be saved in browser storage.");
      return false;
    }
  }

  // -----------------------------------------
  // Update profile preview
  // -----------------------------------------

  function updateProfileSummary(profile) {
    const name = profile.agentFullName.trim();
    const email = profile.agentEmail.trim();

    $("summaryName").textContent = name || "Your Name";
    $("summaryEmail").textContent = email || "your@email.com";

    const initial = name
      ? name.charAt(0).toUpperCase()
      : "A";

    $("profileAvatar").textContent = initial;
    $("headerAvatar").textContent = initial;
  }

  // -----------------------------------------
  // Validate phone numbers
  // -----------------------------------------

  function isValidPhone(phone) {
    const cleaned = phone.replace(/[\s()-]/g, "");

    // Accept common international format or local
    // phone formats containing 7–15 digits.
    return /^\+?\d{7,15}$/.test(cleaned);
  }

  function isValidWebsite(url) {
    if (!url) return true;

    try {
      const parsed = new URL(url);

      return parsed.protocol === "https:" ||
        parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  // -----------------------------------------
  // Save profile form
  // -----------------------------------------

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    const profile = getFormData();

    if (!isValidPhone(profile.agentPhone)) {
      $("agentPhone").setCustomValidity(
        "Enter a valid phone number using 7 to 15 digits."
      );
      $("agentPhone").reportValidity();
      $("agentPhone").setCustomValidity("");
      return;
    }

    if (!isValidPhone(profile.agentWhatsApp)) {
      $("agentWhatsApp").setCustomValidity(
        "Enter a valid WhatsApp number using 7 to 15 digits."
      );
      $("agentWhatsApp").reportValidity();
      $("agentWhatsApp").setCustomValidity("");
      return;
    }

    if (!isValidWebsite(profile.agencyWebsite)) {
      $("agencyWebsite").setCustomValidity(
        "Enter a valid website link beginning with http:// or https://."
      );
      $("agencyWebsite").reportValidity();
      $("agencyWebsite").setCustomValidity("");
      return;
    }

    const saved = saveProfile(profile);

    if (!saved) {
      return;
    }

    updateProfileSummary(profile);

    showToast("Your profile has been saved successfully.");
  });

  // -----------------------------------------
  // Cancel unsaved changes
  // -----------------------------------------

  $("resetProfileBtn").addEventListener("click", () => {
    populateForm(savedProfile);
    updateProfileSummary(savedProfile);

    showToast("Unsaved changes have been cancelled.");
  });

  // -----------------------------------------
  // Edit profile shortcut
  // -----------------------------------------

  $("editProfileBtn").addEventListener("click", () => {
    $("agentFullName").focus();

    $("profileFormSection").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  // -----------------------------------------
  // Keep summary preview updated while typing
  // -----------------------------------------

  ["agentFullName", "agentEmail"].forEach((id) => {
    $(id).addEventListener("input", () => {
      updateProfileSummary(getFormData());
    });
  });

  // -----------------------------------------
  // Mobile sidebar
  // -----------------------------------------

  const sidebar = $("sidebar");
  const sidebarOverlay = $("sidebarOverlay");
  const menuToggle = $("menuToggle");

  function openSidebar() {
    sidebar.classList.add("open");
    sidebarOverlay.classList.add("show");
    menuToggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("menu-open");
  }

  function closeSidebar() {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    menuToggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
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

  // -----------------------------------------
  // Initialise page
  // -----------------------------------------

  loadProfile();
});
