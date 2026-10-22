
/* =========================================
   HOSTEL HUB - HOSTEL DETAILS
========================================= */

document.addEventListener("DOMContentLoaded", () => {
    const hostelData = {
        "royal-court": {
            name: "Royal Court Hostel",
            location: "📍 Oke-Baale, Osogbo",
            price: "₦180,000/year",
            bookingPrice: "₦180,000",
            room: "Self-contained",
            students: "2 students",
            status: "Available",
            video: "assets/videos/hostel-1.mp4",
            description:
                "A comfortable student hostel located around Oke-Baale, with convenient access to campus and essential facilities.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Parking",
                "Security",
                "Kitchen",
                "Bathroom"
            ]
        },

        "peace-lodge": {
            name: "Peace Lodge",
            location: "📍 Alekuwodo, Osogbo",
            price: "₦150,000/year",
            bookingPrice: "₦150,000",
            room: "Room & Parlour",
            students: "2 students",
            status: "Available",
            video: "assets/videos/hostel-2.mp4",
            description:
                "A student-friendly accommodation option in Alekuwodo with a practical layout and easy access to nearby amenities.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Security",
                "Kitchen",
                "Bathroom",
                "Parking"
            ]
        },

        "green-view": {
            name: "Green View Hostel",
            location: "📍 Lameco, Osogbo",
            price: "₦200,000/year",
            bookingPrice: "₦200,000",
            room: "Self-contained",
            students: "2 students",
            status: "Available",
            video: "assets/videos/hostel-3.mp4",
            description:
                "A self-contained student accommodation option in Lameco, designed for students looking for convenience and privacy.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Security",
                "Parking",
                "Kitchen",
                "Bathroom"
            ]
        },

        "sunrise": {
            name: "Sunrise Hostel",
            location: "📍 Ogo-Oluwa, Osogbo",
            price: "₦160,000/year",
            bookingPrice: "₦160,000",
            room: "Room & Parlour",
            students: "2 students",
            status: "Available",
            video: "assets/videos/hostel-4.mp4",
            description:
                "A practical student accommodation option around Ogo-Oluwa with essential facilities for everyday student living.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Security",
                "Kitchen",
                "Bathroom",
                "Parking"
            ]
        }
    };

    // Get the selected hostel from the URL.
    const params = new URLSearchParams(window.location.search);
    const hostelId = params.get("id");
    const hostel = hostelData[hostelId];

    // Match the IDs in your actual hostel-details.html.
    const hostelTitle = document.getElementById("hostelTitle");
    const hostelLocation = document.getElementById("hostelLocation");
    const hostelVideo = document.getElementById("hostelVideo");
    const hostelDescription = document.getElementById("hostelDescription");
    const hostelPrice = document.getElementById("hostelPrice");
    const hostelRoom = document.getElementById("hostelRoom");
    const hostelOccupancy = document.getElementById("hostelOccupancy");
    const hostelAvailability = document.getElementById("hostelAvailability");
    const bookingPrice = document.getElementById("bookingPrice");
    const facilitiesGrid = document.querySelector(".facilities-grid");
    const bookingButton = document.querySelector(".booking-button");
    const reportLink = document.querySelector(".report-link");

    // Update a text element safely.
    function setText(element, value) {
        if (element) {
            element.textContent = value;
        }
    }

    // Handle missing or invalid hostel IDs.
    if (!hostel) {
        document.title = "Hostel Not Found | Hostel Hub";

        setText(hostelTitle, "Hostel Not Found");
        setText(
            hostelLocation,
            "This hostel could not be identified."
        );
        setText(
            hostelDescription,
            "Please return to Find Hostels and select a hostel to view its details."
        );

        if (hostelVideo) {
            hostelVideo.pause();
            hostelVideo.removeAttribute("src");

            const source = hostelVideo.querySelector("source");
            if (source) source.removeAttribute("src");

            hostelVideo.load();
        }

        if (bookingButton) bookingButton.hidden = true;
        if (reportLink) reportLink.hidden = true;

        return;
    }

    // Update the page title and hostel information.
    document.title = `${hostel.name} | Hostel Hub`;

    setText(hostelTitle, hostel.name);
    setText(hostelLocation, hostel.location);
    setText(hostelDescription, hostel.description);
    setText(hostelPrice, hostel.price);
    setText(hostelRoom, hostel.room);
    setText(hostelOccupancy, hostel.students);
    setText(hostelAvailability, hostel.status);
    setText(bookingPrice, hostel.bookingPrice);

    // Update the hostel video.
    if (hostelVideo) {
        hostelVideo.pause();

        const source = hostelVideo.querySelector("source");

        if (source) {
            source.src = hostel.video;
        } else {
            hostelVideo.src = hostel.video;
        }

        hostelVideo.load();
    }

    // Update the facilities using your existing grid design.
    if (facilitiesGrid) {
        facilitiesGrid.replaceChildren();

        hostel.facilities.forEach((facility) => {
            const facilityItem = document.createElement("div");
            facilityItem.className = "facility";

            const icon = document.createElement("span");
            icon.textContent = "✓";
            icon.setAttribute("aria-hidden", "true");

            const label = document.createElement("p");
            label.textContent = facility;

            facilityItem.append(icon, label);
            facilitiesGrid.appendChild(facilityItem);
        });
    }

    // Pass the selected hostel to the booking page.
    if (bookingButton) {
        bookingButton.href =
            `book-inspection.html?hostel=${encodeURIComponent(hostelId)}`;
        bookingButton.hidden = false;
    }

    // Pass the selected hostel to the report page.
    if (reportLink) {
        reportLink.href =
            `report.html?hostel=${encodeURIComponent(hostelId)}`;
        reportLink.hidden = false;
    }

    console.log("Hostel details loaded:", hostel.name);
});
