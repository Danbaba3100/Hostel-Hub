'use strict';

(() => {
  const API_BASE = 'https://hostel-hub-api-a4ie.onrender.com/api';
  const mode = document.body.dataset.authMode;
  const expectedRole = document.body.dataset.authRole || 'agent';
  const form = document.getElementById(mode === 'register' ? 'registerForm' : 'loginForm');
  const message = document.getElementById('formMessage');
  const submitButton = document.getElementById('submitButton');
  const currentYear = document.getElementById('currentYear');

  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
  if (!form || !message || !submitButton) return;

  const showMessage = (text, type = 'success') => {
    message.textContent = text;
    message.classList.toggle('is-error', type === 'error');
    message.hidden = false;
  };

  const clearMessage = () => {
    message.textContent = '';
    message.classList.remove('is-error');
    message.hidden = true;
  };

  const setLoading = (loading) => {
    submitButton.disabled = loading;
    submitButton.classList.toggle('is-loading', loading);
    submitButton.setAttribute('aria-busy', String(loading));
  };

  const readError = (payload, status) => {
    if (payload && payload.error && Array.isArray(payload.error.fields) && payload.error.fields.length) {
      return payload.error.fields.map((field) => field.message).join(' ');
    }
    if (payload && payload.error && typeof payload.error.message === 'string') {
      return payload.error.message;
    }
    if (status === 409) return 'An account with this email already exists. Try signing in instead.';
    return 'We could not complete your request. Please try again.';
  };

  const saveSession = (payload) => {
    if (!payload || !payload.accessToken || !payload.user) {
      throw new Error('The server response was incomplete. Please try again.');
    }
    // Keep the short-lived access token in this tab's session, not persistent local storage.
    sessionStorage.setItem('hostelHubAccessToken', payload.accessToken);
    sessionStorage.setItem('hostelHubUser', JSON.stringify(payload.user));
  };

  const markInvalid = (input, invalid) => {
    if (!input) return;
    if (invalid) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  };

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => markInvalid(input, false));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage();

    const formData = new FormData(form);
    const email = String(formData.get('email') || '').trim().toLowerCase();
    const password = String(formData.get('password') || '');
    const emailInput = form.elements.namedItem('email');
    const passwordInput = form.elements.namedItem('password');

    if (!emailInput.checkValidity()) {
      markInvalid(emailInput, true);
      showMessage('Enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }
    markInvalid(emailInput, false);

    if (!password) {
      markInvalid(passwordInput, true);
      showMessage('Enter your password.', 'error');
      passwordInput.focus();
      return;
    }
    markInvalid(passwordInput, false);

    const requestBody = { email, password };
    let endpoint = '/auth/login';

    if (mode === 'register') {
      const fullName = String(formData.get('fullName') || '').trim();
      const phone = String(formData.get('phone') || '').trim();
      const confirmPassword = String(formData.get('confirmPassword') || '');
      const fullNameInput = form.elements.namedItem('fullName');
      const confirmInput = form.elements.namedItem('confirmPassword');

      if (fullName.length < 2) {
        markInvalid(fullNameInput, true);
        showMessage('Enter your full name (at least 2 characters).', 'error');
        fullNameInput.focus();
        return;
      }
      markInvalid(fullNameInput, false);

      if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
        markInvalid(passwordInput, true);
        showMessage('Use at least 12 characters, including an uppercase letter, a lowercase letter and a number.', 'error');
        passwordInput.focus();
        return;
      }

      if (password !== confirmPassword) {
        markInvalid(confirmInput, true);
        showMessage('The passwords do not match.', 'error');
        confirmInput.focus();
        return;
      }
      markInvalid(confirmInput, false);

      requestBody.fullName = fullName;
      if (phone) requestBody.phone = phone;
      endpoint = '/auth/register';
    }

    setLoading(true);
    try {
      const response = await fetch(API_BASE + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      let payload = {};
      try {
        payload = await response.json();
      } catch {
        throw new Error('The server returned an unreadable response. Please try again.');
      }

      if (!response.ok) throw new Error(readError(payload, response.status));

      if (mode === 'register' && payload.applicationPending === true) {
        showMessage(payload.message || 'Your application has been submitted. You can sign in after an administrator approves it.');
        form.reset();
        return;
      }

      if (mode !== 'register' && payload.user.role !== expectedRole) {
        showMessage(expectedRole === 'admin'
          ? 'This account does not have administrator access.'
          : 'Please use the administrator sign-in page for this account.', 'error');
        return;
      }

      saveSession(payload);
      const destination = payload.user.role === 'admin' ? 'admin-hostels.html' : 'agent-dashboard.html';
      showMessage(mode === 'register'
        ? 'Your agent account has been created. Taking you to your agent dashboard…'
        : (payload.user.role === 'admin'
          ? 'Administrator sign-in successful. Opening hostel management…'
          : 'You are signed in. Taking you to your agent dashboard…'));

      window.setTimeout(() => {
        window.location.assign(destination);
      }, 700);
    } catch (error) {
      if (error instanceof TypeError) {
        showMessage('Cannot reach the Hostel Hub API. Make sure the backend is running at http://localhost:4000 and try again.', 'error');
      } else {
        showMessage(error.message || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  });
})();