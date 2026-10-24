document.addEventListener("DOMContentLoaded", async function () {
    const API_BASE = window.HOSTEL_HUB_API_BASE || "http://localhost:4000/api";
    const referenceNumber = document.getElementById("referenceNumber");
    const hostelName = document.getElementById("hostelName");
    const hostelLocation = document.getElementById("hostelLocation");
    const hostelVideo = document.getElementById("confirmationHostelVideo");

    let booking = null;
    try {
        booking = JSON.parse(localStorage.getItem("hostelHubBooking") || "null");
    } catch (error) {
        console.error("Could not read inspection confirmation details:", error);
    }

    if (!booking || !booking.referenceCode) {
        if (referenceNumber) referenceNumber.textContent = "Unavailable";
        if (hostelName) hostelName.textContent = "Inspection details unavailable";
        if (hostelLocation) {
            hostelLocation.textContent = "We couldn't find a saved inspection confirmation. Please check your booking status before submitting another request.";
        }
        if (hostelVideo) hostelVideo.hidden = true;
        return;
    }

    if (referenceNumber) referenceNumber.textContent = booking.referenceCode;
    if (hostelName) hostelName.textContent = booking.hostelName || "Selected hostel";
    if (hostelLocation) hostelLocation.textContent = "📍 " + (booking.hostelLocation || "Osogbo");

    // Use the selected hostel's real listing video, never a prototype fallback.
    const params = new URLSearchParams(window.location.search);
    const hostelKey = params.get("hostel") || booking.hostel;

    if (!hostelVideo || !hostelKey) {
        if (hostelVideo) hostelVideo.hidden = true;
        return;
    }

    try {
        const response = await fetch(API_BASE + "/hostels/" + encodeURIComponent(hostelKey), {
            headers: { Accept: "application/json" }
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.hostel || !payload.hostel.videoUrl) {
            throw new Error(payload.error?.message || "The video for this hostel is unavailable.");
        }

        const hostel = payload.hostel;
        if (hostelName) hostelName.textContent = hostel.name || booking.hostelName || "Selected hostel";
        if (hostelLocation) hostelLocation.textContent = "📍 " + (hostel.location || hostel.address || booking.hostelLocation || "Osogbo");

        hostelVideo.pause();
        hostelVideo.src = hostel.videoUrl;
        hostelVideo.hidden = false;
        hostelVideo.load();

        const playPromise = hostelVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
                // Browser autoplay may be blocked; the visitor can use the video controls.
            });
        }
    } catch (error) {
        console.error("Unable to load the selected hostel video:", error);
        // Do not display the prototype video if the selected listing cannot load.
        hostelVideo.hidden = true;
    }
});
