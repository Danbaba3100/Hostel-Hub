'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = 'http://localhost:4000/api';
  const TOKEN_KEY = 'hostelHubAccessToken';
  const USER_KEY = 'hostelHubUser';
  const $ = (id) => document.getElementById(id);

  const tableBody = $('hostelTableBody');
  const searchInput = $('searchInput');
  const statusFilter = $('statusFilter');
  const locationFilter = $('locationFilter');
  const emptyState = $('emptyState');
  const resultCount = $('resultCount');
  const modal = $('reviewModal');
  const reviewContent = $('reviewContent');
  const reviewNote = $('reviewNote');
  const toast = $('toast');
  const approveButton = $('approveButton');
  const rejectButton = $('rejectButton');
  const totalElement = $('totalCount');
  const approvedElement = $('approvedCount');
  const pendingElement = $('pendingCount');
  const rejectedElement = $('rejectedCount');
  const clearButton = $('clearFilters');
  const emptyClearButton = $('emptyClear');
  const exportButton = $('exportButton');

  let hostels = [];
  let selectedHostelId = null;
  let lastFocusedElement = null;
  let toastTimer;
  let busy = false;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function formatPrice(price) {
    return '₦' + Number(price || 0).toLocaleString('en-NG') + '/year';
  }

  function formatDate(value) {
    if (!value) return 'Date unavailable';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Date unavailable';
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function statusClass(status) {
    if (status === 'Approved') return 'status-approved';
    if (status === 'Removed') return 'status-rejected';
    if (status === 'Under Review') return 'status-under-review';
    return 'status-rejected';
  }

  async function apiRequest(path, options = {}) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace('admin-login.html');
      throw new Error('Please sign in as an administrator.');
    }

    const headers = { Authorization: 'Bearer ' + token, ...(options.headers || {}) };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetch(API_BASE + path, { ...options, headers });
    } catch {
      throw new Error('Cannot reach the Hostel Hub API. Make sure the backend is running on port 4000.');
    }

    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace('admin-login.html');
      throw new Error('Your session expired. Please sign in again.');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = payload && payload.error && payload.error.message;
      throw new Error(message || 'The request could not be completed.');
    }
    return payload;
  }

  function updateStats() {
    if (totalElement) totalElement.textContent = hostels.length;
    if (approvedElement) approvedElement.textContent = hostels.filter((item) => item.status === 'Approved').length;
    if (pendingElement) pendingElement.textContent = hostels.filter((item) => item.status === 'Under Review').length;
    if (rejectedElement) rejectedElement.textContent = hostels.filter((item) => item.status === 'Rejected').length;
  }

  function getFilteredHostels() {
    const query = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;
    const selectedLocation = locationFilter.value.trim().toLowerCase();

    return hostels.filter((hostel) => {
      const searchable = [hostel.name, hostel.location, hostel.agent, hostel.agentEmail].join(' ').toLowerCase();
      const matchesSearch = searchable.includes(query);
      const matchesStatus = selectedStatus === 'all' || hostel.status === selectedStatus;
      const location = String(hostel.location || '').toLowerCase();
      const matchesLocation = selectedLocation === 'all' ||
        location.includes(selectedLocation) || selectedLocation.includes(location);
      return matchesSearch && matchesStatus && matchesLocation;
    });
  }

  function renderTable() {
    const filtered = getFilteredHostels();
    tableBody.replaceChildren();

    filtered.forEach((hostel) => {
      const row = document.createElement('tr');
      const hostelCell = document.createElement('td');
      const hostelInfo = document.createElement('div');
      hostelInfo.className = 'hostel-cell';
      const name = document.createElement('strong');
      name.textContent = hostel.name;
      const date = document.createElement('small');
      date.textContent = 'Submitted ' + formatDate(hostel.submitted);
      hostelInfo.append(name, date);
      hostelCell.appendChild(hostelInfo);

      const locationCell = document.createElement('td');
      locationCell.className = 'location-cell';
      locationCell.textContent = (hostel.location || 'Location unavailable') + ', Osogbo';

      const priceCell = document.createElement('td');
      priceCell.textContent = formatPrice(hostel.price);

      const agentCell = document.createElement('td');
      agentCell.className = 'agent-cell';
      agentCell.textContent = hostel.agent || 'Unknown agent';

      const statusCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'status ' + statusClass(hostel.status);
      badge.textContent = hostel.status;
      statusCell.appendChild(badge);

      const actionsCell = document.createElement('td');
      const actions = document.createElement('div');
      actions.className = 'row-actions';
      const reviewButton = document.createElement('button');
      reviewButton.type = 'button';
      reviewButton.className = 'view-button';
      reviewButton.textContent = 'Review';
      reviewButton.addEventListener('click', () => openReview(hostel.id));
      actions.appendChild(reviewButton);

      if (hostel.status === 'Approved') {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'reject-button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => removeHostel(hostel.id));
        actions.appendChild(removeButton);
      }
      actionsCell.appendChild(actions);

      row.append(hostelCell, locationCell, priceCell, agentCell, statusCell, actionsCell);
      tableBody.appendChild(row);
    });

    if (emptyState) emptyState.hidden = filtered.length > 0;
    if (resultCount) resultCount.textContent = 'Showing ' + filtered.length + ' of ' + hostels.length + ' listings';
    updateStats();
    if (window.lucide) window.lucide.createIcons();
  }

  function openReview(hostelId) {
    const hostel = hostels.find((item) => item.id === hostelId);
    if (!hostel || !modal || !reviewContent) return;
    selectedHostelId = hostelId;
    lastFocusedElement = document.activeElement;
    reviewNote.value = '';
    reviewContent.replaceChildren();

    const details = [
      ['Hostel', hostel.name],
      ['Location', (hostel.location || 'Not provided') + (hostel.address ? ', ' + hostel.address : '')],
      ['Annual Price', formatPrice(hostel.price)],
      ['Agent', hostel.agent || 'Unknown agent'],
      ['Agent email', hostel.agentEmail || 'Not provided'],
      ['Agent phone', hostel.agentPhone || 'Not provided'],
      ['Room type', hostel.type || 'Not provided'],
      ['Available units', hostel.rooms == null ? 'Not provided' : String(hostel.rooms)],
      ['Submitted', formatDate(hostel.submitted)],
      ['Current status', hostel.status],
      ['Description', hostel.description || 'No description provided'],
      ['Video URL', hostel.videoUrl || 'No video URL provided']
    ];

    details.forEach(([labelText, valueText]) => {
      const row = document.createElement('div');
      row.className = 'review-row';
      const label = document.createElement('span');
      label.textContent = labelText;
      const value = document.createElement('strong');
      value.textContent = valueText;
      row.append(label, value);
      reviewContent.appendChild(row);
    });

    const canReview = hostel.status === 'Under Review' && !busy;
    approveButton.disabled = !canReview;
    rejectButton.disabled = !canReview;
    modal.hidden = false;
    $('modalTitle').textContent = hostel.name;
    $('closeModal').focus();
  }

  function closeReview() {
    if (modal) modal.hidden = true;
    selectedHostelId = null;
    if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
  }

  async function decideListing(status) {
    if (!selectedHostelId || busy) return;
    const hostel = hostels.find((item) => item.id === selectedHostelId);
    if (!hostel || hostel.status !== 'Under Review') {
      showToast('Only listings under review can be decided.');
      return;
    }

    const verb = status === 'approved' ? 'approve' : 'reject';
    if (!window.confirm('Are you sure you want to ' + verb + ' "' + hostel.name + '"?')) return;

    busy = true;
    approveButton.disabled = true;
    rejectButton.disabled = true;
    try {
      const payload = await apiRequest('/admin/hostels/' + encodeURIComponent(hostel.id) + '/review', {
        method: 'PATCH',
        body: JSON.stringify({ status, note: reviewNote.value.trim() })
      });
      closeReview();
      await loadHostels();
      showToast(payload.message || (hostel.name + ' review decision saved.'));
    } catch (error) {
      showToast(error.message);
    } finally {
      busy = false;
      if (modal && !modal.hidden && selectedHostelId) {
        const current = hostels.find((item) => item.id === selectedHostelId);
        const canReview = current && current.status === 'Under Review';
        approveButton.disabled = !canReview;
        rejectButton.disabled = !canReview;
      }
    }
  }


  async function removeHostel(hostelId) {
    if (busy) return;
    const hostel = hostels.find((item) => item.id === hostelId);
    if (!hostel || hostel.status !== 'Approved') {
      showToast('Only approved listings can be removed this way.');
      return;
    }

    const confirmed = window.confirm(
      'Remove "' + hostel.name + '" from public listings? Students will no longer see it. Its record and inspection history will be preserved.'
    );
    if (!confirmed) return;

    busy = true;
    try {
      const payload = await apiRequest('/admin/hostels/' + encodeURIComponent(hostel.id), {
        method: 'DELETE'
      });
      await loadHostels();
      showToast(payload.message || (hostel.name + ' removed from public listings.'));
    } catch (error) {
      showToast(error.message);
    } finally {
      busy = false;
    }
  }

  async function loadHostels() {
    const payload = await apiRequest('/admin/hostels');
    hostels = Array.isArray(payload.hostels) ? payload.hostels : [];
    renderTable();
  }

  function clearFilters() {
    searchInput.value = '';
    statusFilter.value = 'all';
    locationFilter.value = 'all';
    renderTable();
  }

  function exportCSV() {
    const filtered = getFilteredHostels();
    if (!filtered.length) {
      showToast('No listings available to export.');
      return;
    }
    const columns = ['Hostel', 'Location', 'Annual Price (NGN)', 'Agent', 'Agent Email', 'Status', 'Submission Date'];
    const escapeCSV = (value) => {
      let text = String(value == null ? '' : value);
      if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const rows = filtered.map((item) => [item.name, item.location, item.price, item.agent, item.agentEmail, item.status, item.submitted]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCSV).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hostel-hub-listings.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Listings exported successfully.');
  }

  $('closeModal').addEventListener('click', closeReview);
  $('cancelReview').addEventListener('click', closeReview);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeReview(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal && !modal.hidden) closeReview(); });
  approveButton.addEventListener('click', () => decideListing('approved'));
  rejectButton.addEventListener('click', () => decideListing('rejected'));
  clearButton.addEventListener('click', clearFilters);
  emptyClearButton.addEventListener('click', clearFilters);
  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);
  locationFilter.addEventListener('change', renderTable);
  exportButton.addEventListener('click', exportCSV);

  const sidebar = $('sidebar');
  const sidebarOverlay = $('sidebarOverlay');
  const menuToggle = $('menuToggle');
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('show');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  }
  if (menuToggle && sidebar && sidebarOverlay) {
    menuToggle.addEventListener('click', () => {
      const open = sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('show', open);
      menuToggle.setAttribute('aria-expanded', String(open));
    });
    sidebarOverlay.addEventListener('click', closeSidebar);
  }

  const panel = document.querySelector('.topbar-right');
  if (panel) {
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'secondary-button';
    logout.textContent = 'Sign out';
    logout.addEventListener('click', () => {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      window.location.replace('admin-login.html');
    });
    panel.appendChild(logout);
  }

  async function start() {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      window.location.replace('admin-login.html');
      return;
    }
    try {
      const me = await apiRequest('/auth/me');
      if (!me.user || me.user.role !== 'admin') {
        sessionStorage.removeItem(TOKEN_KEY);
        sessionStorage.removeItem(USER_KEY);
        showToast('Administrator access is required.');
        window.setTimeout(() => window.location.replace('admin-login.html'), 800);
        return;
      }
      const adminName = document.querySelector('.topbar-right strong');
      if (adminName) adminName.textContent = me.user.fullName || 'Admin';
      await loadHostels();
    } catch (error) {
      showToast(error.message);
      hostels = [];
      renderTable();
    }
  }

  start();
});
