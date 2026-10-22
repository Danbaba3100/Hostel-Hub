document.addEventListener("DOMContentLoaded", function () {

    const form = document.getElementById("inspectionForm");

    const submitButton = document.getElementById("submitBooking");
    const buttonText = document.getElementById("buttonText");
    const buttonSpinner = document.getElementById("buttonSpinner");
    const buttonArrow = document.querySelector(".button-arrow");

    const inspectionDate = document.getElementById("inspectionDate");

    /*
    =========================================
    SET MINIMUM INSPECTION DATE
    =========================================
    */

    if (inspectionDate) {

        const today = new Date();

        const year = today.getFullYear();

        const month = String(today.getMonth() + 1).padStart(2, "0");

        const day = String(today.getDate()).padStart(2, "0");

        const todayString = `${year}-${month}-${day}`;

        inspectionDate.min = todayString;
    }


    /*
    =========================================
    GET HOSTEL FROM URL
    =========================================
    */

    const urlParams = new URLSearchParams(window.location.search);

    const hostel = urlParams.get("hostel");


    /*
    =========================================
    HOSTEL DATA
    =========================================
    */

    const hostelData = {

        "royal-court": {
            name: "Royal Court Hostel",
            location: "📍 Oke-Baale, Osogbo",
            price: "₦180,000/year",
            room: "Self-contained",
            video: "assets/videos/hostel-1.mp4"
        },

        "peace-lodge": {
            name: "Peace Lodge",
            location: "📍 Alekuwodo, Osogbo",
            price: "₦150,000/year",
            room: "Room & Parlour",
            video: "assets/videos/hostel-2.mp4"
        },

        "green-view": {
            name: "Green View Hostel",
            location: "📍 Lameco, Osogbo",
            price: "₦200,000/year",
            room: "Self-contained",
            video: "assets/videos/hostel-3.mp4"
        },

        "sunrise": {
            name: "Sunrise Hostel",
            location: "📍 Ogo-Oluwa, Osogbo",
            price: "₦160,000/year",
            room: "Room & Parlour",
            video: "assets/videos/hostel-4.mp4"
        }

    };


    /*
    =========================================
    UPDATE SUMMARY
    =========================================
    */

    if (hostel && hostelData[hostel]) {

        const data = hostelData[hostel];

        const summaryName =
            document.getElementById("summaryHostelName");

        const summaryLocation =
            document.getElementById("summaryLocation");

        const summaryPrice =
            document.getElementById("summaryPrice");

        const summaryRoom =
            document.getElementById("summaryRoom");

        const summaryVideo =
            document.querySelector(".summary-video video");

        const source =
            summaryVideo
                ? summaryVideo.querySelector("source")
                : null;


        if (summaryName) {
            summaryName.textContent = data.name;
        }

        if (summaryLocation) {
            summaryLocation.textContent = data.location;
        }

        if (summaryPrice) {
            summaryPrice.textContent = data.price;
        }

        if (summaryRoom) {
            summaryRoom.textContent = data.room;
        }

        if (source) {

            source.src = data.video;

            summaryVideo.load();
        }


        /*
        Update View Details Link
        */

        const viewHostel =
            document.querySelector(".view-hostel");

        if (viewHostel) {

            viewHostel.href =
                `hostel-details.html?id=${encodeURIComponent(hostel)}`;
        }

    }


    /*
    =========================================
    FORM SUBMISSION
    =========================================
    */

    if (!form || !submitButton) {

        console.error(
            "Inspection form or submit button not found."
        );

        return;
    }


    form.addEventListener("submit", function (event) {

        event.preventDefault();


        /*
        Browser validation
        */

        if (!form.checkValidity()) {

            form.reportValidity();

            return;
        }


        /*
        Prevent double submission
        */

        submitButton.disabled = true;


        /*
        Loading state
        */

        if (buttonText) {
            buttonText.textContent = "Sending Request...";
        }

        if (buttonSpinner) {
            buttonSpinner.style.display = "inline-block";
        }

        if (buttonArrow) {
            buttonArrow.style.display = "none";
        }


        /*
        =====================================
        BACKEND WILL GO HERE LATER
        =====================================

        For now, we simulate a successful
        request and move to confirmation.
        */

        setTimeout(function () {

            let destination = "confirmation.html";

            if (hostel) {

                destination +=
                    "?hostel=" +
                    encodeURIComponent(hostel);
            }


            /*
            Optional:
            Store submitted details temporarily
            so the confirmation page can use them.
            */

            const bookingData = {

                hostel: hostel || "royal-court",

                name:
                    document.getElementById("fullName").value,

                phone:
                    document.getElementById("phoneNumber").value,

                email:
                    document.getElementById("email").value,

                date:
                    document.getElementById("inspectionDate").value,

                time:
                    document.getElementById("inspectionTime").value,

                visitors:
                    document.getElementById("visitors").value,

                message:
                    document.getElementById("message").value

            };


            localStorage.setItem(
                "hostelHubBooking",
                JSON.stringify(bookingData)
            );


            /*
            Go to confirmation page
            */

            window.location.href = destination;

        }, 900);

    });

});