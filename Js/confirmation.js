document.addEventListener("DOMContentLoaded", function () {
    const referenceNumber = document.getElementById("referenceNumber");
    const hostelName = document.getElementById("hostelName");
    const hostelLocation = document.getElementById("hostelLocation");

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
        return;
    }

    if (referenceNumber) referenceNumber.textContent = booking.referenceCode;
    if (hostelName) hostelName.textContent = booking.hostelName || "Selected hostel";
    if (hostelLocation) hostelLocation.textContent = "📍 " + (booking.hostelLocation || "Osogbo");
});
