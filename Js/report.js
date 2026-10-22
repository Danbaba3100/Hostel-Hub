/* =========================================
   HOSTEL HUB - REPORT PAGE
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    const reportForm = document.getElementById("reportForm");

    const hostelName = document.getElementById("hostelName");
    const hostelLocation = document.getElementById("hostelLocation");

    const submitReport = document.getElementById("submitReport");
    const buttonText = document.getElementById("buttonText");

    /* =========================================
       HOSTEL DATA
    ========================================= */

    const hostelData = {

        "royal-court": {
            name: "Royal Court Hostel",
            location: "Oke-Baale, Osogbo"
        },

        "peace-lodge": {
            name: "Peace Lodge",
            location: "Alekuwodo, Osogbo"
        },

        "green-view": {
            name: "Green View Hostel",
            location: "Lameco, Osogbo"
        },

        "sunrise": {
            name: "Sunrise Hostel",
            location: "Ogo-Oluwa, Osogbo"
        }

    };


    /* =========================================
       GET HOSTEL FROM URL
    ========================================== */

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


    /* =========================================
       FORM SUBMISSION
    ========================================== */

    reportForm.addEventListener("submit", (event) => {

        event.preventDefault();


        const reason =
            document.getElementById("reportReason").value;

        const details =
            document.getElementById("reportDetails").value.trim();

        const name =
            document.getElementById("reporterName").value.trim();

        const phone =
            document.getElementById("reporterPhone").value.trim();

        const email =
            document.getElementById("reporterEmail").value.trim();


        /* =========================================
           BASIC VALIDATION
        ========================================== */

        if (!reason || !details || !name || !phone) {

            alert("Please complete all required fields.");

            return;
        }


        /* =========================================
           PHONE VALIDATION
        ========================================== */

        const phonePattern = /^[0-9+\-\s]{10,15}$/;

        if (!phonePattern.test(phone)) {

            alert("Please enter a valid phone number.");

            return;
        }


        /* =========================================
           LOADING STATE
        ========================================== */

        submitReport.disabled = true;

        submitReport.classList.add("loading");

        buttonText.textContent = "Submitting...";


        /* =========================================
           TEMPORARY FRONTEND STORAGE
        ========================================== */

        const reportData = {

            hostelId: hostelId || null,

            hostelName: selectedHostel
                ? selectedHostel.name
                : "Unknown Hostel",

            hostelLocation: selectedHostel
                ? selectedHostel.location
                : "Unknown Location",

            reason: reason,

            details: details,

            name: name,

            phone: phone,

            email: email,

            submittedAt: new Date().toISOString()

        };


        /*
         * TEMPORARY STORAGE
         *
         * Later this will be replaced with:
         *
         * POST /api/reports
         *
         * The backend will save the report
         * inside PostgreSQL.
         */

        localStorage.setItem(
            "hostelHubReport",
            JSON.stringify(reportData)
        );


        /* =========================================
           SIMULATE SUBMISSION
        ========================================== */

        setTimeout(() => {

            submitReport.classList.remove("loading");

            buttonText.textContent = "Report Submitted";

            alert(
                "Thank you. Your report has been submitted and will be reviewed."
            );


            /* Reset button after a short delay */

            setTimeout(() => {

                submitReport.disabled = false;

                buttonText.textContent = "Submit Report";

                reportForm.reset();

            }, 1200);

        }, 900);

    });

});