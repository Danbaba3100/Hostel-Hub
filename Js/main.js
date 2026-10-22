// ===============================
// MOBILE MENU
// ===============================

const menuToggle = document.getElementById("menuToggle");

const navLinks = document.querySelector(".nav-links");

if (menuToggle) {

    menuToggle.addEventListener("click", () => {

        navLinks.classList.toggle("show");

    });

}


// ===============================
// SEARCH
// ===============================

const searchForm = document.getElementById("searchForm");

const searchInput = document.getElementById("searchInput");


if (searchForm) {

    searchForm.addEventListener("submit", (event) => {

        event.preventDefault();

        const searchValue = searchInput.value.trim();

        if (searchValue === "") {

            alert("Please enter a location or hostel name.");

            return;

        }

        console.log("Searching for:", searchValue);

        // Later we will connect this
        // to the actual hostel database.

    });

}


// ===============================
// HOSTEL VIDEO PLAY BUTTONS
// ===============================

const hostelVideos = document.querySelectorAll(".video-container video");

const playButtons = document.querySelectorAll(".play-btn");


playButtons.forEach((button, index) => {

    button.addEventListener("click", () => {

        const video = hostelVideos[index];

        if (!video) return;


        if (video.paused) {

            video.play();

            button.textContent = "❚❚";

        } else {

            video.pause();

            button.textContent = "▶";

        }

    });

});


// ===============================
// PAUSE VIDEOS WHEN NOT PLAYING
// ===============================

hostelVideos.forEach((video, index) => {

    video.addEventListener("ended", () => {

        if (playButtons[index]) {

            playButtons[index].textContent = "▶";

        }

    });

});
document.addEventListener("DOMContentLoaded", () => {

    /* =========================
       MOBILE NAVIGATION
    ========================== */

    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    if (menuToggle && navLinks) {

        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("active");
        });

    }


    /* =========================
       HOMEPAGE SEARCH
    ========================== */

    const heroSearch = document.getElementById("heroSearch");
    const searchInput = document.getElementById("searchInput");

    if (heroSearch && searchInput) {

        heroSearch.addEventListener("submit", (event) => {

            event.preventDefault();

            const searchTerm = searchInput.value.trim();

            if (searchTerm === "") {
                window.location.href = "hostels.html";
                return;
            }

            window.location.href =
                "hostels.html?search=" +
                encodeURIComponent(searchTerm);

        });

    }

});