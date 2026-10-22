
document.addEventListener("DOMContentLoaded", function () {
    const hostels = {
        "royal-court": {
            name: "Royal Court Hostel",
            location: "Oke-Baale, Osogbo",
            price: "₦180,000",
            room: "Self-contained",
            students: "2 students",
            status: "Available",
            video: "assets/videos/hostel-1.mp4",
            description:
                "Royal Court Hostel is located in Oke-Baale, Osogbo. Contact the hostel agent to confirm the current facilities, availability and rental terms.",
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
            location: "Alekuwodo, Osogbo",
            price: "₦150,000",
            room: "Room & Parlour",
            students: "Confirm with agent",
            status: "Availability to be confirmed",
            video: "assets/videos/hostel-2.mp4",
            description:
                "Peace Lodge is located in Alekuwodo, Osogbo. Contact the hostel agent to confirm the current facilities, availability and rental terms.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Security",
                "Kitchen",
                "Bathroom"
            ]
        },

        "green-view": {
            name: "Green View Hostel",
            location: "Lameco, Osogbo",
            price: "₦200,000",
            room: "Self-contained",
            students: "Confirm with agent",
            status: "Availability to be confirmed",
            video: "assets/videos/hostel-3.mp4",
            description:
                "Green View Hostel is located in Lameco, Osogbo. Contact the hostel agent to confirm the current facilities, availability and rental terms.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Security",
                "Kitchen",
                "Bathroom"
            ]
        },

        "sunrise": {
            name: "Sunrise Hostel",
            location: "Ogo-Oluwa, Osogbo",
            price: "₦160,000",
            room: "Room & Parlour",
            students: "Confirm with agent",
            status: "Availability to be confirmed",
            video: "assets/videos/hostel-4.mp4",
            description:
                "Sunrise Hostel is located in Ogo-Oluwa, Osogbo. Contact the hostel agent to confirm the current facilities, availability and rental terms.",
            facilities: [
                "Water Supply",
                "Electricity",
                "Security",
                "Kitchen",
                "Bathroom"
            ]
        }
    };

    // Read the hostel ID from the URL.
    const params = new URLSearchParams(window.location.search);
    const hostelId = params.get("id") || params.get("hostel");
    const hostel = hostels[hostelId];

    // Update an element only if it exists on the page.
    function updateText(id, value) {
        const element = document.getElementById(id);

        if (element && value !== undefined) {
            element.textContent = value;
        }
    }

    // Never silently show Royal Court for an invalid/missing ID.
    if (!hostel) {
        updateText("hostelName", "Hostel Not Found");
        updateText(
            "hostelDescription",
            "We couldn't identify this hostel. Return to the hostels page and select a hostel again."
        );

        document.title = "Hostel Not Found | Hostel Hub";

        const video = document.getElementById("hostelVideo");
        if (video) {
            video.pause();
            video.removeAttribute("src");
            video.load();
        }

        document.querySelectorAll(".booking-button").forEach(button => {
            button.hidden = true;
        });

        return;
    }

    // Update the browser tab title.
    document.title = `${hostel.name} | Hostel Hub`;

    // Update hostel details.
    updateText("hostelName", hostel.name);
    updateText("hostelLocation", hostel.location);
    updateText("hostelDescription", hostel.description);
    updateText("hostelPrice", hostel.price);
    updateText("hostelRoom", hostel.room);
    updateText("hostelStudents", hostel.students);
    updateText("hostelStatus", hostel.status);

    // Update the hostel video.
    const video = document.getElementById("hostelVideo");

    if (video) {
        video.src = hostel.video;
        video.load();
    }

    // Update the facilities list.
    const facilitiesList = document.getElementById("facilitiesList");

    if (facilitiesList) {
        facilitiesList.replaceChildren();

        hostel.facilities.forEach(facility => {
            const item = document.createElement("li");
            item.textContent = facility;
            facilitiesList.appendChild(item);
        });
    }

    // Update booking links to point to the selected hostel.
    document.querySelectorAll(".booking-button").forEach(button => {
        button.href = `book-inspection.html?hostel=${encodeURIComponent(hostelId)}`;
        button.hidden = false;
    });

    // Update report links to point to the selected hostel.
    document.querySelectorAll(".report-link").forEach(link => {
        link.href = `report.html?hostel=${encodeURIComponent(hostelId)}`;
    });
});
