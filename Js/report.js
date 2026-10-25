/* Hostel Hub - public report form connected to the reports API */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const API = "http://localhost:4000/api";
    const reportForm = document.getElementById("reportForm");
    const hostelName = document.getElementById("hostelName");
    const hostelLocation = document.getElementById("hostelLocation");
    const submitReport = document.getElementById("submitReport");
    const buttonText = document.getElementById("buttonText");
    const buttonSpinner = document.getElementById("buttonSpinner");

    const hostelData = {
        "royal-court": { name: "Royal Court Hostel", location: "Oke-Baale, Osogbo" },
        "peace-lodge": { name: "Peace Lodge", location: "Alekuwodo, Osogbo" },
        "green-view": { name: "Green View Hostel", location: "Lameco, Osogbo" },
        "sunrise": { name: "Sunrise Hostel", location: "Ogo-Oluwa, Osogbo" }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const hostelId = urlParams.get("hostel");
    const selectedHostel = hostelData[hostelId];

    if (selectedHostel) {
        hostelName.textContent = selectedHostel.name;
        hostelLocation.textContent = selectedHostel.location;
    } else {
        hostelName.textContent = "Hostel listing";
        hostelLocation.textContent = "Listing not specified";
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
        const targetType = reason === "agent-issue" ? "agent" : "hostel";
        const reportedAgainst = selectedHostel
            ? selectedHostel.name
            : (targetType === "agent" ? "Agent report" : "Hostel listing");

        submitReport.disabled = true;
        submitReport.classList.add("loading");
        buttonText.textContent = "Submitting...";
        if (buttonSpinner) buttonSpinner.style.display = "inline-block";

        try {
            const response = await fetch(API + "/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subject: "Report: " + reasonLabels[reason],
                    description: details,
                    targetType,
                    targetId: hostelId || "",
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
            alert(error.message || "Unable to connect to Hostel Hub. Please make sure the service is available and try again.");
        } finally {
            submitReport.disabled = false;
            submitReport.classList.remove("loading");
            buttonText.textContent = "Submit Report";
            if (buttonSpinner) buttonSpinner.style.display = "";
        }
    });
});
