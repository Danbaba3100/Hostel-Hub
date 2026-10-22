```javascript
document.addEventListener("DOMContentLoaded", function () {

    const referenceNumber =
        document.getElementById("referenceNumber");

    /*
        Generate a temporary inspection reference.

        Later, the backend will generate the real
        reference number and send it to this page.
    */

    if (referenceNumber) {

        const randomNumber =
            Math.floor(100000 + Math.random() * 900000);

        referenceNumber.textContent =
            "HH-" + randomNumber;
    }


    /*
        Get the hostel ID from the URL.

        Example:
        confirmation.html?hostel=royal-court
    */

    const urlParams =
        new URLSearchParams(window.location.search);

    const hostel =
        urlParams.get("hostel");


    /*
        For now, Royal Court Hostel is the default
        hostel shown on the confirmation page.

        Later, the backend will provide the actual
        hostel information.
    */

    if (hostel === "royal-court") {

        const hostelName =
            document.getElementById("hostelName");

        const hostelLocation =
            document.getElementById("hostelLocation");

        if (hostelName) {
            hostelName.textContent =
                "Royal Court Hostel";
        }

        if (hostelLocation) {
            hostelLocation.textContent =
                "📍 Oke-Baale, Osogbo";
        }
    }

});
```
