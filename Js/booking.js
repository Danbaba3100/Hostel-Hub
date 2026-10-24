document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = window.HOSTEL_HUB_API_BASE || "http://localhost:4000/api";
    const form = document.getElementById("inspectionForm");
    const submitButton = document.getElementById("submitBooking");
    const buttonText = document.getElementById("buttonText");
    const buttonSpinner = document.getElementById("buttonSpinner");
    const buttonArrow = document.querySelector(".button-arrow");
    const inspectionDate = document.getElementById("inspectionDate");

    if (inspectionDate) {
        const today = new Date();
        inspectionDate.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }

    const params = new URLSearchParams(window.location.search);
    const hostelKey = params.get("hostel") || params.get("id");
    let selectedHostel = null;

    const summaryName = document.getElementById("summaryHostelName");
    const summaryLocation = document.getElementById("summaryLocation");
    const summaryPrice = document.getElementById("summaryPrice");
    const summaryRoom = document.getElementById("summaryRoom");
    const summaryVideo = document.querySelector(".summary-video video");
    const videoSource = summaryVideo ? summaryVideo.querySelector("source") : null;
    const viewHostel = document.querySelector(".view-hostel");

    function showHostelUnavailable(message) {
        if (summaryName) summaryName.textContent = "Hostel unavailable";
        if (summaryLocation) summaryLocation.textContent = message;
        if (summaryPrice) summaryPrice.textContent = "—";
        if (summaryRoom) summaryRoom.textContent = "—";
        if (summaryVideo) {
            summaryVideo.pause();
            if (videoSource) videoSource.removeAttribute("src");
            summaryVideo.removeAttribute("src");
            summaryVideo.load();
        }
        if (viewHostel) viewHostel.hidden = true;
        if (submitButton) submitButton.disabled = true;
    }

    if (!hostelKey) {
        showHostelUnavailable("Please return to Find Hostels and select a hostel first.");
    } else {
        try {
            const response = await fetch(API_BASE + "/hostels/" + encodeURIComponent(hostelKey), {
                headers: { Accept: "application/json" }
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload.hostel) {
                throw new Error(payload.error?.message || "This hostel could not be found.");
            }

            selectedHostel = payload.hostel;
            const hostel = selectedHostel;
            const price = new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: "NGN",
                maximumFractionDigits: 0
            }).format(Number(hostel.price) || 0);

            if (summaryName) summaryName.textContent = hostel.name;
            if (summaryLocation) summaryLocation.textContent = "📍 " + (hostel.location || hostel.address || "Osogbo");
            if (summaryPrice) summaryPrice.textContent = price + " / year";

            const roomType = String(hostel.type || "Not specified")
                .replace(/[_-]+/g, " ")
                .replace(/\b\w/g, letter => letter.toUpperCase());
            if (summaryRoom) summaryRoom.textContent = roomType;

            if (summaryVideo) {
                summaryVideo.pause();
                if (videoSource) {
                    videoSource.src = hostel.videoUrl || "";
                } else if (hostel.videoUrl) {
                    summaryVideo.src = hostel.videoUrl;
                }
                summaryVideo.load();
            }

            if (viewHostel) {
                viewHostel.href = "hostel-details.html?id=" + encodeURIComponent(hostel.slug);
                viewHostel.hidden = false;
            }
            document.title = "Book Inspection — " + hostel.name + " | Hostel Hub";
        } catch (error) {
            console.error("Unable to load selected hostel for inspection:", error);
            showHostelUnavailable(error.message || "We could not load this hostel. Please return to Find Hostels and try again.");
        }
    }

    if (!form || !submitButton) {
        console.error("Inspection form or submit button not found.");
        return;
    }

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!selectedHostel) {
            alert("The selected hostel could not be loaded. Please return to Find Hostels and select it again.");
            return;
        }

        submitButton.disabled = true;
        if (buttonText) buttonText.textContent = "Sending Request...";
        if (buttonSpinner) buttonSpinner.style.display = "inline-block";
        if (buttonArrow) buttonArrow.style.display = "none";

        const visitors = document.getElementById("visitors").value;
        const extraMessage = document.getElementById("message").value.trim();
        const messageParts = [];
        if (visitors) messageParts.push("Number of visitors: " + visitors);
        if (extraMessage) messageParts.push(extraMessage);

        const requestData = {
            hostelId: selectedHostel.id,
            studentName: document.getElementById("fullName").value.trim(),
            studentPhone: document.getElementById("phoneNumber").value.trim(),
            studentEmail: document.getElementById("email").value.trim(),
            preferredDate: inspectionDate.value,
            preferredTime: document.getElementById("inspectionTime").value,
            message: messageParts.join("\n")
        };

        try {
            const response = await fetch(API_BASE + "/inspections", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json"
                },
                body: JSON.stringify(requestData)
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok || !payload.inspection) {
                const fieldErrors = payload.error?.fields;
                const details = Array.isArray(fieldErrors)
                    ? fieldErrors.map(item => item.message).join(" ")
                    : "";
                throw new Error(details || payload.error?.message || "We couldn't submit your inspection request. Please try again.");
            }

            const bookingData = {
                hostel: selectedHostel.slug,
                hostelId: selectedHostel.id,
                hostelName: selectedHostel.name,
                hostelLocation: selectedHostel.location || selectedHostel.address || "Osogbo",
                name: requestData.studentName,
                phone: requestData.studentPhone,
                email: requestData.studentEmail,
                date: requestData.preferredDate,
                time: requestData.preferredTime,
                visitors: visitors,
                message: extraMessage,
                referenceCode: payload.inspection.referenceCode
            };

            localStorage.setItem("hostelHubBooking", JSON.stringify(bookingData));
            window.location.href = "confirmation.html?hostel=" + encodeURIComponent(selectedHostel.slug);
        } catch (error) {
            console.error("Inspection request failed:", error);
            alert(error.message || "We couldn't submit your inspection request. Please check your connection and try again.");
            submitButton.disabled = false;
            if (buttonText) buttonText.textContent = "Request Inspection";
            if (buttonSpinner) buttonSpinner.style.display = "none";
            if (buttonArrow) buttonArrow.style.display = "inline";
        }
    });
});
