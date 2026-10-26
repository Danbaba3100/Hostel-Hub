'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:4000/api';
  const TOKEN_KEY = 'hostelHubAccessToken';
  const USER_KEY = 'hostelHubUser';
  const $ = (id) => document.getElementById(id);
  const form = $('profileForm');
  const toast = $('toast');
  const saveButton = form.querySelector('button[type="submit"]');
  let toastTimer = null;
  let savedProfile = null;

  const fieldMap = {
    agentFullName: 'fullName',
    agentEmail: 'email',
    agentPhone: 'phone',
    agentWhatsApp: 'whatsappPhone',
    agentAddress: 'businessAddress',
    agentBio: 'bio',
    agencyName: 'agencyName',
    agencyType: 'agencyType',
    agencyWebsite: 'agencyWebsite'
  };
  const fieldIds = Object.keys(fieldMap);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function setSaving(saving) {
    saveButton.disabled = saving;
    saveButton.setAttribute('aria-busy', String(saving));
    saveButton.textContent = saving ? 'Saving…' : 'Save Profile';
  }

  async function apiRequest(path, options = {}) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace('login.html');
      throw new Error('Please sign in to manage your profile.');
    }

    let response;
    try {
      response = await fetch(API_BASE + path, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: 'Bearer ' + token,
          ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {})
        }
      });
    } catch {
      throw new Error('Cannot reach the Hostel Hub API. Make sure the backend is running at http://localhost:4000.');
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace('login.html');
      throw new Error('Your session expired. Please sign in again.');
    }
    if (!response.ok) {
      const error = payload && payload.error;
      if (error && Array.isArray(error.fields) && error.fields.length) {
        throw new Error(error.fields.map((field) => field.message).join(' '));
      }
      throw new Error(error && error.message ? error.message : 'The request could not be completed.');
    }
    return payload;
  }

  function normalizeProfile(profile) {
    return {
      fullName: profile.fullName || '',
      email: profile.email || '',
      phone: profile.phone || '',
      whatsappPhone: profile.whatsappPhone || '',
      businessAddress: profile.businessAddress || '',
      bio: profile.bio || '',
      agencyName: profile.agencyName || '',
      agencyType: profile.agencyType || 'Independent Agent',
      agencyWebsite: profile.agencyWebsite || ''
    };
  }

  function populateForm(profile) {
    fieldIds.forEach((id) => {
      const field = $(id);
      const key = fieldMap[id];
      if (field) field.value = profile[key] ?? '';
    });
  }

  function getFormData() {
    const profile = {};
    fieldIds.forEach((id) => {
      profile[fieldMap[id]] = $(id).value.trim();
    });
    return profile;
  }

  function updateProfileSummary(profile) {
    const name = String(profile.fullName || '').trim();
    const email = String(profile.email || '').trim();
    $('summaryName').textContent = name || 'Your Name';
    $('summaryEmail').textContent = email || 'your@email.com';
    const initial = name ? name.charAt(0).toUpperCase() : 'A';
    $('profileAvatar').textContent = initial;
    $('headerAvatar').textContent = initial;
  }

  function isValidPhone(phone) {
    const cleaned = phone.replace(/[\s()-]/g, '');
    return /^\+?\d{7,15}$/.test(cleaned);
  }
  function isValidWebsite(value) {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
      return false;
    }
  }

  async function loadProfile() {
    setSaving(true);
    try {
      const payload = await apiRequest('/auth/profile');
      savedProfile = normalizeProfile(payload.profile || {});
      populateForm(savedProfile);
      updateProfileSummary(savedProfile);
      sessionStorage.setItem(USER_KEY, JSON.stringify({
        ...(JSON.parse(sessionStorage.getItem(USER_KEY) || '{}')),
        ...savedProfile,
        role: 'agent'
      }));
      $('profileStorageStatus').textContent = 'Connected to database';
      $('profileStorageStatus').classList.remove('local-status');
    } catch (error) {
      if (!/session|sign in/i.test(error.message)) showToast(error.message);
    } finally {
      setSaving(false);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const profile = getFormData();

    if (!isValidPhone(profile.phone)) {
      $('agentPhone').setCustomValidity('Enter a valid phone number using 7 to 15 digits.');
      $('agentPhone').reportValidity();
      $('agentPhone').setCustomValidity('');
      return;
    }
    if (!isValidPhone(profile.whatsappPhone)) {
      $('agentWhatsApp').setCustomValidity('Enter a valid WhatsApp number using 7 to 15 digits.');
      $('agentWhatsApp').reportValidity();
      $('agentWhatsApp').setCustomValidity('');
      return;
    }
    if (!isValidWebsite(profile.agencyWebsite)) {
      $('agencyWebsite').setCustomValidity('Enter a valid website link beginning with http:// or https://.');
      $('agencyWebsite').reportValidity();
      $('agencyWebsite').setCustomValidity('');
      return;
    }

    setSaving(true);
    try {
      const payload = await apiRequest('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile)
      });
      savedProfile = normalizeProfile(payload.profile || profile);
      populateForm(savedProfile);
      updateProfileSummary(savedProfile);
      const oldUser = JSON.parse(sessionStorage.getItem(USER_KEY) || '{}');
      sessionStorage.setItem(USER_KEY, JSON.stringify({ ...oldUser, ...savedProfile, role: 'agent' }));
      showToast(payload.message || 'Your profile has been saved successfully.');
    } catch (error) {
      showToast(error.message);
    } finally {
      setSaving(false);
    }
  });

  $('resetProfileBtn').addEventListener('click', () => {
    if (!savedProfile) return;
    populateForm(savedProfile);
    updateProfileSummary(savedProfile);
    showToast('Unsaved changes have been cancelled.');
  });

  $('editProfileBtn').addEventListener('click', () => {
    $('agentFullName').focus();
    $('profileFormSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  ['agentFullName', 'agentEmail'].forEach((id) => {
    $(id).addEventListener('input', () => updateProfileSummary(getFormData()));
  });

  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  const menuToggle = $('menuToggle');

  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
    menuToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  }

  menuToggle.addEventListener('click', () => {
    const open = !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    sidebarOverlay.classList.toggle('show', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });
  sidebarOverlay.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeSidebar();
  });

  loadProfile();
});
