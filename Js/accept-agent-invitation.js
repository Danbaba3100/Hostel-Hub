'use strict';
document.addEventListener("DOMContentLoaded", () => {
  const API = "http://localhost:4000/api";
  const form = document.getElementById("invitationForm");
  const message = document.getElementById("formMessage");
  const button = document.getElementById("submitButton");
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());
  const token = new URLSearchParams(window.location.search).get("token") || "";
  function show(text, error = false) {
    message.textContent = text;
    message.classList.toggle("is-error", error);
    message.hidden = false;
  }
  if (!token || token.length < 32) {
    show("This invitation link is missing or invalid. Ask the administrator to create a new invitation.", true);
    button.disabled = true;
    return;
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const password = form.elements.namedItem("password").value;
    const confirm = form.elements.namedItem("confirmPassword").value;
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      show("Use at least 12 characters, including an uppercase letter, a lowercase letter and a number.", true);
      return;
    }
    if (password !== confirm) { show("The passwords do not match.", true); return; }
    button.disabled = true; button.classList.add("is-loading"); button.setAttribute("aria-busy","true");
    try {
      const response = await fetch(API + "/auth/accept-invitation", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({token,password})
      });
      const payload = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(payload?.error?.message || "Could not accept this invitation.");
      if (!payload.accessToken || !payload.user) throw new Error("The server response was incomplete. Please try again.");
      sessionStorage.setItem("hostelHubAccessToken",payload.accessToken);
      sessionStorage.setItem("hostelHubUser",JSON.stringify(payload.user));
      show("Your agent account is active. Opening your dashboard…");
      window.setTimeout(()=>window.location.assign("agent-dashboard.html"),700);
    } catch(error) {
      show(error instanceof TypeError ? "Cannot reach the Hostel Hub API. Make sure the backend is running on port 4000." : error.message,true);
    } finally {
      button.disabled=false; button.classList.remove("is-loading"); button.setAttribute("aria-busy","false");
    }
  });
});