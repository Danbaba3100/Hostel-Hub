/* Hostel Hub - public listing report form connected to the reports API */
document.addEventListener("DOMContentLoaded", async () => {
    "use strict";

    const API = window.HOSTEL_HUB_API_BASE || "http://localhost:4000/api";
    const reportForm = document.getElementById("reportForm");
    const hostelName = document.getElementById("hostelName");
    const hostelLocation = document.getElementById("hostelLocation");
    const submitReport = document.getElementById("submitReport");
    const buttonText = document.getElementById("buttonText");
    const buttonSpinner = document.getElementById("buttonSpinner");
    const urlParams = new URLSearchParams(window.location.search);
    const hostelKey = urlParams.get("hostel") || urlParams.get("id");
    let selectedHostel = null;
    let listingLoadFailed = false;

    if (!reportForm || !hostelName || !hostelLocation || !submitReport) return;

    if (hostelKey) {
        hostelName.textContent = "Loading selected listing…";
        hostelLocation.textContent = "Please wait while we verify this hostel.";
        submitReport.disabled = true;
        try {
            const response = await fetch(API + "/hostels/" + encodeURIComponent(hostelKey), {
                headers: { Accept: "application/json" }
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload.hostel || !payload.hostel.id) {
                throw new Error(payload.error?.message || "This listing could not be found.");
            }
            selectedHostel = payload.hostel;
            hostelName.textContent = selectedHostel.name || "Selected hostel";
            hostelLocation.textContent = selectedHostel.location || selectedHostel.address || "Location not specified";
        } catch (error) {
            listingLoadFailed = true;
            hostelName.textContent = "Listing unavailable";
            hostelLocation.textContent = error.message || "Please return to the homepage and select the listing again.";
        } finally {
            submitReport.disabled = listingLoadFailed;
        }
    } else {
        hostelName.textContent = "General report";
        hostelLocation.textContent = "No specific listing selected";
    }

    const reasonLabels = {
        "incorrect-information": "Incorrect information",
        "fake-listing": "Fake or suspicious listing",
        "wrong-price": "Wrong price",
        "hostel-unavailable": "Hostel is no longer available",
        "misleading-video": "Misleading or incorrect video",
        "agent-issue": "Agent or landlord issue",
        "other": "Other"
    };

    reportForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (listingLoadFailed) {
            alert("This listing could not be verified. Return to the homepage and select the listing again.");
            return;
        }

        const reason = document.getElementById("reportReason").value;
        const details = document.getElementById("reportDetails").value.trim();
        const name = document.getElementById("reporterName").value.trim();
        const phone = document.getElementById("reporterPhone").value.trim();
        const email = document.getElementById("reporterEmail").value.trim();

        if (!reason || details.length < 10 || !name || !phone) {
            alert("Please complete all required fields and provide at least 10 characters describing the issue.");
            return;
        }
        if (!/^[0-9+()\-\s]{7,25}$/.test(phone)) {
            alert("Please enter a valid phone number.");
            return;
        }

        const category = reason === "fake-listing" ? "fraud"
            : reason === "agent-issue" ? "agent"
            : reason === "other" ? "other"
            : "hostel";
        const targetType = selectedHostel ? "hostel" : (reason === "agent-issue" ? "agent" : "other");
        const reportedAgainst = selectedHostel
            ? selectedHostel.name
            : (targetType === "agent" ? "Agent report" : "General report");

        submitReport.disabled = true;
        submitReport.classList.add("loading");
        buttonText.textContent = "Submitting...";
        if (buttonSpinner) buttonSpinner.style.display = "inline-block";

        try {
            const response = await fetch(API + "/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    subject: "Report: " + reasonLabels[reason],
                    description: details,
                    targetType,
                    targetId: selectedHostel ? selectedHostel.id : "",
                    reportedAgainst,
                    category,
                    reporterName: name,
                    reporterPhone: phone,
                    reporterEmail: email
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload?.error?.message || "Your report could not be submitted. Please try again.");
            }
            alert("Thank you. Your report has been submitted for review. Reference code: " + payload.report.referenceCode);
            reportForm.reset();
        } catch (error) {
            alert(error.message || "Unable to connect to Hostel Hub. Please try again.");
        } finally {
            submitReport.disabled = false;
            submitReport.classList.remove("loading");
            buttonText.textContent = "Submit Report";
            if (buttonSpinner) buttonSpinner.style.display = "";
        }
    });
});
