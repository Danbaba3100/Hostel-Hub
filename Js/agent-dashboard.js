'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:4000/api';
  const TOKEN_KEY = 'hostelHubAccessToken';
  const USER_KEY = 'hostelHubUser';
  const $ = (id) => document.getElementById(id);

  const form = $('listingForm');
  const modal = $('listingModal');
  const tableBody = $('listingsTableBody');
  const emptyState = $('listingsEmpty');
  const toast = $('toast');
  let editingId = null;
  let toastTimeout = null;
  let listings = [];
  let inspections = [];
  let currentUser = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function money(amount) {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency', currency: 'NGN', maximumFractionDigits: 0
    }).format(Number(amount) || 0);
  }

  function calculateTotalCost(listing) {
    return Number(listing.price || 0) + Number(listing.cautionFee || 0) +
      Number(listing.agencyFee || 0) + Number(listing.agreementFee || 0) +
      Number(listing.serviceCharge || 0);
  }

  function formatDate(value) {
    if (!value) return 'Date not selected';
    const date = new Date(String(value).slice(0, 10) + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function statusClass(status) {
    return ({
      Published: 'status-published',
      'Pending Approval': 'status-pending-approval',
      Rejected: 'status-rejected',
      Inactive: 'status-inactive'
    })[status] || 'status-inactive';
  }

  async function apiRequest(path, options) {
    const settings = options || {};
    const headers = Object.assign({}, settings.headers || {});
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) headers.Authorization = 'Bearer ' + token;
    if (settings.body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetch(API_BASE + path, Object.assign({}, settings, { headers }));
    } catch (error) {
      throw new Error('Cannot reach the Hostel Hub API. Start the backend at http://localhost:4000 and try again.');
    }

    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace('login.html');
      throw new Error('Your session expired. Please sign in again.');
    }

    if (response.status === 204) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload && payload.error && payload.error.message;
      throw new Error(message || 'The request could not be completed. Please try again.');
    }
    return payload;
  }

  function selectedFacilities() {
    return Array.from(form.querySelectorAll('input[name="facilities"]:checked'))
      .map((checkbox) => checkbox.value);
  }

  function setFieldValue(id, value) {
    const field = $(id);
    if (field) field.value = value == null ? '' : value;
  }

  function renderStats() {
    $('totalListings').textContent = listings.length;
    $('publishedListings').textContent = listings.filter((item) => item.status === 'Published').length;
    $('pendingListings').textContent = listings.filter((item) => item.status === 'Pending Approval').length;
    $('totalInspections').textContent = inspections.length;
    const pending = inspections.filter((item) => ['Pending', 'Confirmed'].includes(item.status)).length;
    const navCount = $('inspectionNavCount');
    if (navCount) navCount.textContent = pending;
    $('inspectionCountLabel').textContent = inspections.length + ' ' + (inspections.length === 1 ? 'request' : 'requests');
  }

  function renderListings() {
    const search = $('listingSearch').value.trim().toLowerCase();
    const statusFilter = $('listingStatusFilter').value;
    const filtered = listings.filter((item) => {
      const name = String(item.name || '').toLowerCase();
      const location = String(item.location || '').toLowerCase();
      return (name.includes(search) || location.includes(search)) &&
        (statusFilter === 'all' || item.status === statusFilter);
    });

    tableBody.innerHTML = filtered.map((listing) => {
      const isInactive = listing.status === 'Inactive';
      const actionLabel = isInactive ? 'Reactivate listing' : 'Deactivate listing';
      const actionIcon = isInactive ? '↻' : '⊘';
      return '<tr>' +
        '<td><div class="hostel-cell"><div class="hostel-thumb">▶</div><div><strong>' +
        escapeHTML(listing.name) + '</strong><small>' + escapeHTML(listing.type || 'Hostel') +
        '</small></div></div></td>' +
        '<td class="price-cell">' + money(listing.price) + '</td>' +
        '<td>' + escapeHTML(listing.location) + '</td>' +
        '<td><span class="status-badge ' + statusClass(listing.status) + '">' +
        escapeHTML(listing.status) + '</span></td><td><div class="action-group">' +
        '<button class="action-btn" type="button" data-action="edit" data-id="' +
        escapeHTML(listing.id) + '" title="Edit listing" aria-label="Edit listing">✎</button>' +
        '<button class="action-btn" type="button" data-action="toggle" data-id="' +
        escapeHTML(listing.id) + '" title="' + actionLabel + '" aria-label="' + actionLabel + '">' +
        actionIcon + '</button><button class="action-btn danger" type="button" data-action="delete" data-id="' +
        escapeHTML(listing.id) + '" title="Delete listing" aria-label="Delete listing">×</button>' +
        '</div></td></tr>';
    }).join('');

    emptyState.hidden = filtered.length > 0;
    $('listingsTableFooter').textContent = 'Showing ' + filtered.length + ' of ' + listings.length + ' listings';
    renderStats();
  }

  function renderInspections() {
    const list = $('inspectionList');
    list.innerHTML = inspections.map((item) => {
      const initial = String(item.studentName || 'S').trim().charAt(0).toUpperCase();
      const status = String(item.status || 'Pending');
      const statusClassName = status === 'Completed' ? 'completed' : (status === 'Cancelled' ? 'cancelled' : '');
      const nextStatus = status === 'Pending' ? 'completed' : 'pending';
      const buttonLabel = status === 'Pending' ? 'Mark completed' : 'Mark pending';
      const phone = String(item.phone || '').replace(/[^d+]/g, '');
      return '<article class="inspection-card"><div class="inspection-main">' +
        '<div class="student-avatar">' + escapeHTML(initial) + '</div><div><h3>' +
        escapeHTML(item.studentName || 'Student') + '</h3><p><strong>Hostel:</strong> ' +
        escapeHTML(item.hostelName || 'Hostel') + '</p><p><strong>Email:</strong> ' +
        escapeHTML(item.email || 'Not provided') + '</p><p><strong>Phone:</strong> ' +
        escapeHTML(item.phone || 'Not provided') + '</p><p><strong>Preferred date:</strong> ' +
        escapeHTML(formatDate(item.preferredDate)) + '</p><p><strong>Preferred time:</strong> ' +
        escapeHTML(item.preferredTime || 'Not specified') + '</p>' +
        (item.message ? '<p><strong>Message:</strong> ' + escapeHTML(item.message) + '</p>' : '') +
        '</div></div><div class="inspection-side"><span class="inspection-status ' +
        statusClassName + '">' + escapeHTML(status) + '</span><button class="btn btn-outline" type="button" ' +
        'data-inspection-action="status" data-status="' + nextStatus + '" data-id="' +
        escapeHTML(item.id) + '">' + buttonLabel + '</button>' +
        (phone ? '<button class="btn btn-primary" type="button" data-inspection-action="whatsapp" data-id="' +
          escapeHTML(item.id) + '">WhatsApp</button>' : '') +
        '</div></article>';
    }).join('');
    $('inspectionsEmpty').hidden = inspections.length > 0;
    renderStats();
  }

  function refreshDashboard() {
    renderListings();
    renderInspections();
    renderStats();
  }

  async function loadDashboardData() {
    const [hostelPayload, inspectionPayload] = await Promise.all([
      apiRequest('/hostels/mine'),
      apiRequest('/inspections/mine')
    ]);
    listings = Array.isArray(hostelPayload.hostels) ? hostelPayload.hostels : [];
    inspections = Array.isArray(inspectionPayload.inspections) ? inspectionPayload.inspections : [];
    refreshDashboard();
  }

  function openModal(listing) {
    const item = listing || null;
    editingId = item ? item.id : null;
    form.reset();
    $('listingModalTitle').textContent = item ? 'Edit Hostel Listing' : 'Add New Hostel';
    $('saveListingBtn').textContent = item ? 'Save Changes for Approval' : 'Submit for Approval';

    if (item) {
      setFieldValue('hostelName', item.name);
      setFieldValue('hostelLocation', item.location);
      setFieldValue('hostelPrice', item.price);
      setFieldValue('hostelCautionFee', item.cautionFee);
      setFieldValue('hostelAgencyFee', item.agencyFee);
      setFieldValue('hostelAgreementFee', item.agreementFee);
      setFieldValue('hostelServiceCharge', item.serviceCharge);
      setFieldValue('hostelType', item.type);
      setFieldValue('hostelRooms', item.rooms);
      setFieldValue('hostelDistance', item.distance);
      setFieldValue('hostelAvailability', item.availability);
      setFieldValue('hostelDescription', item.description);
      setFieldValue('hostelVideoUrl', item.videoUrl);
      form.querySelectorAll('input[name="facilities"]').forEach((checkbox) => {
        checkbox.checked = (item.facilities || []).includes(checkbox.value);
      });
      $('selectedVideo').textContent = item.videoUrl ? 'Saved video URL: ' + item.videoUrl : '';
    } else {
      $('selectedVideo').textContent = '';
    }

    updateTotalCostPreview();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('closeListingModal').focus();
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    form.reset();
    editingId = null;
    $('selectedVideo').textContent = '';
    updateTotalCostPreview();
  }

  function updateTotalCostPreview() {
    const amount = (id) => Math.max(0, Number($(id).value) || 0);
    $('estimatedTotalCost').textContent = money({
      valueOf: () => amount('hostelPrice') + amount('hostelCautionFee') +
        amount('hostelAgencyFee') + amount('hostelAgreementFee') + amount('hostelServiceCharge')
    });
  }

  [
    'hostelPrice', 'hostelCautionFee', 'hostelAgencyFee',
    'hostelAgreementFee', 'hostelServiceCharge'
  ].forEach((id) => $(id).addEventListener('input', updateTotalCostPreview));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const rooms = Number($('hostelRooms').value);
    const price = Number($('hostelPrice').value);
    if (!Number.isInteger(rooms) || rooms < 1 || !Number.isFinite(price) || price < 0) {
      showToast('Enter a valid rent and a whole number of available rooms.');
      return;
    }

    const payload = {
      name: $('hostelName').value.trim(),
      location: $('hostelLocation').value.trim(),
      description: $('hostelDescription').value.trim(),
      priceNgn: price,
      cautionFeeNgn: Number($('hostelCautionFee').value) || 0,
      agencyFeeNgn: Number($('hostelAgencyFee').value) || 0,
      agreementFeeNgn: Number($('hostelAgreementFee').value) || 0,
      serviceChargeNgn: Number($('hostelServiceCharge').value) || 0,
      roomType: $('hostelType').value,
      unitsAvailable: rooms,
      distanceFromCampus: $('hostelDistance').value.trim(),
      availabilityStatus: ({
        'Available': 'available',
        'Limited availability': 'limited',
        'Fully occupied': 'unavailable'
      })[$('hostelAvailability').value] || 'available',
      facilities: selectedFacilities(),
      videoUrl: $('hostelVideoUrl').value.trim()
    };

    const button = $('saveListingBtn');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving…';
    try {
      if (editingId) {
        await apiRequest('/hostels/' + encodeURIComponent(editingId), {
          method: 'PATCH', body: JSON.stringify(payload)
        });
      } else {
        await apiRequest('/hostels', { method: 'POST', body: JSON.stringify(payload) });
      }
      await loadDashboardData();
      closeModal();
      showToast(editingId ? 'Changes saved and sent for admin approval.' : 'Listing submitted for admin approval.');
    } catch (error) {
      showToast(error.message);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  tableBody.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const listing = listings.find((item) => item.id === button.dataset.id);
    if (!listing) return;

    if (button.dataset.action === 'edit') {
      openModal(listing);
      return;
    }

    if (button.dataset.action === 'toggle') {
      const isActive = listing.status === 'Inactive';
      try {
        await apiRequest('/hostels/' + encodeURIComponent(listing.id) + '/availability', {
          method: 'PATCH', body: JSON.stringify({ isActive })
        });
        await loadDashboardData();
        showToast(isActive ? 'Listing reactivated and sent for approval.' : 'Listing deactivated.');
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    if (button.dataset.action === 'delete') {
      if (!window.confirm('Delete "' + listing.name + '"? This removes the listing from your dashboard and public listings.')) return;
      try {
        await apiRequest('/hostels/' + encodeURIComponent(listing.id), { method: 'DELETE' });
        await loadDashboardData();
        showToast('Listing deleted.');
      } catch (error) {
        showToast(error.message);
      }
    }
  });

  $('inspectionList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-inspection-action]');
    if (!button) return;
    const inspection = inspections.find((item) => item.id === button.dataset.id);
    if (!inspection) return;

    if (button.dataset.inspectionAction === 'status') {
      try {
        await apiRequest('/inspections/' + encodeURIComponent(inspection.id) + '/status', {
          method: 'PATCH',
          body: JSON.stringify({ status: button.dataset.status })
        });
        await loadDashboardData();
        showToast('Inspection status updated.');
      } catch (error) {
        showToast(error.message);
      }
      return;
    }

    if (button.dataset.inspectionAction === 'whatsapp') {
      let phone = String(inspection.phone || '').replace(/D/g, '');
      if (phone.startsWith('0')) phone = '234' + phone.slice(1);
      const message = [
        'Hello ' + inspection.studentName + ',',
        'I am contacting you about your inspection request for ' + inspection.hostelName + '.',
        'Preferred date: ' + formatDate(inspection.preferredDate) + '.',
        'Preferred time: ' + (inspection.preferredTime || 'Not specified') + '.',
        'Please let me know if you would like to confirm the inspection.'
      ].join('\n');
      window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(message), '_blank', 'noopener,noreferrer');
    }
  });

  $('listingSearch').addEventListener('input', renderListings);
  $('listingStatusFilter').addEventListener('change', renderListings);
  $('addListingBtn').addEventListener('click', () => openModal());
  $('addListingBtnTop').addEventListener('click', () => openModal());
  $('emptyAddListingBtn').addEventListener('click', () => openModal());
  $('closeListingModal').addEventListener('click', closeModal);
  $('cancelListingBtn').addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  const menuToggle = $('menuToggle');
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('show');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('show');
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  menuToggle.addEventListener('click', () => {
    if (sidebar.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
  sidebarOverlay.addEventListener('click', closeSidebar);
  document.querySelectorAll('.nav-link[data-section]').forEach((link) => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.nav-link[data-section]').forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
      closeSidebar();
    });
  });

  const logout = $('logoutBtn');
  if (logout) {
    logout.addEventListener('click', () => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace('login.html');
    });
  }

  async function startDashboard() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace('login.html');
      return;
    }
    try {
      const response = await apiRequest('/auth/me');
      currentUser = response.user;
      if (!currentUser || currentUser.role !== 'agent') {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        window.location.replace('login.html');
        return;
      }
      const name = currentUser.fullName || 'Agent';
      const welcome = $('agentWelcomeName');
      const avatar = $('agentAvatar');
      if (welcome) welcome.textContent = name;
      if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase();
      await loadDashboardData();
    } catch (error) {
      showToast(error.message);
      listings = [];
      inspections = [];
      refreshDashboard();
    }
  }

  startDashboard();
});
